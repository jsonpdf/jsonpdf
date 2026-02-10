import { readFileBytes } from '@jsonpdf/plugins';

/** Default fetch timeout in milliseconds (30 seconds). */
const FETCH_TIMEOUT_MS = 30_000;

/**
 * Load font bytes from a source path or URL.
 *
 * - HTTP/HTTPS URLs are fetched via fetch() with a 30s timeout
 * - file:// URLs and local paths are handled by the platform-specific readFileBytes
 */
export async function loadFontBytes(src: string): Promise<Uint8Array> {
  if (src.startsWith('http://') || src.startsWith('https://')) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(src, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Failed to fetch font: ${String(response.status)} ${response.statusText}`);
      }
      return new Uint8Array(await response.arrayBuffer());
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return readFileBytes(src);
}
