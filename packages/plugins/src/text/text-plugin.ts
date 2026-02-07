import { rgb, PDFName, PDFString, PDFArray, PDFRef } from 'pdf-lib';
import { parseColor } from '@jsonpdf/core';
import type { RichContent, StyledRun, Style, ValidationError, JSONSchema } from '@jsonpdf/core';
import type { Plugin, MeasureContext, RenderContext } from '../types.js';
import { getFont, getLineHeight } from '../utils.js';
import { wrapText, measureTextWidth, type WrapOptions } from './word-wrap.js';

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
  const wrapOpts: WrapOptions = { widows: style.widows, orphans: style.orphans };
  const result = wrapText(text, font, fontSize, ctx.availableWidth, lh, wrapOpts);
  return { width: ctx.availableWidth, height: result.height };
}

function renderPlainText(text: string, ctx: RenderContext): void {
  const style = ctx.elementStyle;
  const font = getFont(ctx.fonts, style);
  const fontSize = style.fontSize ?? 12;
  const lh = getLineHeight(style);
  const color = parseColor(style.color ?? '#000000');
  const wrapOpts: WrapOptions = { widows: style.widows, orphans: style.orphans };

  const wrapped = wrapText(text, font, fontSize, ctx.width, lh, wrapOpts);
  const ascent = font.heightAtSize(fontSize, { descender: false });

  for (let i = 0; i < wrapped.lines.length; i++) {
    const line = wrapped.lines[i];
    if (line === '') continue;

    const lineY = ctx.y - i * lh - ascent;
    let lineX = ctx.x;

    // Text alignment
    if (style.textAlign === 'center' || style.textAlign === 'right') {
      const lineWidth = measureTextWidth(line, font, fontSize);
      if (style.textAlign === 'center') {
        lineX = ctx.x + (ctx.width - lineWidth) / 2;
      } else {
        lineX = ctx.x + ctx.width - lineWidth;
      }
    }

    ctx.page.drawText(line, {
      x: lineX,
      y: lineY,
      font,
      size: fontSize,
      color: rgb(color.r, color.g, color.b),
    });
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

      const segWidth = font.widthOfTextAtSize(segment, fontSize);
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

/** Add a URI link annotation covering a rectangular area on the page. */
function addLinkAnnotation(
  ctx: RenderContext,
  x: number,
  y: number,
  width: number,
  height: number,
  uri: string,
): void {
  const context = ctx.pdfDoc.context;

  const actionDict = context.obj({
    S: 'URI',
    URI: PDFString.of(uri),
  });

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

function renderRichText(runs: StyledRun[], ctx: RenderContext): void {
  let currentX = ctx.x;
  let currentY = ctx.y;
  let currentLineHeight = 0;
  let lineStarted = false;

  for (const run of runs) {
    const style = resolveRunStyle(run, ctx);
    const font = getFont(ctx.fonts, style);
    const fontSize = style.fontSize ?? 12;
    const lh = getLineHeight(style);
    const color = parseColor(style.color ?? '#000000');
    const ascent = font.heightAtSize(fontSize, { descender: false });
    currentLineHeight = Math.max(currentLineHeight, lh);

    const words = run.text.split(/(\s+|\n)/);

    for (const segment of words) {
      if (segment === '\n') {
        currentY -= currentLineHeight;
        currentX = ctx.x;
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

      const segWidth = font.widthOfTextAtSize(segment, fontSize);
      if (currentX - ctx.x + segWidth > ctx.width && lineStarted) {
        currentY -= currentLineHeight;
        currentX = ctx.x;
        currentLineHeight = lh;
      }

      ctx.page.drawText(segment, {
        x: currentX,
        y: currentY - ascent,
        font,
        size: fontSize,
        color: rgb(color.r, color.g, color.b),
      });

      // Add link annotation if the run has a link
      if (run.link) {
        addLinkAnnotation(ctx, currentX, currentY - lh, segWidth, lh, run.link);
      }

      currentX += segWidth;
      lineStarted = true;
    }
  }
}
