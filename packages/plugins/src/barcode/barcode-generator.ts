import BwipJs from 'bwip-js';
import type { BarcodeProps } from './barcode-types.js';
import { TWO_D_FORMATS } from './barcode-types.js';
import { rasterizeSvg } from '../image/svg-rasterizer.js';
import { uint8ArrayToBase64 } from '../platform/base64.js';

/** Cache for generated barcode data URIs, keyed by deterministic option string. */
export type BarcodeCache = Map<string, Promise<string>>;

/** Create a new barcode cache instance. */
export function createBarcodeCache(): BarcodeCache {
  return new Map();
}

/**
 * Strip '#' from a hex color for bwip-js (expects hex without prefix).
 * Handles both '#RGB' shorthand and '#RRGGBB'.
 */
export function toBwipColor(hex: string): string {
  const raw = hex.startsWith('#') ? hex.slice(1) : hex;
  if (raw.length === 3) {
    return raw[0] + raw[0] + raw[1] + raw[1] + raw[2] + raw[2];
  }
  return raw;
}

/** Build a deterministic cache key from barcode props. */
function cacheKey(props: BarcodeProps): string {
  return JSON.stringify({
    v: props.value,
    f: props.format,
    bc: props.barColor ?? '#000000',
    bg: props.backgroundColor ?? '#FFFFFF',
    it: props.includeText ?? false,
    ts: props.textSize,
    s: props.scale ?? 3,
    mh: props.moduleHeight ?? 10,
    p: props.padding ?? 2,
  });
}

/**
 * Generate a barcode PNG and return it as a data URI string.
 *
 * Uses the provided cache to deduplicate calls with identical props
 * (important because the two-pass renderer calls measure+render twice).
 */
export function generateBarcode(props: BarcodeProps, cache: BarcodeCache): Promise<string> {
  const key = cacheKey(props);

  const existing = cache.get(key);
  if (existing) {
    return existing;
  }

  let promise: Promise<string>;
  try {
    promise = Promise.resolve(generateBarcodeUncached(props));
  } catch (err) {
    promise = Promise.reject(err as Error);
  }
  // Remove from cache on failure so retries can succeed
  promise.catch(() => cache.delete(key));
  cache.set(key, promise);
  return promise;
}

function generateBarcodeUncached(props: BarcodeProps): string {
  const options: BwipJs.RenderOptions = {
    bcid: props.format,
    text: props.value,
    scale: props.scale ?? 3,
    paddingwidth: props.padding ?? 2,
    paddingheight: props.padding ?? 2,
    backgroundcolor: toBwipColor(props.backgroundColor ?? '#FFFFFF'),
    barcolor: toBwipColor(props.barColor ?? '#000000'),
  };

  // Only set height for linear barcodes (not 2D codes)
  if (!TWO_D_FORMATS.has(props.format)) {
    options.height = props.moduleHeight ?? 10;
  }

  if (props.includeText) {
    options.includetext = true;
    options.textxalign = 'center';
    if (props.textSize !== undefined) {
      options.textsize = props.textSize;
    }
  }

  let svgString: string;
  try {
    svgString = BwipJs.toSVG(options);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Barcode generation failed for format "${props.format}" with value "${props.value}": ${message}`,
    );
  }

  const { pngBytes } = rasterizeSvg(svgString, 1);
  const base64 = uint8ArrayToBase64(pngBytes);
  return `data:image/png;base64,${base64}`;
}
