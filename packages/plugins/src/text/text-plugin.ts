import {
  rgb,
  PDFName,
  PDFString,
  PDFArray,
  PDFRef,
  pushGraphicsState,
  popGraphicsState,
  setWordSpacing,
  setCharacterSpacing,
} from 'pdf-lib';
import type { PDFFont } from 'pdf-lib';
import { parseColor } from '@jsonpdf/core';
import type { RichContent, StyledRun, Style, ValidationError, JSONSchema } from '@jsonpdf/core';
import type { Plugin, MeasureContext, RenderContext } from '../types.js';
import { getFont, getLineHeight } from '../utils.js';
import { wrapText, measureTextWidth, type WrapOptions } from './word-wrap.js';
import { drawTextDecoration } from './text-decoration.js';

export interface TextProps {
  content: RichContent;
  autoHeight?: boolean;
}

export const textPropsSchema: JSONSchema = {
  type: 'object',
  required: ['content'],
  properties: {
    content: {
      oneOf: [
        { type: 'string' },
        {
          type: 'array',
          items: {
            type: 'object',
            required: ['text'],
            properties: {
              text: { type: 'string' },
              style: { type: 'string' },
              styleOverrides: { type: 'object' },
              link: { type: 'string' },
            },
          },
        },
      ],
    },
    autoHeight: { type: 'boolean' },
  },
};

const TEXT_DEFAULTS: TextProps = { content: '' };

export const textPlugin: Plugin<TextProps> = {
  type: 'text',
  propsSchema: textPropsSchema,
  defaultProps: TEXT_DEFAULTS,

  resolveProps(raw: Record<string, unknown>): TextProps {
    return { ...TEXT_DEFAULTS, ...raw } as TextProps;
  },

  validate(props: TextProps): ValidationError[] {
    const errors: ValidationError[] = [];
    if (typeof props.content !== 'string' && !Array.isArray(props.content)) {
      errors.push({ path: '/content', message: 'content must be a string or StyledRun[]' });
    }
    return errors;
  },

  measure(props: TextProps, ctx: MeasureContext): Promise<{ width: number; height: number }> {
    if (typeof props.content === 'string') {
      return Promise.resolve(measurePlainText(props.content, ctx));
    }
    return Promise.resolve(measureRichText(props.content, ctx));
  },

  render(props: TextProps, ctx: RenderContext): Promise<void> {
    if (typeof props.content === 'string') {
      renderPlainText(props.content, ctx);
    } else {
      renderRichText(props.content, ctx);
    }
    return Promise.resolve();
  },
};

// ---- Plain text ----

function measurePlainText(text: string, ctx: MeasureContext): { width: number; height: number } {
  const style = ctx.elementStyle;
  const font = getFont(ctx.fonts, style);
  const fontSize = style.fontSize ?? 12;
  const lh = getLineHeight(style);
  const ls = style.letterSpacing ?? 0;
  const wrapOpts: WrapOptions = { widows: style.widows, orphans: style.orphans };
  const result = wrapText(text, font, fontSize, ctx.availableWidth, lh, wrapOpts, ls || undefined);
  return { width: ctx.availableWidth, height: result.height };
}

