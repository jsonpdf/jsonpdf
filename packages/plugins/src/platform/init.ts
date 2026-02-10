/**
 * No-op in Node.js — WASM initialization is only needed in browsers.
 * Accepts `unknown` so the signature is a superset of the browser variant's `InitInput`.
 */
export async function initBrowser(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  resvgWasm?: unknown,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fontBuffers?: Uint8Array[],
): Promise<void> {
  // Nothing to do in Node.js — system fonts are used automatically
}
