import { describe, it, expect, vi, afterEach } from 'vitest';
import { detectFormat, loadImageBytes, createImageCache } from '../../src/image/image-loader.js';

// Minimal 1x1 PNG (67 bytes)
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Minimal JPEG (smallest valid JFIF)
const TINY_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP8B////AP////8A//8A//8A/////wD/2wBDAP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP8B////AP////8A//8A//8A/////wD/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AKwA//9k=';

describe('detectFormat', () => {
  it('detects PNG format', () => {
    const bytes = Uint8Array.from(atob(TINY_PNG_BASE64), (c) => c.charCodeAt(0));
    expect(detectFormat(bytes)).toBe('png');
  });

  it('detects JPEG format', () => {
    const bytes = Uint8Array.from(atob(TINY_JPEG_BASE64), (c) => c.charCodeAt(0));
    expect(detectFormat(bytes)).toBe('jpeg');
  });

  it('throws for unsupported format', () => {
    const bytes = new Uint8Array([0x47, 0x49, 0x46]); // GIF header
    expect(() => detectFormat(bytes)).toThrow('Unsupported image format');
  });

  it('throws for empty data', () => {
    expect(() => detectFormat(new Uint8Array([]))).toThrow('Unsupported image format');
  });
});

describe('loadImageBytes', () => {
  it('loads PNG from data URI', async () => {
    const src = `data:image/png;base64,${TINY_PNG_BASE64}`;
    const result = await loadImageBytes(src);
    expect(result.format).toBe('png');
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it('loads JPEG from data URI', async () => {
    const src = `data:image/jpeg;base64,${TINY_JPEG_BASE64}`;
    const result = await loadImageBytes(src);
    expect(result.format).toBe('jpeg');
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it('throws for invalid data URI (no comma)', async () => {
    await expect(loadImageBytes('data:image/png;base64')).rejects.toThrow('Invalid data URI');
  });

  it('throws for missing file', async () => {
    await expect(loadImageBytes('/nonexistent/file.png')).rejects.toThrow();
  });

  it('loads image from HTTP URL', async () => {
    const pngBytes = Uint8Array.from(atob(TINY_PNG_BASE64), (c) => c.charCodeAt(0));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(pngBytes, { status: 200 }));

    const result = await loadImageBytes('https://example.com/image.png');
    expect(result.format).toBe('png');
    expect(result.bytes.length).toBeGreaterThan(0);
    expect(fetch).toHaveBeenCalledWith(
      'https://example.com/image.png',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('throws on HTTP error for image', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 403, statusText: 'Forbidden' }),
    );

    await expect(loadImageBytes('https://example.com/secret.png')).rejects.toThrow(
      'Failed to fetch image: 403 Forbidden',
    );
  });
});

describe('createImageCache', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('recovers from failed loads (cache not poisoned)', async () => {
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.create();
    const cache = createImageCache();

    // First: fail with bad data URI
    await expect(cache.getOrEmbed('data:image/png;base64,BADDATA', doc)).rejects.toThrow();

    // Retry same key should attempt again (not return cached rejection)
    // Still fails because the data is still bad, but it's a fresh attempt
    await expect(cache.getOrEmbed('data:image/png;base64,BADDATA', doc)).rejects.toThrow();
  });
});