function renderPlainText(text: string, ctx: RenderContext): void {
  const style = ctx.elementStyle;
  const font = getFont(ctx.fonts, style);
  const fontSize = style.fontSize ?? 12;
  const lh = getLineHeight(style);
  const color = parseColor(style.color ?? '#000000');
  const ls = style.letterSpacing ?? 0;
  const decoration = style.textDecoration;
  const wrapOpts: WrapOptions = { widows: style.widows, orphans: style.orphans };

  const wrapped = wrapText(text, font, fontSize, ctx.width, lh, wrapOpts, ls || undefined);
  const ascent = font.heightAtSize(fontSize, { descender: false });

  for (let i = 0; i < wrapped.lines.length; i++) {
    const line = wrapped.lines[i];
    if (line === '') continue;

    const lineY = ctx.y - i * lh - ascent;
    let lineX = ctx.x;
    let extraWordSpacing = 0;

    // Text alignment
    if (style.textAlign === 'justify') {
      // Justify: distribute extra space between words, except on last line of paragraph
      if (!wrapped.isLastInParagraph[i] && wrapped.wordsPerLine[i] > 1) {
        const naturalWidth = measureTextWidth(line, font, fontSize, ls || undefined);
        const totalExtraSpace = ctx.width - naturalWidth;
        extraWordSpacing = totalExtraSpace / (wrapped.wordsPerLine[i] - 1);
      }
      // Last paragraph line or single-word line: left-align
    } else if (style.textAlign === 'center' || style.textAlign === 'right') {
      const lineWidth = measureTextWidth(line, font, fontSize, ls || undefined);
      if (style.textAlign === 'center') {
        lineX = ctx.x + (ctx.width - lineWidth) / 2;
      } else {
        lineX = ctx.x + ctx.width - lineWidth;
      }
    }

    // Determine if we need graphics state operators
    const needsCharSpacing = ls !== 0;
    const needsWordSpacing = extraWordSpacing > 0;

    if (needsCharSpacing || needsWordSpacing) {
      const ops = [pushGraphicsState()];
      if (needsCharSpacing) ops.push(setCharacterSpacing(ls));
      if (needsWordSpacing) ops.push(setWordSpacing(extraWordSpacing));
      ctx.page.pushOperators(...ops);
    }

    ctx.page.drawText(line, {
      x: lineX,
      y: lineY,
      font,
      size: fontSize,
      color: rgb(color.r, color.g, color.b),
      opacity: ctx.opacity,
    });

    if (needsCharSpacing || needsWordSpacing) {
      ctx.page.pushOperators(popGraphicsState());
    }

    // Text decoration — for justified lines, span the full content width
    if (decoration && decoration !== 'none') {
      const lineWidth =
        extraWordSpacing > 0 ? ctx.width : measureTextWidth(line, font, fontSize, ls || undefined);
      drawTextDecoration(
        ctx.page,
        decoration,
        lineX,
        lineY,
        lineWidth,
        font,
        fontSize,
        color,
        ctx.opacity,
      );
    }
  }
}

// ---- Rich text (StyledRun[]) ----

function resolveRunStyle(run: StyledRun, ctx: MeasureContext): Style {
  const base = ctx.elementStyle;
  const named = run.style ? ctx.resolveStyle(run.style) : {};
  return { ...base, ...named, ...(run.styleOverrides ?? {}) };
}

function measureRichText(
  runs: StyledRun[],
  ctx: MeasureContext,
): { width: number; height: number } {
  let totalHeight = 0;
  let currentLineHeight = 0;
  let currentX = 0;
  let lineStarted = false;

  for (const run of runs) {
    const style = resolveRunStyle(run, ctx);
    const font = getFont(ctx.fonts, style);
    const fontSize = style.fontSize ?? 12;
    const lh = getLineHeight(style);
    const ls = style.letterSpacing ?? 0;
    currentLineHeight = Math.max(currentLineHeight, lh);

    const words = run.text.split(/(\s+|\n)/);

    for (const segment of words) {
      if (segment === '\n') {
        totalHeight += currentLineHeight;
        currentX = 0;
        currentLineHeight = lh;
        lineStarted = false;
        continue;
      }

      if (/^\s+$/.test(segment)) {
        if (lineStarted) {
          currentX += font.widthOfTextAtSize(' ', fontSize);
        }
        continue;
      }

      const segWidth = measureTextWidth(segment, font, fontSize, ls || undefined);
      if (currentX + segWidth > ctx.availableWidth && lineStarted) {
        totalHeight += currentLineHeight;
        currentX = 0;
        currentLineHeight = lh;
      }
      currentX += segWidth;
      lineStarted = true;
    }
  }

  // Account for the last line
  if (lineStarted || totalHeight === 0) {
    totalHeight += currentLineHeight || getLineHeight(ctx.elementStyle);
  }

  return { width: ctx.availableWidth, height: totalHeight };
}

/** A single word/segment in a rich text line accumulation. */
interface RichWord {
  text: string;
  font: PDFFont;
  fontSize: number;
  color: { r: number; g: number; b: number };
  ascent: number;
  lh: number;
  width: number;
  letterSpacing: number;
  decoration?: string;
  link?: string;
  opacity?: number;
}

/** An accumulated visual line of rich text words. */
interface RichLine {
  words: RichWord[];
  totalTextWidth: number;
  totalSpaceWidth: number;
  maxLineHeight: number;
  spaceCount: number;
  isLastInParagraph: boolean;
}

