import type { InitInput } from '@resvg/resvg-wasm';
import { initWasm } from '@resvg/resvg-wasm';

import { setFontBuffers } from './font-store.js';

let initialized = false;

/**
 * Initialize the resvg WASM module for browser use.
 * Must be called once before any SVG rasterization.
 *
 * @param resvgWasm - The WASM binary as a fetch Response or ArrayBuffer
 * @param fontBuffers - Optional font buffers for SVG text rendering (e.g. sans-serif)
 */
export async function initBrowser(
  resvgWasm?: InitInput,
  fontBuffers?: Uint8Array[],
): Promise<void> {
  if (initialized) return;
  if (!resvgWasm) {
    throw new Error(
      'initBrowser() requires the resvg WASM binary. ' +
        'Pass a fetch() Response or ArrayBuffer for the @resvg/resvg-wasm WASM file.',
    );
  }
  await initWasm(resvgWasm);
  if (fontBuffers && fontBuffers.length > 0) {
    setFontBuffers(fontBuffers);
  }
  initialized = true;
}
