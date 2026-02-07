import { readFile } from 'node:fs/promises';
import type { PDFDocument } from 'pdf-lib';
import type { EmbeddedImage, ImageCache } from '../types.js';

/** Default fetch timeout in milliseconds (30 seconds). */
const FETCH_TIMEOUT_MS = 30_000;

export type ImageFormat = 'png' | 'jpeg';

export interface LoadedImage {
  bytes: Uint8Array;
  format: ImageFormat;
}

/** Detect image format from the first few bytes. */
export function detectFormat(bytes: Uint8Array): ImageFormat {
  // PNG: starts with \x89PNG
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'png';
  }
  // JPEG: starts with \xFF\xD8
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    return 'jpeg';
  }
  throw new Error('Unsupported image format: expected PNG or JPEG');
}

/** Load image bytes from a source string. */
export async function loadImageBytes(src: string): Promise<LoadedImage> {
  let bytes: Uint8Array;

  if (src.startsWith('data:')) {
    // Data URI: data:image/png;base64,...
    const commaIdx = src.indexOf(',');
    if (commaIdx === -1) {
      throw new Error(`Invalid data URI: ${src.slice(0, 50)}`);
    }
    const base64 = src.slice(commaIdx + 1);
    bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  } else if (src.startsWith('http://') || src.startsWith('https://')) {
    // URL with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(src, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${String(response.status)} ${response.statusText}`);
      }
      bytes = new Uint8Array(await response.arrayBuffer());
    } finally {
      clearTimeout(timeoutId);
    }
  } else {
    // File path
    bytes = await readFile(src);
  }

  const format = detectFormat(bytes);
  return { bytes, format };
}

/** Embed an image into a PDF document. */
async function embedImage(doc: PDFDocument, loaded: LoadedImage): Promise<EmbeddedImage> {
  const image =
    loaded.format === 'png' ? await doc.embedPng(loaded.bytes) : await doc.embedJpg(loaded.bytes);
  return {
    image,
    width: image.width,
    height: image.height,
  };
}

/** Create an image cache that deduplicates loads. */
export function createImageCache(): ImageCache {
  const cache = new Map<string, Promise<EmbeddedImage>>();

  return {
    async getOrEmbed(src: string, doc: PDFDocument): Promise<EmbeddedImage> {
      let promise = cache.get(src);
      if (!promise) {
        promise = loadImageBytes(src).then((loaded) => embedImage(doc, loaded));
        // Remove from cache on failure so retries can succeed
        promise.catch(() => cache.delete(src));
        cache.set(src, promise);
      }
      return promise;
    },
  };
}
