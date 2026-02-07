import { describe, it, expect, beforeAll } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import type { PDFFont, PDFPage } from 'pdf-lib';
import { linePlugin } from '../../src/line/line-plugin.js';
import { fontKey } from '../../src/types.js';
import type { MeasureContext, RenderContext, FontMap } from '../../src/types.js';
import type { Style } from '@jsonpdf/core';

let page: PDFPage;
let fonts: FontMap;

const defaultStyle: Style = {
  fontFamily: 'Helvetica',
  fontSize: 12,
  fontWeight: 'normal',
  fontStyle: 'normal',
  color: '#000000',
};

beforeAll(async () => {
  const doc = await PDFDocument.create();
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  page = doc.addPage([612, 792]);
  fonts = new Map();
  fonts.set(fontKey('Helvetica', 'normal', 'normal'), helvetica);
});

function makeMeasureCtx(overrides?: Partial<MeasureContext>): MeasureContext {
  return {
    fonts,
    availableWidth: 500,
    availableHeight: 100,
    resolveStyle: () => defaultStyle,
    elementStyle: defaultStyle,
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
    height: 1,
    ...overrides,
  };
}

describe('linePlugin.measure', () => {
  it('returns full width for horizontal line', async () => {
    const result = await linePlugin.measure(
      { direction: 'horizontal', thickness: 2 },
      makeMeasureCtx(),
    );
    expect(result.width).toBe(500);
    expect(result.height).toBe(2);
  });

  it('returns full height for vertical line', async () => {
    const result = await linePlugin.measure(
      { direction: 'vertical', thickness: 2 },
      makeMeasureCtx(),
    );
    expect(result.width).toBe(2);
    expect(result.height).toBe(100);
  });

  it('uses default thickness', async () => {
    const result = await linePlugin.measure({}, makeMeasureCtx());
    expect(result.height).toBe(1);
  });
});

describe('linePlugin.render', () => {
  it('renders horizontal line without throwing', async () => {
    await expect(
      linePlugin.render({ direction: 'horizontal' }, makeRenderCtx()),
    ).resolves.toBeUndefined();
  });

  it('renders vertical line without throwing', async () => {
    await expect(
      linePlugin.render({ direction: 'vertical' }, makeRenderCtx({ height: 100 })),
    ).resolves.toBeUndefined();
  });

  it('renders dashed line without throwing', async () => {
    await expect(
      linePlugin.render({ dashPattern: [4, 2] }, makeRenderCtx()),
    ).resolves.toBeUndefined();
  });

  it('renders with custom color', async () => {
    await expect(linePlugin.render({ color: '#ff0000' }, makeRenderCtx())).resolves.toBeUndefined();
  });

  it('renders with default props', async () => {
    await expect(linePlugin.render({}, makeRenderCtx())).resolves.toBeUndefined();
  });
});

describe('linePlugin.validate', () => {
  it('returns no errors for valid props', () => {
    expect(linePlugin.validate({ color: '#ff0000', thickness: 2 })).toEqual([]);
  });

  it('returns no errors for empty props', () => {
    expect(linePlugin.validate({})).toEqual([]);
  });

  it('returns error for non-hex color', () => {
    const errors = linePlugin.validate({ color: 'red' });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.path).toBe('/color');
  });

  it('returns error for zero thickness', () => {
    const errors = linePlugin.validate({ thickness: 0 });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.path).toBe('/thickness');
  });

  it('returns error for negative thickness', () => {
    const errors = linePlugin.validate({ thickness: -1 });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.path).toBe('/thickness');
  });

  it('returns multiple errors for invalid color and thickness', () => {
    const errors = linePlugin.validate({ color: 'blue', thickness: -5 });
    expect(errors).toHaveLength(2);
  });
});
