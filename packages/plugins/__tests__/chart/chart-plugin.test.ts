import { describe, it, expect, beforeAll, vi } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';

import type { Style } from '@jsonpdf/core';
import { chartPlugin } from '../../src/chart/chart-plugin.js';
import type { ChartProps } from '../../src/chart/chart-types.js';
import {
  generateChart,
  createChartCache,
  buildFinalSpec,
} from '../../src/chart/chart-generator.js';
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

const SIMPLE_BAR_SPEC = {
  $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
  data: {
    values: [
      { a: 'A', b: 28 },
      { a: 'B', b: 55 },
    ],
  },
  mark: 'bar',
  encoding: {
    x: { field: 'a', type: 'nominal' },
    y: { field: 'b', type: 'quantitative' },
  },
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

describe('chartPlugin.resolveProps', () => {
  it('merges with defaults', () => {
    const props = chartPlugin.resolveProps({ spec: SIMPLE_BAR_SPEC });
    expect(props.fit).toBe('contain');
    expect(props.scale).toBe(2);
    expect(props.spec).toEqual(SIMPLE_BAR_SPEC);
  });

  it('preserves explicit values', () => {
    const props = chartPlugin.resolveProps({
      spec: SIMPLE_BAR_SPEC,
      fit: 'fill',
      scale: 3,
      background: '#FFFFFF',
    });
    expect(props.fit).toBe('fill');
    expect(props.scale).toBe(3);
    expect(props.background).toBe('#FFFFFF');
  });

  it('preserves dataSource', () => {
    const data = [{ x: 1 }, { x: 2 }];
    const props = chartPlugin.resolveProps({
      spec: SIMPLE_BAR_SPEC,
      dataSource: data,
    });
    expect(props.dataSource).toEqual(data);
  });
});

// ── validate ──

describe('chartPlugin.validate', () => {
  it('returns no errors for valid props', () => {
    const errors = chartPlugin.validate({ spec: SIMPLE_BAR_SPEC } as ChartProps);
    expect(errors).toEqual([]);
  });

  it('returns error for missing spec', () => {
    const errors = chartPlugin.validate({ spec: undefined } as unknown as ChartProps);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].path).toBe('/spec');
  });

  it('returns error for empty spec', () => {
    const errors = chartPlugin.validate({ spec: {} } as ChartProps);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].path).toBe('/spec');
    expect(errors[0].message).toContain('empty');
  });

  it('returns error for non-object spec', () => {
    const errors = chartPlugin.validate({ spec: [1, 2, 3] } as unknown as ChartProps);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].path).toBe('/spec');
  });

  it('returns error for non-array dataSource', () => {
    const errors = chartPlugin.validate({
      spec: SIMPLE_BAR_SPEC,
      dataSource: 'not-an-array' as unknown as unknown[],
    } as ChartProps);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].path).toBe('/dataSource');
  });

  it('returns error for invalid scale', () => {
    const errors = chartPlugin.validate({
      spec: SIMPLE_BAR_SPEC,
      scale: 0.1,
    } as ChartProps);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].path).toBe('/scale');
  });
});

// ── buildFinalSpec ──

describe('buildFinalSpec', () => {
  it('returns spec unchanged when no overrides', () => {
    const result = buildFinalSpec({ spec: SIMPLE_BAR_SPEC } as ChartProps);
    expect(result).toEqual(SIMPLE_BAR_SPEC);
  });

  it('merges dataSource into spec.data.values', () => {
    const data = [{ a: 'X', b: 99 }];
    const result = buildFinalSpec({ spec: SIMPLE_BAR_SPEC, dataSource: data } as ChartProps);
    expect(result.data).toEqual({ values: data });
    expect(result.mark).toBe('bar');
  });

  it('overrides background', () => {
    const result = buildFinalSpec({
      spec: SIMPLE_BAR_SPEC,
      background: '#FF0000',
    } as ChartProps);
    expect(result.background).toBe('#FF0000');
  });

  it('merges both dataSource and background', () => {
    const data = [{ a: 'Y', b: 42 }];
    const result = buildFinalSpec({
      spec: SIMPLE_BAR_SPEC,
      dataSource: data,
      background: '#0000FF',
    } as ChartProps);
    expect(result.data).toEqual({ values: data });
    expect(result.background).toBe('#0000FF');
  });
});

// ── generateChart ──

describe('generateChart', () => {
  it('generates PNG data URI for bar chart', async () => {
    const cache = createChartCache();
    const dataUri = await generateChart({ spec: SIMPLE_BAR_SPEC, scale: 1 } as ChartProps, cache);
    expect(dataUri).toMatch(/^data:image\/png;base64,/);
    expect(cache.size).toBe(1);
  });

  it('caches identical requests', async () => {
    const cache = createChartCache();
    const props = { spec: SIMPLE_BAR_SPEC, scale: 1 } as ChartProps;
    const uri1 = await generateChart(props, cache);
    const uri2 = await generateChart(props, cache);
    expect(uri1).toBe(uri2);
    expect(cache.size).toBe(1);
  });

  it('throws descriptive error for invalid spec', async () => {
    const cache = createChartCache();
    await expect(
      generateChart({ spec: { invalid: true }, scale: 1 } as ChartProps, cache),
    ).rejects.toThrow(/Vega-Lite compilation failed/);
  });
});

// ── measure ──

describe('chartPlugin.measure', () => {
  it('returns available dimensions for valid spec', async () => {
    const ctx = makeMeasureCtx();
    const result = await chartPlugin.measure(
      { spec: SIMPLE_BAR_SPEC, scale: 1 } as ChartProps,
      ctx,
    );
    expect(result.width).toBe(200);
    expect(result.height).toBe(200);
  });

  it('returns zero dimensions for empty spec', async () => {
    const ctx = makeMeasureCtx();
    const result = await chartPlugin.measure({ spec: {} } as ChartProps, ctx);
    expect(result.width).toBe(0);
    expect(result.height).toBe(0);
  });
});

// ── render ──

describe('chartPlugin.render', () => {
  it('renders bar chart via drawImage', async () => {
    const ctx = makeRenderCtx();
    const spy = vi.spyOn(ctx.page, 'drawImage');
    await chartPlugin.render({ spec: SIMPLE_BAR_SPEC, scale: 1 } as ChartProps, ctx);
    expect(spy).toHaveBeenCalledOnce();
    const args = spy.mock.calls[0][1];
    expect(args).toBeDefined();
    expect(args!.width).toBeGreaterThan(0);
    expect(args!.height).toBeGreaterThan(0);
    spy.mockRestore();
  });

  it('skips render for empty spec', async () => {
    const ctx = makeRenderCtx();
    const spy = vi.spyOn(ctx.page, 'drawImage');
    await chartPlugin.render({ spec: {} } as ChartProps, ctx);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('respects fit mode', async () => {
    const ctx = makeRenderCtx({ width: 400, height: 100 });
    const spy = vi.spyOn(ctx.page, 'drawImage');
    await chartPlugin.render({ spec: SIMPLE_BAR_SPEC, fit: 'fill', scale: 1 } as ChartProps, ctx);
    expect(spy).toHaveBeenCalledOnce();
    const args = spy.mock.calls[0][1];
    // With fit='fill', drawWidth should match ctx.width
    expect(args!.width).toBe(400);
    expect(args!.height).toBe(100);
    spy.mockRestore();
  });
});
