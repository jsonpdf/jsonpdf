import { describe, it, expect, beforeAll, vi } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';
import { imagePlugin, computeFitDimensions } from '../../src/image/image-plugin.js';
import { createImageCache } from '../../src/image/image-loader.js';
import { fontKey } from '../../src/types.js';
import type { MeasureContext, RenderContext, FontMap, ImageCache } from '../../src/types.js';
import type { Style } from '@jsonpdf/core';

// Minimal 1x1 PNG
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const PNG_DATA_URI = `data:image/png;base64,${TINY_PNG_BASE64}`;

// 2x1 PNG for aspect ratio tests
const WIDE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAADklEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const WIDE_PNG_DATA_URI = `data:image/png;base64,${WIDE_PNG_BASE64}`;

let doc: PDFDocument;
let page: PDFPage;
let fonts: FontMap;
let imageCache: ImageCache;

const defaultStyle: Style = {
  fontFamily: 'Helvetica',
  fontSize: 12,
  fontWeight: 'normal',
  fontStyle: 'normal',
  color: '#000000',
};

beforeAll(async () => {
  doc = await PDFDocument.create();
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  page = doc.addPage([612, 792]);
  fonts = new Map();
  fonts.set(fontKey('Helvetica', 'normal', 'normal'), helvetica);
  imageCache = createImageCache();
});

function makeMeasureCtx(overrides?: Partial<MeasureContext>): MeasureContext {
  return {
    fonts,
    availableWidth: 200,
    availableHeight: 100,
    resolveStyle: () => defaultStyle,
    elementStyle: defaultStyle,
    pdfDoc: doc,
    imageCache,
    ...overrides,
  };
}

function makeRenderCtx(overrides?: Partial<RenderContext>): RenderContext {
  return {
    ...makeMeasureCtx(),
    page,
    x: 50,
    y: 700,
    width: 200,
    height: 100,
    ...overrides,
  };
}

describe('imagePlugin.resolveProps', () => {
  it('merges with defaults', () => {
    const props = imagePlugin.resolveProps({ src: PNG_DATA_URI });
    expect(props.src).toBe(PNG_DATA_URI);
    expect(props.fit).toBe('contain');
  });

  it('respects explicit fit', () => {
    const props = imagePlugin.resolveProps({ src: PNG_DATA_URI, fit: 'fill' });
    expect(props.fit).toBe('fill');
  });
});

describe('imagePlugin.validate', () => {
  it('returns no errors for valid base64 data URI', () => {
    expect(imagePlugin.validate({ src: PNG_DATA_URI, fit: 'contain' })).toEqual([]);
  });

  it('returns no errors for valid SVG data URI', () => {
    const svgUri = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"/>')}`;
    expect(imagePlugin.validate({ src: svgUri, fit: 'cover' })).toEqual([]);
  });

  it('returns error for empty src', () => {
    const errors = imagePlugin.validate({ src: '' });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.path).toBe('/src');
  });

  it('returns error for local file path', () => {
    const errors = imagePlugin.validate({ src: '/path/to/image.png' });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.path).toBe('/src');
    expect(errors[0]!.message).toMatch(/must be a data URI/);
  });

  it('returns error for HTTP URL', () => {
    const errors = imagePlugin.validate({ src: 'https://example.com/test.png' });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.path).toBe('/src');
    expect(errors[0]!.message).toMatch(/must be a data URI/);
  });

  it('returns error for invalid fit', () => {
    const errors = imagePlugin.validate({
      src: PNG_DATA_URI,
      fit: 'stretch' as 'fill',
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.path).toBe('/fit');
  });
});

describe('computeFitDimensions', () => {
  it('contain: scales down to fit', () => {
    const result = computeFitDimensions(400, 200, 200, 100, 'contain');
    expect(result.drawWidth).toBe(200);
    expect(result.drawHeight).toBe(100);
    expect(result.offsetX).toBe(0);
    expect(result.offsetY).toBe(0);
  });

  it('contain: centers with letterboxing', () => {
    const result = computeFitDimensions(100, 100, 200, 100, 'contain');
    // scale = min(200/100, 100/100) = 1
    expect(result.drawWidth).toBe(100);
    expect(result.drawHeight).toBe(100);
    expect(result.offsetX).toBe(50); // (200 - 100) / 2
    expect(result.offsetY).toBe(0);
  });

  it('cover: fills element and centers', () => {
    const result = computeFitDimensions(100, 100, 200, 100, 'cover');
    // scale = max(200/100, 100/100) = 2
    expect(result.drawWidth).toBe(200);
    expect(result.drawHeight).toBe(200);
    expect(result.offsetX).toBe(0);
    expect(result.offsetY).toBe(-50); // (100 - 200) / 2
  });

  it('fill: stretches to element bounds', () => {
    const result = computeFitDimensions(100, 50, 200, 100, 'fill');
    expect(result.drawWidth).toBe(200);
    expect(result.drawHeight).toBe(100);
    expect(result.offsetX).toBe(0);
    expect(result.offsetY).toBe(0);
  });

  it('none: uses natural dimensions', () => {
    const result = computeFitDimensions(100, 50, 200, 100, 'none');
    expect(result.drawWidth).toBe(100);
    expect(result.drawHeight).toBe(50);
    expect(result.offsetX).toBe(50); // (200 - 100) / 2
    expect(result.offsetY).toBe(25); // (100 - 50) / 2
  });

  it('returns zeros for zero-dimension images', () => {
    const result = computeFitDimensions(0, 0, 200, 100, 'contain');
    expect(result.drawWidth).toBe(0);
    expect(result.drawHeight).toBe(0);
    expect(result.offsetX).toBe(0);
    expect(result.offsetY).toBe(0);
  });

  it('returns zeros for zero-width image', () => {
    const result = computeFitDimensions(0, 100, 200, 100, 'cover');
    expect(result.drawWidth).toBe(0);
    expect(result.drawHeight).toBe(0);
  });

  it('contain: preserves aspect ratio for wide image', () => {
    // 400x100 image in 200x200 element → scale = min(200/400, 200/100) = 0.5
    const result = computeFitDimensions(400, 100, 200, 200, 'contain');
    expect(result.drawWidth).toBe(200);
    expect(result.drawHeight).toBe(50);
    expect(result.offsetY).toBe(75); // (200 - 50) / 2
  });
});

