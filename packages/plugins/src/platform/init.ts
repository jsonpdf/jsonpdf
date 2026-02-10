/**
 * No-op in Node.js — WASM initialization is only needed in browsers.
 * Accepts `unknown` so the signature is a superset of the browser variant's `InitInput`.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function initBrowser(resvgWasm?: unknown): Promise<void> {
  // Nothing to do in Node.js
}
