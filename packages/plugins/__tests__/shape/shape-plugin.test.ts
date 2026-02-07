import { describe, it, expect, beforeAll, vi } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';
import { shapePlugin, roundedRectPath } from '../../src/shape/shape-plugin.js';
import { fontKey } from '../../src/types.js';
import type { MeasureContext, RenderContext, FontMap, ImageCache } from '../../src/types.js';
import type { Style } from '@jsonpdf/core';

let doc: PDFDocument;
let page: PDFPage;
let fonts: FontMap;
const noopImageCache: ImageCache = {
  getOrEmbed: () => Promise.reject(new Error('no images in test')),
};

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
});

function makeMeasureCtx(overrides?: Partial<MeasureContext>): MeasureContext {
  return {
    fonts,
    availableWidth: 200,
    availableHeight: 100,
    resolveStyle: () => defaultStyle,
    elementStyle: defaultStyle,
    pdfDoc: doc,
    imageCache: noopImageCache,
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

describe('shapePlugin.resolveProps', () => {
  it('merges with defaults', () => {
    const props = shapePlugin.resolveProps({ shapeType: 'circle', fill: '#ff0000' });
    expect(props.shapeType).toBe('circle');
    expect(props.fill).toBe('#ff0000');
  });

  it('uses default shapeType when not provided', () => {
    const props = shapePlugin.resolveProps({});
    expect(props.shapeType).toBe('rect');
  });
});

describe('shapePlugin.validate', () => {
  it('returns no errors for valid rect props', () => {
    expect(shapePlugin.validate({ shapeType: 'rect', fill: '#ff0000' })).toEqual([]);
  });

  it('returns no errors for valid circle props', () => {
    expect(shapePlugin.validate({ shapeType: 'circle', stroke: '#000000' })).toEqual([]);
  });

  it('returns no errors for valid ellipse props', () => {
    expect(shapePlugin.validate({ shapeType: 'ellipse' })).toEqual([]);
  });

  it('returns error for invalid shapeType', () => {
    const errors = shapePlugin.validate({ shapeType: 'triangle' as 'rect' });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.path).toBe('/shapeType');
  });

  it('returns error for non-hex fill color', () => {
    const errors = shapePlugin.validate({ shapeType: 'rect', fill: 'red' });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.path).toBe('/fill');
  });

  it('returns error for non-hex stroke color', () => {
    const errors = shapePlugin.validate({ shapeType: 'rect', stroke: 'blue' });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.path).toBe('/stroke');
  });

  it('returns error for negative strokeWidth', () => {
    const errors = shapePlugin.validate({ shapeType: 'rect', strokeWidth: -1 });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.path).toBe('/strokeWidth');
  });

  it('returns error for negative borderRadius', () => {
    const errors = shapePlugin.validate({ shapeType: 'rect', borderRadius: -5 });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.path).toBe('/borderRadius');
  });

  it('returns multiple errors for multiple invalid fields', () => {
    const errors = shapePlugin.validate({
      shapeType: 'rect',
      fill: 'red',
      stroke: 'blue',
      strokeWidth: -1,
    });
    expect(errors).toHaveLength(3);
  });

  it('allows zero strokeWidth', () => {
    expect(shapePlugin.validate({ shapeType: 'rect', strokeWidth: 0 })).toEqual([]);
  });
});

describe('shapePlugin.measure', () => {
  it('returns available dimensions for rect', async () => {
    const result = await shapePlugin.measure({ shapeType: 'rect' }, makeMeasureCtx());
    expect(result.width).toBe(200);
    expect(result.height).toBe(100);
  });

  it('returns available dimensions for circle', async () => {
    const result = await shapePlugin.measure({ shapeType: 'circle' }, makeMeasureCtx());
    expect(result.width).toBe(200);
    expect(result.height).toBe(100);
  });

  it('returns available dimensions for ellipse', async () => {
    const result = await shapePlugin.measure({ shapeType: 'ellipse' }, makeMeasureCtx());
    expect(result.width).toBe(200);
    expect(result.height).toBe(100);
  });
});

