export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Parse a hex color string to RGB values in the 0–1 range.
 * Supports #RGB and #RRGGBB formats.
 */
export function parseColor(hex: string): RGB {
  if (!hex.startsWith('#')) {
    throw new Error(`Invalid color format: "${hex}" (must start with #)`);
  }

  const raw = hex.slice(1);

  if (raw.length === 3) {
    const c0 = raw[0];
    const c1 = raw[1];
    const c2 = raw[2];
    const r = parseInt(c0 + c0, 16);
    const g = parseInt(c1 + c1, 16);
    const b = parseInt(c2 + c2, 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      throw new Error(`Invalid color format: "${hex}"`);
    }
    return { r: r / 255, g: g / 255, b: b / 255 };
  }

  if (raw.length === 6) {
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      throw new Error(`Invalid color format: "${hex}"`);
    }
    return { r: r / 255, g: g / 255, b: b / 255 };
  }

  throw new Error(`Invalid color format: "${hex}" (must be #RGB or #RRGGBB)`);
}

/** Clamp a value to the 0–1 range. */
function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Convert RGB (0–1 range) to a #RRGGBB hex string. Values are clamped to 0–1. */
export function toHex(rgb: RGB): string {
  const r = Math.round(clamp01(rgb.r) * 255)
    .toString(16)
    .padStart(2, '0');
  const g = Math.round(clamp01(rgb.g) * 255)
    .toString(16)
    .padStart(2, '0');
  const b = Math.round(clamp01(rgb.b) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${r}${g}${b}`;
}
