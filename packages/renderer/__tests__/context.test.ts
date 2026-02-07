import { describe, it, expect, beforeAll } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import type { PDFFont, PDFPage } from 'pdf-lib';
import { createMeasureContext, createRenderContext } from '../src/context.js';
import { fontKey, createImageCache } from '@jsonpdf/plugins';
import type { FontMap, ImageCache } from '@jsonpdf/plugins';
import type { Element, Style } from '@jsonpdf/core';

let fonts: FontMap;
let page: PDFPage;
let pdfDoc: PDFDocument;
let imageCache: ImageCache;

const styles: Record<string, Style> = {
  heading: { fontSize: 24, fontWeight: 'bold' },
  padded: { fontSize: 12, padding: 10 },
  sidePadded: { fontSize: 12, padding: { top: 5, right: 10, bottom: 15, left: 20 } },
};

function makeElement(overrides?: Partial<Element>): Element {
  return {
    id: 'el1',
    type: 'text',
    x: 50,
    y: 30,
    width: 200,
    height: 100,
    properties: { content: 'test' },
    ...overrides,
  };
}

beforeAll(async () => {
  pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  page = pdfDoc.addPage([612, 792]);
  fonts = new Map();
  fonts.set(fontKey('Helvetica', 'normal', 'normal'), helvetica);
  fonts.set(fontKey('Helvetica', 'bold', 'normal'), helveticaBold);
  imageCache = createImageCache();
});

describe('createMeasureContext', () => {
  it('creates context with correct availableWidth and height', () => {
    const el = makeElement();
    const ctx = createMeasureContext(el, fonts, {}, pdfDoc, imageCache);
    expect(ctx.availableWidth).toBe(200);
    expect(ctx.availableHeight).toBe(100);
    expect(ctx.fonts).toBe(fonts);
  });

  it('applies padding to available dimensions', () => {
    const el = makeElement({ styleOverrides: { padding: 10 } });
    const ctx = createMeasureContext(el, fonts, {}, pdfDoc, imageCache);
    expect(ctx.availableWidth).toBe(180); // 200 - 10 - 10
    expect(ctx.availableHeight).toBe(80); // 100 - 10 - 10
  });

  it('applies named style with padding', () => {
    const el = makeElement({ style: 'padded' });
    const ctx = createMeasureContext(el, fonts, styles, pdfDoc, imageCache);
    expect(ctx.availableWidth).toBe(180);
    expect(ctx.availableHeight).toBe(80);
  });

  it('applies asymmetric padding', () => {
    const el = makeElement({ style: 'sidePadded' });
    const ctx = createMeasureContext(el, fonts, styles, pdfDoc, imageCache);
    expect(ctx.availableWidth).toBe(170); // 200 - 20 - 10
    expect(ctx.availableHeight).toBe(80); // 100 - 5 - 15
  });

  it('resolves named styles via resolveStyle', () => {
    const el = makeElement();
    const ctx = createMeasureContext(el, fonts, styles, pdfDoc, imageCache);
    const resolved = ctx.resolveStyle('heading');
    expect(resolved.fontSize).toBe(24);
    expect(resolved.fontWeight).toBe('bold');
    // Defaults should be present
    expect(resolved.fontFamily).toBe('Helvetica');
  });

  it('resolves element style with overrides', () => {
    const el = makeElement({ style: 'heading', styleOverrides: { color: '#ff0000' } });
    const ctx = createMeasureContext(el, fonts, styles, pdfDoc, imageCache);
    expect(ctx.elementStyle.fontSize).toBe(24);
    expect(ctx.elementStyle.color).toBe('#ff0000');
  });

  it('includes pdfDoc and imageCache', () => {
    const el = makeElement();
    const ctx = createMeasureContext(el, fonts, {}, pdfDoc, imageCache);
    expect(ctx.pdfDoc).toBe(pdfDoc);
    expect(ctx.imageCache).toBe(imageCache);
  });
});

describe('createRenderContext', () => {
  it('creates context with pdf-lib coordinates', () => {
    const el = makeElement();
    const ctx = createRenderContext(el, fonts, {}, page, 0, 792, 40, 40, pdfDoc, imageCache);
    // templateToPdf: x = 40 + 50 = 90, y = 792 - 40 - (0 + 30) = 722
    expect(ctx.x).toBe(90);
    expect(ctx.y).toBe(722);
    expect(ctx.width).toBe(200);
    expect(ctx.height).toBe(100);
    expect(ctx.page).toBe(page);
  });

  it('applies padding to render coordinates', () => {
    const el = makeElement({ styleOverrides: { padding: 10 } });
    const ctx = createRenderContext(el, fonts, {}, page, 0, 792, 40, 40, pdfDoc, imageCache);
    // x += padding.left, y -= padding.top
    expect(ctx.x).toBe(100); // 90 + 10
    expect(ctx.y).toBe(712); // 722 - 10
    expect(ctx.width).toBe(180);
    expect(ctx.height).toBe(80);
  });

  it('uses measuredHeight when provided', () => {
    const el = makeElement();
    const ctx = createRenderContext(el, fonts, {}, page, 0, 792, 40, 40, pdfDoc, imageCache, 150);
    expect(ctx.height).toBe(150);
  });

  it('accounts for band offsetY', () => {
    const el = makeElement();
    const ctx = createRenderContext(el, fonts, {}, page, 100, 792, 40, 40, pdfDoc, imageCache);
    // y = 792 - 40 - (100 + 30) = 622
    expect(ctx.y).toBe(622);
  });

  it('uses measuredHeight with padding applied', () => {
    const el = makeElement({ styleOverrides: { padding: 10 } });
    const ctx = createRenderContext(el, fonts, {}, page, 0, 792, 40, 40, pdfDoc, imageCache, 200);
    // measuredHeight=200, padding top=10, bottom=10 → height = 200-20 = 180
    expect(ctx.height).toBe(180);
    // width still = 200 - 10 - 10 = 180
    expect(ctx.width).toBe(180);
  });
});
