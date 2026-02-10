import type { InitInput } from '@resvg/resvg-wasm';
import { initWasm } from '@resvg/resvg-wasm';

let initialized = false;

/**
 * Initialize the resvg WASM module for browser use.
 * Must be called once before any SVG rasterization.
 *
 * @param resvgWasm - The WASM binary as a fetch Response or ArrayBuffer
 */
export async function initBrowser(resvgWasm?: InitInput): Promise<void> {
  if (initialized) return;
  if (!resvgWasm) {
    throw new Error(
      'initBrowser() requires the resvg WASM binary. ' +
        'Pass a fetch() Response or ArrayBuffer for the @resvg/resvg-wasm WASM file.',
    );
  }
  await initWasm(resvgWasm);
  initialized = true;
}
