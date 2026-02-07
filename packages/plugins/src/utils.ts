import type { PDFFont } from 'pdf-lib';
import type { Style } from '@jsonpdf/core';
import type { FontMap } from './types.js';
import { fontKey } from './types.js';

/** Resolve a font from the FontMap based on style properties. Falls back to first available font. */
export function getFont(fonts: FontMap, style: Style): PDFFont {
  const key = fontKey(
    style.fontFamily ?? 'Helvetica',
    style.fontWeight ?? 'normal',
    style.fontStyle ?? 'normal',
  );
  const found = fonts.get(key);
  if (found) return found;
  // Fallback to first available font. FontMap always has at least the default Helvetica.
  for (const font of fonts.values()) {
    return font;
  }
  throw new Error('No fonts available in FontMap');
}

/** Compute line height from style properties. */
export function getLineHeight(style: Style): number {
  return (style.fontSize ?? 12) * (style.lineHeight ?? 1.2);
}
