import { describe, it, expect, beforeAll } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';

import type { Element, Style } from '@jsonpdf/core';
import { containerPlugin } from '../../src/container/container-plugin.js';
import { fontKey } from '../../src/types.js';
import type { MeasureContext, RenderContext, FontMap, ImageCache } from '../../src/types.js';

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

function makeChild(overrides: Partial<Element> & { id: string }): Element {
  return {
    type: 'text',
    x: 0,
    y: 0,
    width: 100,
    height: 20,
    properties: { content: 'child' },
    ...overrides,
  };
}

function makeMeasureCtx(overrides?: Partial<MeasureContext>): MeasureContext {
  return {
    fonts,
    availableWidth: 500,
    availableHeight: 300,
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
    x: 40,
    y: 752,
    width: 500,
    height: 300,
    ...overrides,
  };
}

// Stub measureChild that returns the child's declared dimensions
const stubMeasureChild = async (el: Element) => ({
  width: el.width,
  height: el.height,
});

describe('containerPlugin.resolveProps', () => {
  it('merges with defaults', () => {
    const props = containerPlugin.resolveProps({ layout: 'horizontal', gap: 10 });
    expect(props.layout).toBe('horizontal');
    expect(props.gap).toBe(10);
    expect(props.gridColumns).toBe(2);
    expect(props.alignItems).toBe('start');
  });

  it('uses default layout when not provided', () => {
    const props = containerPlugin.resolveProps({});
    expect(props.layout).toBe('absolute');
  });
});

describe('containerPlugin.validate', () => {
  it('returns no errors for valid props', () => {
    expect(containerPlugin.validate({ layout: 'horizontal', gap: 10, gridColumns: 3, alignItems: 'center' })).toEqual([]);
  });

  it('returns no errors for minimal props', () => {
    expect(containerPlugin.validate({ layout: 'vertical' })).toEqual([]);
  });
});

describe('containerPlugin.measure', () => {
  it('returns available dimensions when no children', async () => {
    const ctx = makeMeasureCtx({ children: [], measureChild: stubMeasureChild });
    const result = await containerPlugin.measure({ layout: 'horizontal' }, ctx);
    expect(result.width).toBe(500);
    expect(result.height).toBe(300);
  });

  it('returns available dimensions when measureChild missing', async () => {
    const ctx = makeMeasureCtx({ children: [makeChild({ id: 'c1' })] });
    const result = await containerPlugin.measure({ layout: 'horizontal' }, ctx);
    expect(result.width).toBe(500);
    expect(result.height).toBe(300);
  });

  it('measures absolute layout', async () => {
    const children = [
      makeChild({ id: 'c1', x: 10, y: 5, width: 100, height: 20 }),
      makeChild({ id: 'c2', x: 50, y: 30, width: 80, height: 25 }),
    ];
    const ctx = makeMeasureCtx({ children, measureChild: stubMeasureChild });
    const result = await containerPlugin.measure({ layout: 'absolute' }, ctx);
    expect(result.width).toBe(130); // max(10+100, 50+80) = 130
    expect(result.height).toBe(55); // max(5+20, 30+25) = 55
  });

  it('measures horizontal layout', async () => {
    const children = [
      makeChild({ id: 'c1', width: 100, height: 20 }),
      makeChild({ id: 'c2', width: 80, height: 30 }),
    ];
    const ctx = makeMeasureCtx({ children, measureChild: stubMeasureChild });
    const result = await containerPlugin.measure({ layout: 'horizontal', gap: 10 }, ctx);
    expect(result.width).toBe(190); // 100 + 10 + 80
    expect(result.height).toBe(30); // max(20, 30)
  });

  it('measures vertical layout', async () => {
    const children = [
      makeChild({ id: 'c1', width: 100, height: 20 }),
      makeChild({ id: 'c2', width: 80, height: 30 }),
    ];
    const ctx = makeMeasureCtx({ children, measureChild: stubMeasureChild });
    const result = await containerPlugin.measure({ layout: 'vertical', gap: 5 }, ctx);
    expect(result.width).toBe(100); // max(100, 80)
    expect(result.height).toBe(55); // 20 + 5 + 30
  });

  it('measures grid layout', async () => {
    const children = [
      makeChild({ id: 'c1', width: 100, height: 20 }),
      makeChild({ id: 'c2', width: 100, height: 30 }),
      makeChild({ id: 'c3', width: 100, height: 25 }),
    ];
    const ctx = makeMeasureCtx({
      children,
      measureChild: stubMeasureChild,
      availableWidth: 210,
    });
    const result = await containerPlugin.measure(
      { layout: 'grid', gridColumns: 2, gap: 10 },
      ctx,
    );
    // Row 1: c1 (h=20), c2 (h=30) → row height = 30
    // Row 2: c3 (h=25) → row height = 25
    // Total: 30 + 10 + 25 = 65
    expect(result.height).toBe(65);
    expect(result.width).toBe(210);
  });
});

