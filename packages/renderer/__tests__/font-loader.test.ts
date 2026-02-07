import { describe, it, expect, vi, afterEach } from 'vitest';
import { loadFontBytes } from '../src/font-loader.js';

describe('loadFontBytes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads bytes from a local file path', async () => {
    const bytes = await loadFontBytes(new URL('../package.json', import.meta.url).pathname);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
  });

  it('loads bytes from a file:// URL', async () => {
    const fileUrl = new URL('../package.json', import.meta.url).href; // file://...
    const bytes = await loadFontBytes(fileUrl);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
  });

  it('throws for a missing file', async () => {
    await expect(loadFontBytes('/nonexistent/font.ttf')).rejects.toThrow();
  });

  it('fetches bytes from an HTTPS URL with timeout signal', async () => {
    const fakeBytes = new Uint8Array([0x00, 0x01, 0x02]);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(fakeBytes, { status: 200 }));

    const result = await loadFontBytes('https://example.com/font.ttf');
    expect(result).toEqual(fakeBytes);
    expect(fetch).toHaveBeenCalledWith(
      'https://example.com/font.ttf',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('throws on HTTP error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 404, statusText: 'Not Found' }),
    );

    await expect(loadFontBytes('https://example.com/missing.ttf')).rejects.toThrow(
      'Failed to fetch font: 404 Not Found',
    );
  });

  it('fetches bytes from an HTTP URL', async () => {
    const fakeBytes = new Uint8Array([0x10, 0x20]);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(fakeBytes, { status: 200 }));

    const result = await loadFontBytes('http://example.com/font.otf');
    expect(result).toEqual(fakeBytes);
  });
});