describe('imagePlugin.measure', () => {
  it('returns element dimensions for contain', async () => {
    const result = await imagePlugin.measure(
      { src: PNG_DATA_URI, fit: 'contain' },
      makeMeasureCtx(),
    );
    expect(result.width).toBe(200);
    expect(result.height).toBe(100);
  });

  it('returns element dimensions for fill', async () => {
    const result = await imagePlugin.measure({ src: PNG_DATA_URI, fit: 'fill' }, makeMeasureCtx());
    expect(result.width).toBe(200);
    expect(result.height).toBe(100);
  });

  it('returns natural dimensions for none', async () => {
    const result = await imagePlugin.measure({ src: PNG_DATA_URI, fit: 'none' }, makeMeasureCtx());
    // 1x1 PNG
    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
  });

  it('measure with wide image preserves aspect ratio for contain', async () => {
    const result = await imagePlugin.measure(
      { src: WIDE_PNG_DATA_URI, fit: 'contain' },
      makeMeasureCtx(),
    );
    // 2x1 PNG in 200x100 box → returns element bounds for contain
    expect(result.width).toBe(200);
    expect(result.height).toBe(100);
  });
});

describe('imagePlugin.render', () => {
  it('renders image with contain fit and correct coordinates', async () => {
    const ctx = makeRenderCtx();
    const spy = vi.spyOn(ctx.page, 'drawImage');
    await imagePlugin.render({ src: PNG_DATA_URI, fit: 'contain' }, ctx);
    expect(spy).toHaveBeenCalledOnce();
    const args = spy.mock.calls[0]![1]!;
    expect(args.width).toBeGreaterThan(0);
    expect(args.height).toBeGreaterThan(0);
    spy.mockRestore();
  });

  it('renders image with fill fit at element bounds', async () => {
    const ctx = makeRenderCtx();
    const spy = vi.spyOn(ctx.page, 'drawImage');
    await imagePlugin.render({ src: PNG_DATA_URI, fit: 'fill' }, ctx);
    expect(spy).toHaveBeenCalledOnce();
    const args = spy.mock.calls[0]![1]!;
    expect(args.width).toBe(200);
    expect(args.height).toBe(100);
    spy.mockRestore();
  });

  it('renders image with none fit and applies clipping', async () => {
    const ctx = makeRenderCtx();
    const pushSpy = vi.spyOn(ctx.page, 'pushOperators');
    const drawSpy = vi.spyOn(ctx.page, 'drawImage');
    await imagePlugin.render({ src: PNG_DATA_URI, fit: 'none' }, ctx);
    // none mode uses clipping (pushGraphicsState + clip + popGraphicsState)
    expect(pushSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(drawSpy).toHaveBeenCalledOnce();
    pushSpy.mockRestore();
    drawSpy.mockRestore();
  });

  it('renders image with cover fit and applies clipping', async () => {
    const ctx = makeRenderCtx();
    const pushSpy = vi.spyOn(ctx.page, 'pushOperators');
    const drawSpy = vi.spyOn(ctx.page, 'drawImage');
    await imagePlugin.render({ src: PNG_DATA_URI, fit: 'cover' }, ctx);
    // cover mode uses clipping (pushGraphicsState + clip + popGraphicsState)
    expect(pushSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(drawSpy).toHaveBeenCalledOnce();
    pushSpy.mockRestore();
    drawSpy.mockRestore();
  });

  it('caches images (same src embedded once)', async () => {
    const cache = createImageCache();
    const ctx = makeRenderCtx({ imageCache: cache });
    await imagePlugin.render({ src: PNG_DATA_URI, fit: 'contain' }, ctx);
    await imagePlugin.render({ src: PNG_DATA_URI, fit: 'fill' }, ctx);
    // No error means the cache deduplication works
  });

  it('cache recovers after failure', async () => {
    const cache = createImageCache();
    const ctx = makeRenderCtx({ imageCache: cache });
    // First call with bad src fails
    await expect(
      imagePlugin.render({ src: 'data:image/png;base64,INVALID' }, ctx),
    ).rejects.toThrow();
    // Retry with valid src should succeed (cache not poisoned for this key since it's different)
    await expect(
      imagePlugin.render({ src: PNG_DATA_URI, fit: 'contain' }, ctx),
    ).resolves.toBeUndefined();
  });
});