describe('shapePlugin.render', () => {
  it('renders rect with correct drawRectangle args', async () => {
    const ctx = makeRenderCtx();
    const spy = vi.spyOn(ctx.page, 'drawRectangle');
    await shapePlugin.render({ shapeType: 'rect', fill: '#cccccc' }, ctx);
    expect(spy).toHaveBeenCalledOnce();
    const args = spy.mock.calls[0]![0]!;
    expect(args.x).toBe(50);
    expect(args.y).toBe(600); // 700 - 100
    expect(args.width).toBe(200);
    expect(args.height).toBe(100);
    spy.mockRestore();
  });

  it('renders rect with stroke and strokeWidth', async () => {
    const ctx = makeRenderCtx();
    const spy = vi.spyOn(ctx.page, 'drawRectangle');
    await shapePlugin.render(
      { shapeType: 'rect', stroke: '#000000', strokeWidth: 2 },
      ctx,
    );
    expect(spy).toHaveBeenCalledOnce();
    const args = spy.mock.calls[0]![0]!;
    expect(args.borderWidth).toBe(2);
    expect(args.borderColor).toBeDefined();
    spy.mockRestore();
  });

  it('renders rect with fill and stroke', async () => {
    const ctx = makeRenderCtx();
    const spy = vi.spyOn(ctx.page, 'drawRectangle');
    await shapePlugin.render(
      { shapeType: 'rect', fill: '#ff0000', stroke: '#000000', strokeWidth: 1 },
      ctx,
    );
    expect(spy).toHaveBeenCalledOnce();
    const args = spy.mock.calls[0]![0]!;
    expect(args.color).toBeDefined();
    expect(args.borderColor).toBeDefined();
    spy.mockRestore();
  });

  it('renders rect with dashPattern', async () => {
    const ctx = makeRenderCtx();
    const spy = vi.spyOn(ctx.page, 'drawRectangle');
    await shapePlugin.render(
      { shapeType: 'rect', stroke: '#000000', strokeWidth: 1, dashPattern: [4, 2] },
      ctx,
    );
    const args = spy.mock.calls[0]![0]!;
    expect(args.borderDashArray).toEqual([4, 2]);
    spy.mockRestore();
  });

  it('renders rect with borderRadius via drawSvgPath', async () => {
    const ctx = makeRenderCtx();
    const spy = vi.spyOn(ctx.page, 'drawSvgPath');
    await shapePlugin.render(
      { shapeType: 'rect', fill: '#0000ff', borderRadius: 10 },
      ctx,
    );
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it('renders rect with no fill or stroke', async () => {
    await expect(
      shapePlugin.render({ shapeType: 'rect' }, makeRenderCtx()),
    ).resolves.toBeUndefined();
  });

  it('renders circle with correct center and radius', async () => {
    const ctx = makeRenderCtx();
    const spy = vi.spyOn(ctx.page, 'drawCircle');
    await shapePlugin.render({ shapeType: 'circle', fill: '#00ff00' }, ctx);
    expect(spy).toHaveBeenCalledOnce();
    const args = spy.mock.calls[0]![0]!;
    // radius = min(200, 100) / 2 = 50
    expect(args.size).toBe(50);
    // center: x + width/2 = 50 + 100 = 150
    expect(args.x).toBe(150);
    spy.mockRestore();
  });

  it('renders circle with stroke', async () => {
    const ctx = makeRenderCtx();
    const spy = vi.spyOn(ctx.page, 'drawCircle');
    await shapePlugin.render(
      { shapeType: 'circle', stroke: '#ff0000', strokeWidth: 3 },
      ctx,
    );
    const args = spy.mock.calls[0]![0]!;
    expect(args.borderWidth).toBe(3);
    spy.mockRestore();
  });

  it('renders ellipse with correct scales', async () => {
    const ctx = makeRenderCtx();
    const spy = vi.spyOn(ctx.page, 'drawEllipse');
    await shapePlugin.render({ shapeType: 'ellipse', fill: '#ff00ff' }, ctx);
    expect(spy).toHaveBeenCalledOnce();
    const args = spy.mock.calls[0]![0]!;
    expect(args.xScale).toBe(100); // 200 / 2
    expect(args.yScale).toBe(50); // 100 / 2
    spy.mockRestore();
  });

  it('renders ellipse with stroke and dashPattern', async () => {
    const ctx = makeRenderCtx();
    const spy = vi.spyOn(ctx.page, 'drawEllipse');
    await shapePlugin.render(
      { shapeType: 'ellipse', stroke: '#000000', strokeWidth: 2, dashPattern: [6, 3] },
      ctx,
    );
    const args = spy.mock.calls[0]![0]!;
    expect(args.borderWidth).toBe(2);
    expect(args.borderDashArray).toEqual([6, 3]);
    spy.mockRestore();
  });

  it('defaults strokeWidth to 1 when stroke is provided but no strokeWidth', async () => {
    const ctx = makeRenderCtx();
    const spy = vi.spyOn(ctx.page, 'drawRectangle');
    await shapePlugin.render({ shapeType: 'rect', stroke: '#000000' }, ctx);
    const args = spy.mock.calls[0]![0]!;
    expect(args.borderWidth).toBe(1);
    spy.mockRestore();
  });
});

describe('roundedRectPath', () => {
  it('produces a valid SVG path string', () => {
    const path = roundedRectPath(100, 50, 10);
    expect(path).toContain('M');
    expect(path).toContain('Q');
    expect(path).toContain('Z');
  });

  it('clamps radius to half the smallest dimension', () => {
    // For a 20x10 rect with radius 30, radius should clamp to 5
    const path = roundedRectPath(20, 10, 30);
    expect(path).toContain('M 5 0');
  });

  it('handles zero radius', () => {
    const path = roundedRectPath(100, 50, 0);
    // With r=0, the Q control points degenerate to straight lines
    expect(path).toContain('M 0 0');
  });
});
