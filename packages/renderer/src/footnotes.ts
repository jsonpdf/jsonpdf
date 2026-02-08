import type { PDFPage } from 'pdf-lib';
import { rgb } from 'pdf-lib';
import type { RichContent, Style } from '@jsonpdf/core';
import { parseColor } from '@jsonpdf/core';
import type { FontMap } from '@jsonpdf/plugins';
import { getFont, getLineHeight } from '@jsonpdf/plugins';

/** A single footnote entry collected during rendering. */
export interface FootnoteEntry {
  /** 1-based footnote number. */
  number: number;
  /** The footnote content (string or StyledRun[]). */
  content: RichContent;
}

/** Accumulated footnotes for a single page. */
export interface PageFootnotes {
  entries: FootnoteEntry[];
  /** Total height consumed by footnotes + separator line. */
  totalHeight: number;
}

const SEPARATOR_WIDTH_FRACTION = 1 / 3;
const SEPARATOR_THICKNESS = 0.5;
const SEPARATOR_GAP = 4; // gap above and below separator
const FOOTNOTE_FONT_SIZE_RATIO = 0.8; // footnote text is 80% of base font size

/**
 * Measure the total height of a set of footnotes.
 * Includes separator line height + gap + content lines.
 */
export function measureFootnoteHeight(entries: FootnoteEntry[], baseStyle: Style): number {
  if (entries.length === 0) return 0;

  const fontSize = (baseStyle.fontSize ?? 12) * FOOTNOTE_FONT_SIZE_RATIO;
  const style: Style = { ...baseStyle, fontSize };
  const lh = getLineHeight(style);

  // Separator line + gaps
  let height = SEPARATOR_GAP + SEPARATOR_THICKNESS + SEPARATOR_GAP;

  // Each footnote is one line of text (simplified — no wrapping for now)
  height += entries.length * lh;

  return height;
}

/**
 * Render footnotes at the bottom of a page.
 *
 * @param page - The pdf-lib page
 * @param entries - Footnote entries to render
 * @param x - Left edge of the footnote area (left margin)
 * @param y - Top of the footnote area in pdf-lib coordinates
 * @param width - Available width for footnotes
 * @param baseStyle - Base style for footnote text
 * @param fonts - Font map
 */
export function renderFootnotes(
  page: PDFPage,
  entries: FootnoteEntry[],
  x: number,
  y: number,
  width: number,
  baseStyle: Style,
  fonts: FontMap,
): void {
  if (entries.length === 0) return;

  const fontSize = (baseStyle.fontSize ?? 12) * FOOTNOTE_FONT_SIZE_RATIO;
  const style: Style = { ...baseStyle, fontSize };
  const font = getFont(fonts, style);
  const lh = getLineHeight(style);
  const colorStr = style.color ?? '#000000';
  const color = parseColor(colorStr);

  let cursorY = y;

  // Draw separator line (1/3 of page width)
  cursorY -= SEPARATOR_GAP;
  const lineWidth = width * SEPARATOR_WIDTH_FRACTION;
  page.drawLine({
    start: { x, y: cursorY },
    end: { x: x + lineWidth, y: cursorY },
    thickness: SEPARATOR_THICKNESS,
    color: rgb(color.r, color.g, color.b),
  });
  cursorY -= SEPARATOR_THICKNESS + SEPARATOR_GAP;

  // Render each footnote
  for (const entry of entries) {
    const text = getFootnoteText(entry);
    const ascent = font.heightAtSize(fontSize, { descender: false });
    const drawY = cursorY - ascent;

    // Draw superscript number
    const superFontSize = fontSize * 0.65;
    const superAscent = font.heightAtSize(superFontSize, { descender: false });
    const superRaise = ascent * 0.35;
    const numText = String(entry.number);
    const numWidth = font.widthOfTextAtSize(numText, superFontSize);

    page.drawText(numText, {
      x,
      y: drawY + superRaise + (ascent - superAscent),
      font,
      size: superFontSize,
      color: rgb(color.r, color.g, color.b),
    });

    // Draw footnote content text (with indent for the number)
    const indent = numWidth + 3;
    page.drawText(text, {
      x: x + indent,
      y: drawY,
      font,
      size: fontSize,
      color: rgb(color.r, color.g, color.b),
    });

    cursorY -= lh;
  }
}

/** Extract plain text from footnote content (string or StyledRun[]). */
function getFootnoteText(entry: FootnoteEntry): string {
  if (typeof entry.content === 'string') return entry.content;
  return entry.content.map((run) => run.text).join('');
}
