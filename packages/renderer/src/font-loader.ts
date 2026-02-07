import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/** Default fetch timeout in milliseconds (30 seconds). */
const FETCH_TIMEOUT_MS = 30_000;

/**
 * Load font bytes from a source path or URL.
 *
 * - HTTP/HTTPS URLs are fetched via fetch() with a 30s timeout
 * - file:// URLs are converted to paths via fileURLToPath
 * - All other strings are treated as file paths
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

  // Convert file:// URLs to paths
  const filePath = src.startsWith('file://') ? fileURLToPath(src) : src;
  return readFile(filePath);
}
