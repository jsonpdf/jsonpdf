/**
 * No-op in Node.js — WASM initialization is only needed in browsers.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function initBrowser(resvgWasm?: Response | ArrayBuffer): Promise<void> {
  // Nothing to do in Node.js
}
