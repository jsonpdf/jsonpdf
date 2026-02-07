import { describe, it, expect, beforeAll, vi } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';

import type { Band, Style } from '@jsonpdf/core';
import { framePlugin } from '../../src/frame/frame-plugin.js';
import type { FrameProps } from '../../src/frame/frame-types.js';
import { createImageCache } from '../../src/image/image-loader.js';
import { fontKey } from '../../src/types.js';
import type { MeasureContext, RenderContext, FontMap, ImageCache } from '../../src/types.js';

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
  lineHeight: 1.2,
};

const SIMPLE_BAND: Band = {
  id: 'body1',
  type: 'body',
  height: 50,
  elements: [
    {
      id: 'text1',
      type: 'text',
      x: 0,
      y: 0,
      width: 100,
      height: 20,
      properties: { content: 'Hello' },
    },
  ],
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
    availableHeight: 200,
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
    height: 200,
    ...overrides,
  };
}

// ── resolveProps ──

describe('framePlugin.resolveProps', () => {
  it('merges with defaults', () => {
    const props = framePlugin.resolveProps({ bands: [SIMPLE_BAND] });
    expect(props.bands).toEqual([SIMPLE_BAND]);
  });

  it('preserves bands array', () => {
    const bands = [SIMPLE_BAND, { ...SIMPLE_BAND, id: 'body2' }];
    const props = framePlugin.resolveProps({ bands });
    expect(props.bands).toHaveLength(2);
    expect(props.bands[1].id).toBe('body2');
  });
});

// ── validate ──

describe('framePlugin.validate', () => {
  it('returns no errors for valid props', () => {
    const errors = framePlugin.validate({ bands: [SIMPLE_BAND] });
    expect(errors).toEqual([]);
  });

  it('returns error for missing bands', () => {
    const errors = framePlugin.validate({ bands: undefined } as unknown as FrameProps);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].path).toBe('/bands');
  });

  it('returns error for empty bands array', () => {
    const errors = framePlugin.validate({ bands: [] });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].path).toBe('/bands');
    expect(errors[0].message).toContain('empty');
  });

  it('returns error for non-array bands', () => {
    const errors = framePlugin.validate({
      bands: 'not-an-array' as unknown as Band[],
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].path).toBe('/bands');
  });
});

// ── measure ──

describe('framePlugin.measure', () => {
  it('returns zero dimensions for empty bands', async () => {
    const ctx = makeMeasureCtx();
    const result = await framePlugin.measure({ bands: [] }, ctx);
    expect(result.width).toBe(0);
    expect(result.height).toBe(0);
  });

  it('returns available dimensions when no callback', async () => {
    const ctx = makeMeasureCtx();
    const result = await framePlugin.measure({ bands: [SIMPLE_BAND] }, ctx);
    expect(result.width).toBe(200);
    expect(result.height).toBe(200);
  });

  it('delegates to measureBands callback', async () => {
    const measureBands = vi.fn().mockResolvedValue({ totalHeight: 150 });
    const ctx = makeMeasureCtx({ measureBands });
    const result = await framePlugin.measure({ bands: [SIMPLE_BAND] }, ctx);
    expect(measureBands).toHaveBeenCalledWith([SIMPLE_BAND]);
    expect(result.width).toBe(200);
    expect(result.height).toBe(150);
  });
});

// ── render ──

describe('framePlugin.render', () => {
  it('no-op for empty bands', async () => {
    const renderBands = vi.fn();
    const ctx = makeRenderCtx({ renderBands });
    await framePlugin.render({ bands: [] }, ctx);
    expect(renderBands).not.toHaveBeenCalled();
  });

  it('no-op when no callback', async () => {
    const ctx = makeRenderCtx();
    // Should not throw
    await framePlugin.render({ bands: [SIMPLE_BAND] }, ctx);
  });

  it('delegates to renderBands callback', async () => {
    const renderBands = vi.fn().mockResolvedValue(undefined);
    const ctx = makeRenderCtx({ renderBands });
    await framePlugin.render({ bands: [SIMPLE_BAND] }, ctx);
    expect(renderBands).toHaveBeenCalledWith([SIMPLE_BAND]);
  });
});
