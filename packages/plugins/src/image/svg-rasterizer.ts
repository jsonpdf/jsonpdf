import { Resvg } from '#platform/svg-rasterizer';

/** Default scale factor for SVG rasterization (2x for HiDPI). */
export const DEFAULT_SVG_SCALE = 2;

/**
 * Check if raw bytes look like SVG content.
 * Examines the first 1024 bytes (after BOM/whitespace) for `<svg` or `<?xml`.
 */
export function isSvgBytes(bytes: Uint8Array): boolean {
  if (bytes.length === 0) return false;

  // Decode up to 1024 bytes as UTF-8
  const sample = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 1024));
  // Strip BOM and leading whitespace
  const trimmed = sample
    .replace(/^\uFEFF/, '')
    .trimStart()
    .toLowerCase();
  return trimmed.startsWith('<svg') || trimmed.startsWith('<?xml');
}

/**
 * Parse intrinsic dimensions from an SVG string.
 * Uses regex to extract width/height attributes or viewBox from the `<svg>` tag.
 * Falls back to 300×150 (HTML spec default for replaced elements).
 */
export function parseSvgDimensions(svg: string): { width: number; height: number } {
  const DEFAULT_WIDTH = 300;
  const DEFAULT_HEIGHT = 150;

  // Match the opening <svg ...> tag (non-greedy)
  const svgTagMatch = svg.match(/<svg\s[^>]*>/i);
  if (!svgTagMatch) return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };

  const tag = svgTagMatch[0];

  // Try explicit width/height attributes (strip optional units like px, pt, em)
  const widthMatch = tag.match(/\bwidth\s*=\s*["']([^"']+)["']/i);
  const heightMatch = tag.match(/\bheight\s*=\s*["']([^"']+)["']/i);

  if (widthMatch && heightMatch) {
    const w = parseFloat(widthMatch[1]);
    const h = parseFloat(heightMatch[1]);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      return { width: w, height: h };
    }
  }

  // Fall back to viewBox
  const viewBoxMatch = tag.match(/\bviewBox\s*=\s*["']([^"']+)["']/i);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/[\s,]+/);
    if (parts.length === 4) {
      const vbW = parseFloat(parts[2]);
      const vbH = parseFloat(parts[3]);
      if (!isNaN(vbW) && !isNaN(vbH) && vbW > 0 && vbH > 0) {
        return { width: vbW, height: vbH };
      }
    }
  }

  return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
}

/**
 * Rasterize an SVG string to PNG bytes using @resvg/resvg-js.
 *
 * @param svg  SVG markup string
 * @param scale  Scale factor (default {@link DEFAULT_SVG_SCALE}).
 *               The SVG intrinsic dimensions are multiplied by this value.
 * @returns PNG bytes and intrinsic (pre-scale) dimensions for aspect ratio calculations.
 */
export function rasterizeSvg(
  svg: string,
  scale: number = DEFAULT_SVG_SCALE,
): { pngBytes: Uint8Array; width: number; height: number } {
  try {
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'zoom', value: scale },
      logLevel: 'off',
    });

    // Intrinsic dimensions (before scale) — used by computeFitDimensions
    const width = resvg.width;
    const height = resvg.height;

    const rendered = resvg.render();
    const pngBuffer = rendered.asPng();
    const pngBytes = new Uint8Array(pngBuffer.buffer, pngBuffer.byteOffset, pngBuffer.byteLength);

    return { pngBytes, width, height };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to rasterize SVG: ${message}`);
  }
}
