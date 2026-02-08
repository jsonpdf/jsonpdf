import { rgb } from 'pdf-lib';
import type { PDFFont, PDFPage } from 'pdf-lib';

interface DecorationColor {
  r: number;
  g: number;
  b: number;
}

/**
 * Draw text decoration lines (underline, line-through) for a rendered text segment.
 *
 * @param page - The pdf-lib page to draw on
 * @param decoration - The textDecoration value ('underline', 'line-through', 'underline line-through')
 * @param x - Left edge X position
 * @param baselineY - Y position of the text baseline (in pdf-lib coordinates)
 * @param width - Width of the text segment
 * @param font - The PDFFont used for the text
 * @param fontSize - Font size in points
 * @param color - Text color as {r, g, b} (0-1 range)
 * @param opacity - Optional opacity (0-1)
 */
export function drawTextDecoration(
  page: PDFPage,
  decoration: string,
  x: number,
  baselineY: number,
  width: number,
  font: PDFFont,
  fontSize: number,
  color: DecorationColor,
  opacity?: number,
): void {
  if (!decoration || decoration === 'none') return;

  const thickness = Math.max(fontSize / 18, 0.5);
  const ascent = font.heightAtSize(fontSize, { descender: false });
  const descent = font.heightAtSize(fontSize) - ascent;
  const pdfColor = rgb(color.r, color.g, color.b);

  if (decoration.includes('underline')) {
    const underlineY = baselineY - descent * 0.3;
    page.drawLine({
      start: { x, y: underlineY },
      end: { x: x + width, y: underlineY },
      thickness,
      color: pdfColor,
      opacity,
    });
  }

  if (decoration.includes('line-through')) {
    const strikeY = baselineY + ascent * 0.35;
    page.drawLine({
      start: { x, y: strikeY },
      end: { x: x + width, y: strikeY },
      thickness,
      color: pdfColor,
      opacity,
    });
  }
}