/** Add a link annotation covering a rectangular area on the page.
 *  Links starting with "#" are internal GoTo links targeting an anchor's page.
 *  All other links are external URI actions. */
function addLinkAnnotation(
  ctx: RenderContext,
  x: number,
  y: number,
  width: number,
  height: number,
  uri: string,
): void {
  const context = ctx.pdfDoc.context;

  let actionDict;
  if (uri.startsWith('#') && ctx.anchorPageMap) {
    const anchorId = uri.slice(1);
    const targetPage = ctx.anchorPageMap.get(anchorId);
    if (!targetPage) return; // anchor not found, skip link
    actionDict = context.obj({
      S: 'GoTo',
      D: [targetPage.ref, PDFName.of('Fit')],
    });
  } else {
    actionDict = context.obj({
      S: 'URI',
      URI: PDFString.of(uri),
    });
  }

  const annotDict = context.obj({
    Type: 'Annot',
    Subtype: 'Link',
    Rect: [x, y, x + width, y + height],
    Border: [0, 0, 0],
    A: actionDict,
  });

  const annotRef = context.register(annotDict);

  // Get or create the Annots array on the page
  const annotsKey = PDFName.of('Annots');
  const existing = ctx.page.node.get(annotsKey);

  if (existing instanceof PDFArray) {
    existing.push(annotRef);
  } else if (existing instanceof PDFRef) {
    const resolved = context.lookup(existing);
    if (resolved instanceof PDFArray) {
      resolved.push(annotRef);
    }
  } else {
    ctx.page.node.set(annotsKey, context.obj([annotRef]));
  }
}

/**
 * Accumulate rich text runs into visual lines for rendering.
 * This enables justify alignment by having complete line info before drawing.
 */
function accumulateRichLines(runs: StyledRun[], ctx: RenderContext): RichLine[] {
  const lines: RichLine[] = [];
  let currentLine: RichLine = {
    words: [],
    totalTextWidth: 0,
    totalSpaceWidth: 0,
    maxLineHeight: 0,
    spaceCount: 0,
    isLastInParagraph: false,
  };

  for (const run of runs) {
    const style = resolveRunStyle(run, ctx);
    const font = getFont(ctx.fonts, style);
    const fontSize = style.fontSize ?? 12;
    const lh = getLineHeight(style);
    const color = parseColor(style.color ?? '#000000');
    const ascent = font.heightAtSize(fontSize, { descender: false });
    const ls = style.letterSpacing ?? 0;
    const spaceWidth = font.widthOfTextAtSize(' ', fontSize);

    const segments = run.text.split(/(\s+|\n)/);

    for (const segment of segments) {
      if (segment === '\n') {
        // Explicit newline — finalize current line as last-in-paragraph
        currentLine.isLastInParagraph = true;
        if (currentLine.words.length > 0 || lines.length === 0) {
          lines.push(currentLine);
        }
        currentLine = {
          words: [],
          totalTextWidth: 0,
          totalSpaceWidth: 0,
          maxLineHeight: 0,
          spaceCount: 0,
          isLastInParagraph: false,
        };
        continue;
      }

      if (/^\s+$/.test(segment)) {
        if (currentLine.words.length > 0) {
          currentLine.totalSpaceWidth += spaceWidth;
          currentLine.spaceCount++;
        }
        continue;
      }

      const segWidth = measureTextWidth(segment, font, fontSize, ls || undefined);
      const lineWidthWithWord = currentLine.totalTextWidth + currentLine.totalSpaceWidth + segWidth;

      if (lineWidthWithWord > ctx.width && currentLine.words.length > 0) {
        // Overflow — push current line, start new one
        lines.push(currentLine);
        currentLine = {
          words: [],
          totalTextWidth: 0,
          totalSpaceWidth: 0,
          maxLineHeight: 0,
          spaceCount: 0,
          isLastInParagraph: false,
        };
      }

      currentLine.words.push({
        text: segment,
        font,
        fontSize,
        color,
        ascent,
        lh,
        width: segWidth,
        letterSpacing: ls,
        decoration: style.textDecoration,
        link: run.link,
        opacity: ctx.opacity,
      });
      currentLine.totalTextWidth += segWidth;
      currentLine.maxLineHeight = Math.max(currentLine.maxLineHeight, lh);
    }
  }

  // Push the last line (always last in paragraph)
  if (currentLine.words.length > 0) {
    currentLine.isLastInParagraph = true;
    lines.push(currentLine);
  }

  return lines;
}

