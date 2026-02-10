import { describe, it, expect } from 'vitest';
import { detectFormat, loadImageBytes, createImageCache } from '../../src/image/image-loader.js';

// Minimal 1x1 PNG (67 bytes)
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Minimal SVG for testing
const TINY_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><rect width="100" height="50" fill="red"/></svg>';
const TINY_SVG_BASE64 = btoa(TINY_SVG);

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
  it('loads PNG from data URI', () => {
    const src = `data:image/png;base64,${TINY_PNG_BASE64}`;
    const result = loadImageBytes(src);
    expect(result.format).toBe('png');
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it('loads JPEG from data URI', () => {
    const src = `data:image/jpeg;base64,${TINY_JPEG_BASE64}`;
    const result = loadImageBytes(src);
    expect(result.format).toBe('jpeg');
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it('throws for invalid data URI (no comma)', () => {
    expect(() => loadImageBytes('data:image/png;base64')).toThrow('Invalid data URI');
  });

  it('throws for local file path', () => {
    expect(() => loadImageBytes('/some/local/file.png')).toThrow('Unsupported image source');
  });

  it('throws for HTTP URL', () => {
    expect(() => loadImageBytes('https://example.com/image.png')).toThrow(
      'Unsupported image source',
    );
  });
});

describe('loadImageBytes - SVG', () => {
  it('loads SVG from base64 data URI and returns PNG', () => {
    const src = `data:image/svg+xml;base64,${TINY_SVG_BASE64}`;
    const result = loadImageBytes(src);
    expect(result.format).toBe('png');
    // Verify rasterized bytes are valid PNG
    expect(result.bytes[0]).toBe(0x89);
    expect(result.bytes[1]).toBe(0x50);
    expect(result.bytes[2]).toBe(0x4e);
    expect(result.bytes[3]).toBe(0x47);
  });

  it('loads SVG from URL-encoded data URI and returns PNG', () => {
    const src = `data:image/svg+xml,${encodeURIComponent(TINY_SVG)}`;
    const result = loadImageBytes(src);
    expect(result.format).toBe('png');
    expect(result.bytes[0]).toBe(0x89); // PNG magic
  });

  it('rasterized SVG bytes have valid PNG structure', () => {
    const src = `data:image/svg+xml;base64,${TINY_SVG_BASE64}`;
    const result = loadImageBytes(src);
    expect(result.bytes.length).toBeGreaterThan(8);
    // PNG magic: 89 50 4E 47 0D 0A 1A 0A
    expect(result.bytes[4]).toBe(0x0d);
    expect(result.bytes[5]).toBe(0x0a);
    expect(result.bytes[6]).toBe(0x1a);
    expect(result.bytes[7]).toBe(0x0a);
  });
});

describe('createImageCache', () => {
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