describe('containerPlugin.render', () => {
  it('does nothing with no children', async () => {
    const ctx = makeRenderCtx({ children: [] });
    await expect(containerPlugin.render({ layout: 'horizontal' }, ctx)).resolves.toBeUndefined();
  });

  it('does nothing without renderChild callback', async () => {
    const ctx = makeRenderCtx({ children: [makeChild({ id: 'c1' })] });
    await expect(containerPlugin.render({ layout: 'horizontal' }, ctx)).resolves.toBeUndefined();
  });

  it('renders absolute layout calling renderChild with child x,y', async () => {
    const children = [
      makeChild({ id: 'c1', x: 10, y: 20, width: 100, height: 30 }),
      makeChild({ id: 'c2', x: 50, y: 60, width: 80, height: 25 }),
    ];
    const rendered: { el: Element; offsetX: number; offsetY: number }[] = [];
    const ctx = makeRenderCtx({
      children,
      measureChild: stubMeasureChild,
      renderChild: async (el, offsetX, offsetY) => {
        rendered.push({ el, offsetX, offsetY });
      },
    });

    await containerPlugin.render({ layout: 'absolute' }, ctx);
    expect(rendered).toHaveLength(2);
    expect(rendered[0]!.offsetX).toBe(10);
    expect(rendered[0]!.offsetY).toBe(20);
    expect(rendered[1]!.offsetX).toBe(50);
    expect(rendered[1]!.offsetY).toBe(60);
  });

  it('renders horizontal layout with gap', async () => {
    const children = [
      makeChild({ id: 'c1', width: 100, height: 20 }),
      makeChild({ id: 'c2', width: 80, height: 30 }),
    ];
    const rendered: { el: Element; offsetX: number; offsetY: number }[] = [];
    const ctx = makeRenderCtx({
      children,
      measureChild: stubMeasureChild,
      renderChild: async (el, offsetX, offsetY) => {
        rendered.push({ el, offsetX, offsetY });
      },
      height: 300,
    });

    await containerPlugin.render({ layout: 'horizontal', gap: 10, alignItems: 'start' }, ctx);
    expect(rendered).toHaveLength(2);
    expect(rendered[0]!.offsetX).toBe(0);
    expect(rendered[0]!.offsetY).toBe(0);
    expect(rendered[1]!.offsetX).toBe(110); // 100 + 10 gap
    expect(rendered[1]!.offsetY).toBe(0);
  });

  it('renders vertical layout with gap', async () => {
    const children = [
      makeChild({ id: 'c1', width: 100, height: 20 }),
      makeChild({ id: 'c2', width: 80, height: 30 }),
    ];
    const rendered: { el: Element; offsetX: number; offsetY: number }[] = [];
    const ctx = makeRenderCtx({
      children,
      measureChild: stubMeasureChild,
      renderChild: async (el, offsetX, offsetY) => {
        rendered.push({ el, offsetX, offsetY });
      },
      width: 500,
    });

    await containerPlugin.render({ layout: 'vertical', gap: 5, alignItems: 'start' }, ctx);
    expect(rendered).toHaveLength(2);
    expect(rendered[0]!.offsetX).toBe(0);
    expect(rendered[0]!.offsetY).toBe(0);
    expect(rendered[1]!.offsetX).toBe(0);
    expect(rendered[1]!.offsetY).toBe(25); // 20 + 5 gap
  });

  it('renders grid layout', async () => {
    const children = [
      makeChild({ id: 'c1', width: 100, height: 20 }),
      makeChild({ id: 'c2', width: 100, height: 30 }),
      makeChild({ id: 'c3', width: 100, height: 25 }),
    ];
    const rendered: { el: Element; offsetX: number; offsetY: number }[] = [];
    const ctx = makeRenderCtx({
      children,
      measureChild: stubMeasureChild,
      renderChild: async (el, offsetX, offsetY) => {
        rendered.push({ el, offsetX, offsetY });
      },
      width: 210,
    });

    await containerPlugin.render(
      { layout: 'grid', gridColumns: 2, gap: 10, alignItems: 'start' },
      ctx,
    );
    expect(rendered).toHaveLength(3);
    // Col width = (210 - 10) / 2 = 100
    // Row 1: c1 at (0,0), c2 at (110,0)
    expect(rendered[0]!.offsetX).toBe(0);
    expect(rendered[0]!.offsetY).toBe(0);
    expect(rendered[1]!.offsetX).toBe(110);
    expect(rendered[1]!.offsetY).toBe(0);
    // Row 2: c3 at (0, 30+10=40)
    expect(rendered[2]!.offsetX).toBe(0);
    expect(rendered[2]!.offsetY).toBe(40);
  });

  it('applies center alignment in horizontal layout', async () => {
    const children = [
      makeChild({ id: 'c1', width: 100, height: 20 }),
      makeChild({ id: 'c2', width: 80, height: 10 }),
    ];
    const rendered: { el: Element; offsetX: number; offsetY: number }[] = [];
    const ctx = makeRenderCtx({
      children,
      measureChild: stubMeasureChild,
      renderChild: async (el, offsetX, offsetY) => {
        rendered.push({ el, offsetX, offsetY });
      },
      height: 100,
    });

    await containerPlugin.render({ layout: 'horizontal', alignItems: 'center' }, ctx);
    // Container height = 100, c1 height = 20 → offset = (100-20)/2 = 40
    expect(rendered[0]!.offsetY).toBe(40);
    // c2 height = 10 → offset = (100-10)/2 = 45
    expect(rendered[1]!.offsetY).toBe(45);
  });

  it('applies end alignment in vertical layout', async () => {
    const children = [
      makeChild({ id: 'c1', width: 80, height: 20 }),
      makeChild({ id: 'c2', width: 60, height: 30 }),
    ];
    const rendered: { el: Element; offsetX: number; offsetY: number }[] = [];
    const ctx = makeRenderCtx({
      children,
      measureChild: stubMeasureChild,
      renderChild: async (el, offsetX, offsetY) => {
        rendered.push({ el, offsetX, offsetY });
      },
      width: 200,
    });

    await containerPlugin.render({ layout: 'vertical', alignItems: 'end' }, ctx);
    // Container width = 200, c1 width = 80 → offset = 200-80 = 120
    expect(rendered[0]!.offsetX).toBe(120);
    // c2 width = 60 → offset = 200-60 = 140
    expect(rendered[1]!.offsetX).toBe(140);
  });
});