function renderRichText(runs: StyledRun[], ctx: RenderContext): void {
  const textAlign = ctx.elementStyle.textAlign;
  const richLines = accumulateRichLines(runs, ctx);
  let currentY = ctx.y;

  for (let lineIdx = 0; lineIdx < richLines.length; lineIdx++) {
    const line = richLines[lineIdx];
    if (line.words.length === 0) {
      currentY -= line.maxLineHeight || getLineHeight(ctx.elementStyle);
      continue;
    }

    const naturalWidth = line.totalTextWidth + line.totalSpaceWidth;
    let currentX = ctx.x;
    let extraWordGap = 0;

    if (
      textAlign === 'justify' &&
      !line.isLastInParagraph &&
      line.words.length > 1 &&
      line.spaceCount > 0
    ) {
      const extraSpace = ctx.width - naturalWidth;
      extraWordGap = extraSpace / line.spaceCount;
    } else if (textAlign === 'center') {
      currentX = ctx.x + (ctx.width - naturalWidth) / 2;
    } else if (textAlign === 'right') {
      currentX = ctx.x + ctx.width - naturalWidth;
    }

    // Track decoration spans to draw continuous lines across word gaps
    interface DecorationSpan {
      decoration: string;
      startX: number;
      endX: number;
      font: PDFFont;
      fontSize: number;
      color: { r: number; g: number; b: number };
      drawY: number;
      opacity?: number;
    }
    let activeSpan: DecorationSpan | null = null;
    const decorationSpans: DecorationSpan[] = [];

    // Render each word in the line
    for (let wIdx = 0; wIdx < line.words.length; wIdx++) {
      const word = line.words[wIdx];
      const drawY = currentY - word.ascent;

      // Set character spacing if needed
      const needsCharSpacing = word.letterSpacing !== 0;
      if (needsCharSpacing) {
        ctx.page.pushOperators(pushGraphicsState(), setCharacterSpacing(word.letterSpacing));
      }

      ctx.page.drawText(word.text, {
        x: currentX,
        y: drawY,
        font: word.font,
        size: word.fontSize,
        color: rgb(word.color.r, word.color.g, word.color.b),
        opacity: word.opacity,
      });

      if (needsCharSpacing) {
        ctx.page.pushOperators(popGraphicsState());
      }

      // Accumulate decoration spans — extend or start new
      const wordDecoration = word.decoration && word.decoration !== 'none' ? word.decoration : null;
      if (wordDecoration) {
        if (activeSpan && activeSpan.decoration === wordDecoration) {
          // Extend the current span through the space gap to this word's end
          activeSpan.endX = currentX + word.width;
        } else {
          // Finalize previous span and start new one
          if (activeSpan) decorationSpans.push(activeSpan);
          activeSpan = {
            decoration: wordDecoration,
            startX: currentX,
            endX: currentX + word.width,
            font: word.font,
            fontSize: word.fontSize,
            color: word.color,
            drawY,
            opacity: word.opacity,
          };
        }
      } else {
        // No decoration — finalize any active span
        if (activeSpan) {
          decorationSpans.push(activeSpan);
          activeSpan = null;
        }
      }

      // Link annotation
      if (word.link) {
        addLinkAnnotation(
          ctx,
          currentX,
          currentY - line.maxLineHeight,
          word.width,
          line.maxLineHeight,
          word.link,
        );
      }

      currentX += word.width;

      // Add space after this word (with justify gap if applicable)
      // Use current word's font for space width to match measurement in accumulateRichLines
      if (wIdx < line.words.length - 1) {
        const baseSpace = word.font.widthOfTextAtSize(' ', word.fontSize);
        currentX += baseSpace + extraWordGap;
      }
    }

    // Finalize last span
    if (activeSpan) decorationSpans.push(activeSpan);

    // Draw all decoration spans as continuous lines
    for (const span of decorationSpans) {
      drawTextDecoration(
        ctx.page,
        span.decoration,
        span.startX,
        span.drawY,
        span.endX - span.startX,
        span.font,
        span.fontSize,
        span.color,
        span.opacity,
      );
    }

    currentY -= line.maxLineHeight;
  }
}
