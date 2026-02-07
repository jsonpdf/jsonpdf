import { describe, it, expect, beforeAll, vi } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';

import type { Style } from '@jsonpdf/core';
import { barcodePlugin } from '../../src/barcode/barcode-plugin.js';
import type { BarcodeProps } from '../../src/barcode/barcode-types.js';
import {
  generateBarcode,
  createBarcodeCache,
  toBwipColor,
} from '../../src/barcode/barcode-generator.js';
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

describe('barcodePlugin.resolveProps', () => {
  it('merges with defaults', () => {
    const props = barcodePlugin.resolveProps({
      value: 'test',
      format: 'qrcode',
    });
    expect(props.barColor).toBe('#000000');
    expect(props.backgroundColor).toBe('#FFFFFF');
    expect(props.scale).toBe(3);
    expect(props.moduleHeight).toBe(10);
    expect(props.padding).toBe(2);
    expect(props.includeText).toBe(false);
  });

  it('preserves explicit values', () => {
    const props = barcodePlugin.resolveProps({
      value: 'test',
      format: 'code128',
      barColor: '#FF0000',
      scale: 5,
      includeText: true,
    });
    expect(props.format).toBe('code128');
    expect(props.barColor).toBe('#FF0000');
    expect(props.scale).toBe(5);
    expect(props.includeText).toBe(true);
  });
});

// ── validate ──

describe('barcodePlugin.validate', () => {
  it('returns no errors for valid props', () => {
    const errors = barcodePlugin.validate({
      value: 'Hello World',
      format: 'qrcode',
    } as BarcodeProps);
    expect(errors).toEqual([]);
  });

  it('returns error for empty value', () => {
    const errors = barcodePlugin.validate({
      value: '',
      format: 'qrcode',
    } as BarcodeProps);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].path).toBe('/value');
  });

  it('returns error for invalid format', () => {
    const errors = barcodePlugin.validate({
      value: 'test',
      format: 'invalidformat' as BarcodeProps['format'],
    } as BarcodeProps);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].path).toBe('/format');
  });

  it('returns error for non-hex barColor', () => {
    const errors = barcodePlugin.validate({
      value: 'test',
      format: 'qrcode',
      barColor: 'red',
    } as BarcodeProps);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].path).toBe('/barColor');
  });

  it('returns multiple errors', () => {
    const errors = barcodePlugin.validate({
      value: '',
      format: 'invalidformat' as BarcodeProps['format'],
      backgroundColor: 'white',
    } as BarcodeProps);
    expect(errors.length).toBe(3);
    const paths = errors.map((e) => e.path);
    expect(paths).toContain('/value');
    expect(paths).toContain('/format');
    expect(paths).toContain('/backgroundColor');
  });
});

// ── toBwipColor ──

describe('toBwipColor', () => {
  it('strips # from 6-char hex', () => {
    expect(toBwipColor('#ff0000')).toBe('ff0000');
    expect(toBwipColor('#FFFFFF')).toBe('FFFFFF');
  });

  it('expands 3-char hex', () => {
    expect(toBwipColor('#f00')).toBe('ff0000');
    expect(toBwipColor('#abc')).toBe('aabbcc');
  });

  it('handles hex without #', () => {
    expect(toBwipColor('ff0000')).toBe('ff0000');
  });
});

// ── barcode generator ──

describe('generateBarcode', () => {
  it('generates QR code PNG data URI', async () => {
    const cache = createBarcodeCache();
    const dataUri = await generateBarcode(
      { value: 'Hello World', format: 'qrcode', scale: 2, padding: 1 } as BarcodeProps,
      cache,
    );
    expect(dataUri).toMatch(/^data:image\/png;base64,/);
    // Should have cached it
    expect(cache.size).toBe(1);
  });

  it('generates Code128 PNG data URI', async () => {
    const cache = createBarcodeCache();
    const dataUri = await generateBarcode(
      {
        value: 'ABC-123',
        format: 'code128',
        scale: 2,
        moduleHeight: 8,
        padding: 1,
      } as BarcodeProps,
      cache,
    );
    expect(dataUri).toMatch(/^data:image\/png;base64,/);
  });

  it('throws descriptive error for invalid value', async () => {
    const cache = createBarcodeCache();
    await expect(
      generateBarcode(
        { value: 'not-valid-for-ean', format: 'ean13', scale: 2, padding: 1 } as BarcodeProps,
        cache,
      ),
    ).rejects.toThrow(/Barcode generation failed/);
  });

  it('caches identical requests', async () => {
    const cache = createBarcodeCache();
    const props = {
      value: 'CacheTest',
      format: 'qrcode',
      scale: 2,
      padding: 1,
    } as BarcodeProps;
    const uri1 = await generateBarcode(props, cache);
    const uri2 = await generateBarcode(props, cache);
    expect(uri1).toBe(uri2);
    expect(cache.size).toBe(1);
  });
});

// ── measure ──

describe('barcodePlugin.measure', () => {
  it('returns available dimensions for QR code', async () => {
    const ctx = makeMeasureCtx();
    const result = await barcodePlugin.measure(
      { value: 'Hello', format: 'qrcode' } as BarcodeProps,
      ctx,
    );
    expect(result.width).toBe(200);
    expect(result.height).toBe(200);
  });

  it('returns zero dimensions for empty value', async () => {
    const ctx = makeMeasureCtx();
    const result = await barcodePlugin.measure(
      { value: '', format: 'qrcode' } as BarcodeProps,
      ctx,
    );
    expect(result.width).toBe(0);
    expect(result.height).toBe(0);
  });
});

// ── render ──

describe('barcodePlugin.render', () => {
  it('renders QR code via drawImage', async () => {
    const ctx = makeRenderCtx();
    const spy = vi.spyOn(ctx.page, 'drawImage');
    await barcodePlugin.render({ value: 'Hello QR', format: 'qrcode' } as BarcodeProps, ctx);
    expect(spy).toHaveBeenCalledOnce();
    const args = spy.mock.calls[0][1];
    expect(args).toBeDefined();
    expect(args!.width).toBeGreaterThan(0);
    expect(args!.height).toBeGreaterThan(0);
    spy.mockRestore();
  });

  it('renders Code128 with includeText', async () => {
    const ctx = makeRenderCtx();
    const spy = vi.spyOn(ctx.page, 'drawImage');
    await barcodePlugin.render(
      {
        value: 'SKU-001',
        format: 'code128',
        includeText: true,
        moduleHeight: 8,
      } as BarcodeProps,
      ctx,
    );
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it('skips render for empty value', async () => {
    const ctx = makeRenderCtx();
    const spy = vi.spyOn(ctx.page, 'drawImage');
    await barcodePlugin.render({ value: '', format: 'qrcode' } as BarcodeProps, ctx);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
