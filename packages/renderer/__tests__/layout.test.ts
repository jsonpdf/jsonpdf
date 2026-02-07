import { describe, it, expect, beforeAll } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { layoutTemplate } from '../src/layout.js';
import {
  PluginRegistry,
  textPlugin,
  linePlugin,
  listPlugin,
  fontKey,
  createImageCache,
} from '@jsonpdf/plugins';
import type { FontMap, Plugin, ImageCache } from '@jsonpdf/plugins';
import { createTemplate, addSection, addBand, addElement, addStyle } from '@jsonpdf/template';
import { createExpressionEngine } from '../src/expression.js';
import type { ExpressionEngine } from '../src/expression.js';

let fonts: FontMap;
let registry: PluginRegistry;
let engine: ExpressionEngine;
let pdfDoc: PDFDocument;
let imageCache: ImageCache;

beforeAll(async () => {
  registry = new PluginRegistry();
  registry.register(textPlugin);
  registry.register(linePlugin);
  registry.register(listPlugin);

  pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  fonts = new Map();
  fonts.set(fontKey('Helvetica', 'normal', 'normal'), helvetica);

  engine = createExpressionEngine();
  imageCache = createImageCache();
});

function getPlugin(type: string): Plugin {
  return registry.get(type);
}

function doLayout(template: ReturnType<typeof createTemplate>, data = {}, totalPagesHint = 0) {
  return layoutTemplate(
    template,
    fonts,
    getPlugin,
    engine,
    data,
    totalPagesHint,
    pdfDoc,
    imageCache,
  );
}

describe('layoutTemplate: backward-compatible body band tests', () => {
  it('returns empty pages for template with no sections', async () => {
    const t = createTemplate();
    const result = await doLayout(t);
    expect(result.pages).toHaveLength(0);
  });

  it('returns empty pages for section with only structural bands', async () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'ph', type: 'pageHeader', height: 50, elements: [] });

    const result = await doLayout(t);
    expect(result.pages).toHaveLength(0);
  });

  it('lays out a single body band', async () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });

    const result = await doLayout(t);
    expect(result.pages).toHaveLength(1);
    expect(result.totalPages).toBe(1);
    // Body band should be in the content bands
    const bodyBands = result.pages[0]!.bands.filter((b) => b.band.type === 'body');
    expect(bodyBands).toHaveLength(1);
    expect(bodyBands[0]!.measuredHeight).toBe(100);
  });

  it('stacks two body bands vertically', async () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 100, elements: [] });
    t = addBand(t, 'sec1', { id: 'b2', type: 'body', height: 50, elements: [] });

    const result = await doLayout(t);
    const bodyBands = result.pages[0]!.bands.filter((b) => b.band.type === 'body');
    expect(bodyBands).toHaveLength(2);
    // Second body band should be offset by first band's height
    expect(bodyBands[1]!.offsetY).toBeGreaterThan(bodyBands[0]!.offsetY);
  });

  it('uses measured height for autoHeight band', async () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', {
      id: 'auto',
      type: 'body',
      height: 20,
      autoHeight: true,
      elements: [],
    });
    t = addElement(t, 'auto', {
      id: 'el1',
      type: 'text',
      x: 0,
      y: 0,
      width: 100,
      height: 20,
      properties: {
        content: 'Short text that will wrap to multiple lines in a very narrow element width',
      },
    });

    const result = await doLayout(t);
    const bodyBands = result.pages[0]!.bands.filter((b) => b.band.type === 'body');
    expect(bodyBands[0]!.measuredHeight).toBeGreaterThanOrEqual(20);
  });
});

describe('layoutTemplate: page headers and footers', () => {
  it('places page header and footer on single page', async () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'ph', type: 'pageHeader', height: 40, elements: [] });
    t = addBand(t, 'sec1', { id: 'body1', type: 'body', height: 100, elements: [] });
    t = addBand(t, 'sec1', { id: 'pf', type: 'pageFooter', height: 30, elements: [] });

    const result = await doLayout(t);
    expect(result.pages).toHaveLength(1);
    const types = result.pages[0]!.bands.map((b) => b.band.type);
    expect(types).toContain('pageHeader');
    expect(types).toContain('pageFooter');
    expect(types).toContain('body');
  });

  it('places page header and footer on every page', async () => {
    // Page height=200, margins=20 each, header=30, footer=20
    // Content area = 200 - 40 - 30 - 20 = 110
    // Two body bands of 80 each = 160, won't fit on one page
    let t = createTemplate({
      page: { width: 200, height: 200, margins: { top: 20, right: 20, bottom: 20, left: 20 } },
    });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'ph', type: 'pageHeader', height: 30, elements: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 80, elements: [] });
    t = addBand(t, 'sec1', { id: 'b2', type: 'body', height: 80, elements: [] });
    t = addBand(t, 'sec1', { id: 'pf', type: 'pageFooter', height: 20, elements: [] });

    const result = await doLayout(t);
    expect(result.totalPages).toBe(2);

    // Both pages should have pageHeader and pageFooter
    for (const page of result.pages) {
      const types = page.bands.map((b) => b.band.type);
      expect(types).toContain('pageHeader');
      expect(types).toContain('pageFooter');
    }
  });

  it('uses lastPageFooter on last page', async () => {
    let t = createTemplate({
      page: { width: 200, height: 200, margins: { top: 20, right: 20, bottom: 20, left: 20 } },
    });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 80, elements: [] });
    t = addBand(t, 'sec1', { id: 'b2', type: 'body', height: 80, elements: [] });
    t = addBand(t, 'sec1', { id: 'pf', type: 'pageFooter', height: 20, elements: [] });
    t = addBand(t, 'sec1', { id: 'lpf', type: 'lastPageFooter', height: 25, elements: [] });

    const result = await doLayout(t);
    expect(result.totalPages).toBe(2);

    // First page: regular footer
    const firstFooters = result.pages[0]!.bands.filter((b) => b.band.type === 'pageFooter');
    expect(firstFooters).toHaveLength(1);

    // Last page: lastPageFooter
    const lastFooters = result.pages[1]!.bands.filter((b) => b.band.type === 'lastPageFooter');
    expect(lastFooters).toHaveLength(1);
  });

  it('reserves space for taller lastPageFooter to prevent content overlap', async () => {
    // Page: 200pt height, 20pt margins, pageFooter=20pt, lastPageFooter=60pt
    // Content area uses max(20, 60) = 60pt for footer reservation
    // Available = 200 - 40 - 60 = 100pt
    // 5 detail bands of 25pt = 125pt → needs 2 pages
    // Without the fix, content area = 200 - 40 - 20 = 140, all 5 bands fit on one page
    let t = createTemplate({
      page: { width: 200, height: 200, margins: { top: 20, right: 20, bottom: 20, left: 20 } },
    });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', {
      id: 'detail',
      type: 'detail',
      height: 25,
      dataSource: 'items',
      elements: [],
    });
    t = addBand(t, 'sec1', { id: 'pf', type: 'pageFooter', height: 20, elements: [] });
    t = addBand(t, 'sec1', { id: 'lpf', type: 'lastPageFooter', height: 60, elements: [] });

    const data = { items: Array.from({ length: 5 }, (_, i) => ({ n: i })) };
    const result = await doLayout(t, data);

    // Should need 2 pages because lastPageFooter is 60pt
    expect(result.totalPages).toBe(2);

    // Last page should have lastPageFooter, not regular footer
    const lastPage = result.pages[result.pages.length - 1]!;
    const lastFooters = lastPage.bands.filter((b) => b.band.type === 'lastPageFooter');
    expect(lastFooters).toHaveLength(1);
  });

  it('uses correct measuredHeight for structural bands', async () => {
    let t = createTemplate({
      page: { width: 300, height: 400, margins: { top: 20, right: 20, bottom: 20, left: 20 } },
    });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'ph', type: 'pageHeader', height: 35, elements: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 50, elements: [] });
    t = addBand(t, 'sec1', { id: 'pf', type: 'pageFooter', height: 25, elements: [] });

    const result = await doLayout(t);
    const page = result.pages[0]!;

    const ph = page.bands.find((b) => b.band.type === 'pageHeader')!;
    const pf = page.bands.find((b) => b.band.type === 'pageFooter')!;

    expect(ph.measuredHeight).toBe(35);
    expect(pf.measuredHeight).toBe(25);
  });
});

describe('layoutTemplate: content overflow and page breaks', () => {
  it('creates new page when content overflows', async () => {
    // Page: 300pt height, 40pt margins = 220pt content area
    // Three body bands of 100pt = 300pt, needs 2 pages
    let t = createTemplate({
      page: { width: 300, height: 300, margins: { top: 40, right: 40, bottom: 40, left: 40 } },
    });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 100, elements: [] });
    t = addBand(t, 'sec1', { id: 'b2', type: 'body', height: 100, elements: [] });
    t = addBand(t, 'sec1', { id: 'b3', type: 'body', height: 100, elements: [] });

    const result = await doLayout(t);
    expect(result.totalPages).toBe(2);
  });

  it('forces page break with pageBreakBefore', async () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 50, elements: [] });
    t = addBand(t, 'sec1', {
      id: 'b2',
      type: 'body',
      height: 50,
      pageBreakBefore: true,
      elements: [],
    });

    const result = await doLayout(t);
    expect(result.totalPages).toBe(2);
  });

  it('does not break on first band with pageBreakBefore', async () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', {
      id: 'b1',
      type: 'body',
      height: 50,
      pageBreakBefore: true,
      elements: [],
    });

    const result = await doLayout(t);
    // First band on first page — no break since cursorY=0
    expect(result.totalPages).toBe(1);
  });

  it('places band taller than content area on its own page', async () => {
    let t = createTemplate({
      page: { width: 200, height: 200, margins: { top: 20, right: 20, bottom: 20, left: 20 } },
    });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'small', type: 'body', height: 50, elements: [] });
    // This band is taller than the 160pt content area
    t = addBand(t, 'sec1', { id: 'huge', type: 'body', height: 200, elements: [] });

    const result = await doLayout(t);
    expect(result.totalPages).toBe(2);
  });
});

describe('layoutTemplate: column headers', () => {
  it('repeats column headers on each page', async () => {
    let t = createTemplate({
      page: { width: 200, height: 200, margins: { top: 20, right: 20, bottom: 20, left: 20 } },
    });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'ch', type: 'columnHeader', height: 20, elements: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 100, elements: [] });
    t = addBand(t, 'sec1', { id: 'b2', type: 'body', height: 100, elements: [] });

    const result = await doLayout(t);
    expect(result.totalPages).toBe(2);

    for (const page of result.pages) {
      const colHeaders = page.bands.filter((b) => b.band.type === 'columnHeader');
      expect(colHeaders).toHaveLength(1);
    }
  });

  it('positions column headers and content bands correctly (no double-counting)', async () => {
    // Page: 300pt height, 20pt margins, pageHeader=30, columnHeader=25
    // Column header should be at offsetY=30 (after page header)
    // First content band should be at offsetY=30+25=55 (after page header + column header)
    let t = createTemplate({
      page: { width: 300, height: 300, margins: { top: 20, right: 20, bottom: 20, left: 20 } },
    });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'ph', type: 'pageHeader', height: 30, elements: [] });
    t = addBand(t, 'sec1', { id: 'ch', type: 'columnHeader', height: 25, elements: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 40, elements: [] });
    t = addBand(t, 'sec1', { id: 'b2', type: 'body', height: 40, elements: [] });

    const result = await doLayout(t);
    const page = result.pages[0]!;

    const ph = page.bands.find((b) => b.band.type === 'pageHeader')!;
    const ch = page.bands.find((b) => b.band.type === 'columnHeader')!;
    const bodyBands = page.bands.filter((b) => b.band.type === 'body');

    expect(ph.offsetY).toBe(0);
    expect(ch.offsetY).toBe(30); // after page header
    expect(bodyBands[0]!.offsetY).toBe(55); // 30 + 25 = after page header + column header
    expect(bodyBands[1]!.offsetY).toBe(95); // 55 + 40 = after first body band
  });

  it('calculates available content height correctly with column headers', async () => {
    // Page: 200pt height, 20pt margins each, column header=20pt
    // Content area = 200 - 40 = 160
    // Available for content = 160 - 20 (column header) = 140
    // 8 detail bands of 20pt = 160pt → needs 2 pages (140pt + 20pt)
    let t = createTemplate({
      page: { width: 200, height: 200, margins: { top: 20, right: 20, bottom: 20, left: 20 } },
    });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'ch', type: 'columnHeader', height: 20, elements: [] });
    t = addBand(t, 'sec1', {
      id: 'detail',
      type: 'detail',
      height: 20,
      dataSource: 'items',
      elements: [],
    });

    // 7 items * 20 = 140 → fits in one page (140 available)
    const data7 = { items: Array.from({ length: 7 }, (_, i) => ({ n: i })) };
    const result7 = await doLayout(t, data7);
    expect(result7.totalPages).toBe(1);

    // 8 items * 20 = 160 → overflows to 2 pages
    const data8 = { items: Array.from({ length: 8 }, (_, i) => ({ n: i })) };
    const result8 = await doLayout(t, data8);
    expect(result8.totalPages).toBe(2);
  });
});

describe('layoutTemplate: detail iteration', () => {
  it('creates instances for each data item', async () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', {
      id: 'detail',
      type: 'detail',
      height: 20,
      dataSource: 'items',
      elements: [],
    });

    const data = { items: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] };
    const result = await doLayout(t, data);
    expect(result.totalPages).toBe(1);

    const detailBands = result.pages[0]!.bands.filter((b) => b.band.type === 'detail');
    expect(detailBands).toHaveLength(3);
  });

  it('spans detail items across pages', async () => {
    // Page: 200pt height, 20pt margins = 160pt content area
    // 10 detail bands of 20pt = 200pt total → 2 pages
    let t = createTemplate({
      page: { width: 200, height: 200, margins: { top: 20, right: 20, bottom: 20, left: 20 } },
    });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', {
      id: 'detail',
      type: 'detail',
      height: 20,
      dataSource: 'items',
      elements: [],
    });

    const data = { items: Array.from({ length: 10 }, (_, i) => ({ name: `Item ${i}` })) };
    const result = await doLayout(t, data);
    expect(result.totalPages).toBe(2);
  });

  it('renders noData band when data is empty', async () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', {
      id: 'detail',
      type: 'detail',
      height: 20,
      dataSource: 'items',
      elements: [],
    });
    t = addBand(t, 'sec1', { id: 'nodata', type: 'noData', height: 50, elements: [] });

    const result = await doLayout(t, { items: [] });
    expect(result.totalPages).toBe(1);
    const noDataBands = result.pages[0]!.bands.filter((b) => b.band.type === 'noData');
    expect(noDataBands).toHaveLength(1);
  });
});

describe('layoutTemplate: multi-section', () => {
  it('creates separate pages for each section', async () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 100, elements: [] });
    t = addSection(t, { id: 'sec2', bands: [] });
    t = addBand(t, 'sec2', { id: 'b2', type: 'body', height: 100, elements: [] });

    const result = await doLayout(t);
    expect(result.totalPages).toBe(2);
    expect(result.pages[0]!.sectionIndex).toBe(0);
    expect(result.pages[1]!.sectionIndex).toBe(1);
  });

  it('assigns sequential pageIndex across sections', async () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 100, elements: [] });
    t = addSection(t, { id: 'sec2', bands: [] });
    t = addBand(t, 'sec2', { id: 'b2', type: 'body', height: 100, elements: [] });

    const result = await doLayout(t);
    expect(result.pages[0]!.pageIndex).toBe(0);
    expect(result.pages[1]!.pageIndex).toBe(1);
  });
});

describe('layoutTemplate: scope', () => {
  it('provides _pageNumber and _totalPages in scope', async () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 100, elements: [] });

    const result = await doLayout(t, {}, 5);
    const scope = result.pages[0]!.bands.find((b) => b.band.type === 'body')!.scope;
    expect(scope['_pageNumber']).toBe(1);
    expect(scope['_totalPages']).toBe(5);
  });

  it('includes data in scope', async () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 100, elements: [] });

    const result = await doLayout(t, { company: 'Acme' });
    const scope = result.pages[0]!.bands.find((b) => b.band.type === 'body')!.scope;
    expect(scope['company']).toBe('Acme');
  });
});

describe('layoutTemplate: background bands', () => {
  it('includes background bands on each page', async () => {
    let t = createTemplate({
      page: { width: 200, height: 200, margins: { top: 20, right: 20, bottom: 20, left: 20 } },
    });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'bg', type: 'background', height: 160, elements: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 100, elements: [] });
    t = addBand(t, 'sec1', { id: 'b2', type: 'body', height: 100, elements: [] });

    const result = await doLayout(t);
    expect(result.totalPages).toBe(2);

    for (const page of result.pages) {
      const bgBands = page.bands.filter((b) => b.band.type === 'background');
      expect(bgBands).toHaveLength(1);
    }
  });
});

describe('layoutTemplate: variable page height (autoHeight)', () => {
  it('fits all content on one page when autoHeight is true', () => {
    // Without autoHeight: 5 bands of 100pt each = 500pt vs 160pt content area → 4 pages
    // With autoHeight: all on one page
    let t = createTemplate({
      page: {
        width: 200,
        height: 200,
        autoHeight: true,
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
      },
    });
    t = addSection(t, { id: 'sec1', bands: [] });
    for (let i = 0; i < 5; i++) {
      t = addBand(t, 'sec1', { id: `b${i}`, type: 'body', height: 100, elements: [] });
    }

    return doLayout(t).then((result) => {
      expect(result.totalPages).toBe(1);
      expect(result.pages[0]!.computedHeight).toBeDefined();
      // 5 * 100 = 500pt content + 40pt margins = 540pt
      expect(result.pages[0]!.computedHeight).toBe(540);
    });
  });

  it('respects minimum page height', () => {
    // Single small band, computedHeight should be at least pageConfig.height
    let t = createTemplate({
      page: {
        width: 200,
        height: 400,
        autoHeight: true,
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
      },
    });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 30, elements: [] });

    return doLayout(t).then((result) => {
      expect(result.totalPages).toBe(1);
      // Content = 30pt + margins = 70pt, but minimum is 400
      expect(result.pages[0]!.computedHeight).toBe(400);
    });
  });

  it('supports mixed sections (one autoHeight, one fixed)', async () => {
    let t = createTemplate({
      page: { width: 200, height: 200, margins: { top: 20, right: 20, bottom: 20, left: 20 } },
    });
    // Section 1: autoHeight
    t = addSection(t, { id: 'sec1', page: { autoHeight: true }, bands: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 300, elements: [] });
    // Section 2: fixed height (no autoHeight)
    t = addSection(t, { id: 'sec2', bands: [] });
    t = addBand(t, 'sec2', { id: 'b2', type: 'body', height: 100, elements: [] });

    const result = await doLayout(t);
    expect(result.totalPages).toBe(2);
    expect(result.pages[0]!.computedHeight).toBeDefined(); // autoHeight
    expect(result.pages[1]!.computedHeight).toBeUndefined(); // fixed
  });

  it('places footer after content with autoHeight', async () => {
    let t = createTemplate({
      page: {
        width: 200,
        height: 200,
        autoHeight: true,
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
      },
    });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 300, elements: [] });
    t = addBand(t, 'sec1', { id: 'pf', type: 'pageFooter', height: 30, elements: [] });

    const result = await doLayout(t);
    expect(result.totalPages).toBe(1);
    const footer = result.pages[0]!.bands.find((b) => b.band.type === 'pageFooter')!;
    // Footer placed right after content: body at offsetY=0, height=300, so footer at 300
    expect(footer.offsetY).toBe(300);
    // computedHeight = margins(40) + body(300) + footer(30) = 370
    expect(result.pages[0]!.computedHeight).toBe(370);
  });

  it('pageBreakBefore still creates new pages with autoHeight', async () => {
    let t = createTemplate({
      page: {
        width: 200,
        height: 200,
        autoHeight: true,
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
      },
    });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 50, elements: [] });
    t = addBand(t, 'sec1', {
      id: 'b2',
      type: 'body',
      height: 50,
      pageBreakBefore: true,
      elements: [],
    });

    const result = await doLayout(t);
    expect(result.totalPages).toBe(2);
    // Both pages should have computedHeight
    expect(result.pages[0]!.computedHeight).toBeDefined();
    expect(result.pages[1]!.computedHeight).toBeDefined();
  });

  it('stacks multiple bands correctly with autoHeight', async () => {
    let t = createTemplate({
      page: {
        width: 200,
        height: 100,
        autoHeight: true,
        margins: { top: 10, right: 10, bottom: 10, left: 10 },
      },
    });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'ph', type: 'pageHeader', height: 20, elements: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 80, elements: [] });
    t = addBand(t, 'sec1', { id: 'b2', type: 'body', height: 80, elements: [] });

    const result = await doLayout(t);
    expect(result.totalPages).toBe(1);
    // pageHeader=20, body1=80 at offset 20, body2=80 at offset 100
    const bodyBands = result.pages[0]!.bands.filter((b) => b.band.type === 'body');
    expect(bodyBands[0]!.offsetY).toBe(20);
    expect(bodyBands[1]!.offsetY).toBe(100);
    // computedHeight = margins(20) + header(20) + body1(80) + body2(80) = 200
    expect(result.pages[0]!.computedHeight).toBe(200);
  });
});

describe('layoutTemplate: multi-column tile mode', () => {
  it('tiles detail bands across 2 columns', async () => {
    // Page: 200 wide, 120 tall, margins 20 each → content height = 80, content width = 160
    // 2 columns, no gap → each column 80pt wide
    // 4 detail items of 40pt each → col 0 fits 2 (80pt), col 1 gets remaining 2
    let t = createTemplate({
      page: { width: 200, height: 120, margins: { top: 20, right: 20, bottom: 20, left: 20 } },
    });
    t = addSection(t, { id: 'sec1', columns: 2, columnGap: 0, bands: [] });
    t = addBand(t, 'sec1', {
      id: 'detail',
      type: 'detail',
      height: 40,
      dataSource: 'items',
      elements: [],
    });

    const data = { items: [{ n: 0 }, { n: 1 }, { n: 2 }, { n: 3 }] };
    const result = await doLayout(t, data);
    expect(result.totalPages).toBe(1);

    const details = result.pages[0]!.bands.filter((b) => b.band.type === 'detail');
    expect(details).toHaveLength(4);

    // First 2 items fill column 0 (offsetX=0), next 2 fill column 1 (offsetX=80)
    expect(details[0]!.columnIndex).toBe(0);
    expect(details[0]!.columnOffsetX).toBe(0);
    expect(details[1]!.columnIndex).toBe(0);
    expect(details[2]!.columnIndex).toBe(1);
    expect(details[2]!.columnOffsetX).toBe(80);
    expect(details[3]!.columnIndex).toBe(1);
  });

  it('triggers page break when all columns overflow', async () => {
    // Content area: 200-40=160 tall, 2 columns
    // 6 items of 40pt each → col 0 gets 4*40=160 (fills), col 1 gets next...
    // Actually col 0 available = 160, col 0 gets items until full
    // Items 0-3 (4*40=160) fill col 0, items 4-5 don't fit in col 0
    // Items 4-5 go to col 1, but let's use 10 items to overflow both columns
    let t = createTemplate({
      page: { width: 200, height: 200, margins: { top: 20, right: 20, bottom: 20, left: 20 } },
    });
    t = addSection(t, { id: 'sec1', columns: 2, columnGap: 0, bands: [] });
    t = addBand(t, 'sec1', {
      id: 'detail',
      type: 'detail',
      height: 40,
      dataSource: 'items',
      elements: [],
    });

    // 160pt available per column, 40pt per item → 4 per column → 8 items per page
    const data = { items: Array.from({ length: 10 }, (_, i) => ({ n: i })) };
    const result = await doLayout(t, data);
    expect(result.totalPages).toBe(2);

    // Page 1: 8 items (4 per column)
    const page1Details = result.pages[0]!.bands.filter((b) => b.band.type === 'detail');
    expect(page1Details).toHaveLength(8);

    // Page 2: 2 remaining items
    const page2Details = result.pages[1]!.bands.filter((b) => b.band.type === 'detail');
    expect(page2Details).toHaveLength(2);
  });

  it('repeats column headers per column per page', async () => {
    let t = createTemplate({
      page: { width: 200, height: 200, margins: { top: 20, right: 20, bottom: 20, left: 20 } },
    });
    t = addSection(t, { id: 'sec1', columns: 2, columnGap: 0, bands: [] });
    t = addBand(t, 'sec1', { id: 'ch', type: 'columnHeader', height: 20, elements: [] });
    t = addBand(t, 'sec1', {
      id: 'detail',
      type: 'detail',
      height: 40,
      dataSource: 'items',
      elements: [],
    });

    const data = { items: Array.from({ length: 4 }, (_, i) => ({ n: i })) };
    const result = await doLayout(t, data);
    expect(result.totalPages).toBe(1);

    // Should have 2 column headers (one per column)
    const colHeaders = result.pages[0]!.bands.filter((b) => b.band.type === 'columnHeader');
    expect(colHeaders).toHaveLength(2);
    expect(colHeaders[0]!.columnIndex).toBe(0);
    expect(colHeaders[1]!.columnIndex).toBe(1);
  });

  it('places column footers per column', async () => {
    let t = createTemplate({
      page: { width: 200, height: 200, margins: { top: 20, right: 20, bottom: 20, left: 20 } },
    });
    t = addSection(t, { id: 'sec1', columns: 2, columnGap: 0, bands: [] });
    t = addBand(t, 'sec1', { id: 'cf', type: 'columnFooter', height: 20, elements: [] });
    t = addBand(t, 'sec1', {
      id: 'detail',
      type: 'detail',
      height: 40,
      dataSource: 'items',
      elements: [],
    });

    const data = { items: [{ n: 0 }] };
    const result = await doLayout(t, data);
    expect(result.totalPages).toBe(1);

    const colFooters = result.pages[0]!.bands.filter((b) => b.band.type === 'columnFooter');
    expect(colFooters).toHaveLength(2);
    expect(colFooters[0]!.columnIndex).toBe(0);
    expect(colFooters[1]!.columnIndex).toBe(1);
  });

  it('spans title bands full width above columns', async () => {
    // Page 120 tall, margins 20 → content 80pt
    // Title 30pt reduces available to 50pt for columns
    // 2 items of 40pt → col 0 fits 1 (40 < 50), col 1 gets item 2
    let t = createTemplate({
      page: { width: 200, height: 120, margins: { top: 20, right: 20, bottom: 20, left: 20 } },
    });
    t = addSection(t, { id: 'sec1', columns: 2, columnGap: 0, bands: [] });
    t = addBand(t, 'sec1', { id: 'title', type: 'title', height: 30, elements: [] });
    t = addBand(t, 'sec1', {
      id: 'detail',
      type: 'detail',
      height: 40,
      dataSource: 'items',
      elements: [],
    });

    const data = { items: [{ n: 0 }, { n: 1 }] };
    const result = await doLayout(t, data);
    expect(result.totalPages).toBe(1);

    const titleBand = result.pages[0]!.bands.find((b) => b.band.type === 'title')!;
    expect(titleBand.columnIndex).toBeUndefined(); // full-width
    expect(titleBand.columnOffsetX).toBeUndefined();

    const details = result.pages[0]!.bands.filter((b) => b.band.type === 'detail');
    expect(details[0]!.columnIndex).toBe(0);
    expect(details[1]!.columnIndex).toBe(1);
  });

  it('spans summary bands full width after columns', async () => {
    let t = createTemplate({
      page: { width: 200, height: 400, margins: { top: 20, right: 20, bottom: 20, left: 20 } },
    });
    t = addSection(t, { id: 'sec1', columns: 2, columnGap: 0, bands: [] });
    t = addBand(t, 'sec1', {
      id: 'detail',
      type: 'detail',
      height: 40,
      dataSource: 'items',
      elements: [],
    });
    t = addBand(t, 'sec1', { id: 'summary', type: 'summary', height: 30, elements: [] });

    const data = { items: [{ n: 0 }, { n: 1 }] };
    const result = await doLayout(t, data);
    expect(result.totalPages).toBe(1);

    const summaryBand = result.pages[0]!.bands.find((b) => b.band.type === 'summary')!;
    expect(summaryBand.columnIndex).toBeUndefined(); // full-width

    // Summary should be placed after the tallest column
    const details = result.pages[0]!.bands.filter((b) => b.band.type === 'detail');
    const maxDetailBottom = Math.max(...details.map((d) => d.offsetY + d.measuredHeight));
    expect(summaryBand.offsetY).toBeGreaterThanOrEqual(maxDetailBottom);
  });

  it('supports asymmetric column widths', async () => {
    // contentWidth=160, columns=2, gap=0, ratios=[1, 3] → widths=[40, 120]
    // Page 120 tall, margins 20 → content 80pt, 2 items of 40pt fills col 0, overflows to col 1
    let t = createTemplate({
      page: { width: 200, height: 120, margins: { top: 20, right: 20, bottom: 20, left: 20 } },
    });
    t = addSection(t, { id: 'sec1', columns: 2, columnGap: 0, columnWidths: [1, 3], bands: [] });
    t = addBand(t, 'sec1', {
      id: 'detail',
      type: 'detail',
      height: 50,
      dataSource: 'items',
      elements: [],
    });

    const data = { items: [{ n: 0 }, { n: 1 }] };
    const result = await doLayout(t, data);

    const details = result.pages[0]!.bands.filter((b) => b.band.type === 'detail');
    expect(details[0]!.columnWidth).toBe(40);
    expect(details[0]!.columnIndex).toBe(0);
    expect(details[1]!.columnWidth).toBe(120);
    expect(details[1]!.columnIndex).toBe(1);
    expect(details[1]!.columnOffsetX).toBe(40);
  });

  it('renders noData band full-width when data is empty with columns', async () => {
    let t = createTemplate({
      page: { width: 200, height: 400, margins: { top: 20, right: 20, bottom: 20, left: 20 } },
    });
    t = addSection(t, { id: 'sec1', columns: 2, columnGap: 0, bands: [] });
    t = addBand(t, 'sec1', {
      id: 'detail',
      type: 'detail',
      height: 40,
      dataSource: 'items',
      elements: [],
    });
    t = addBand(t, 'sec1', { id: 'nodata', type: 'noData', height: 50, elements: [] });

    const result = await doLayout(t, { items: [] });
    expect(result.totalPages).toBe(1);

    const noDataBand = result.pages[0]!.bands.find((b) => b.band.type === 'noData')!;
    expect(noDataBand.columnIndex).toBeUndefined(); // full-width
  });

  it('handles pageBreakBefore within column region', async () => {
    // Use groupHeader with pageBreakBefore to force a break within the column region
    let t = createTemplate({
      page: { width: 200, height: 400, margins: { top: 20, right: 20, bottom: 20, left: 20 } },
    });
    t = addSection(t, { id: 'sec1', columns: 2, columnGap: 0, bands: [] });
    t = addBand(t, 'sec1', {
      id: 'detail',
      type: 'detail',
      height: 40,
      dataSource: 'items',
      groupBy: 'group',
      elements: [],
    });
    t = addBand(t, 'sec1', {
      id: 'gh',
      type: 'groupHeader',
      height: 30,
      pageBreakBefore: true,
      elements: [],
    });

    const data = {
      items: [
        { group: 'A', n: 0 },
        { group: 'A', n: 1 },
        { group: 'B', n: 2 },
        { group: 'B', n: 3 },
      ],
    };
    const result = await doLayout(t, data);
    // Group A on page 1, Group B forces page break (pageBreakBefore on groupHeader)
    // But first groupHeader doesn't break (no content yet)
    expect(result.totalPages).toBe(2);
  });

  it('places groupHeader and groupFooter in columns', async () => {
    let t = createTemplate({
      page: { width: 200, height: 400, margins: { top: 20, right: 20, bottom: 20, left: 20 } },
    });
    t = addSection(t, { id: 'sec1', columns: 2, columnGap: 0, bands: [] });
    t = addBand(t, 'sec1', {
      id: 'detail',
      type: 'detail',
      height: 30,
      dataSource: 'items',
      groupBy: 'group',
      elements: [],
    });
    t = addBand(t, 'sec1', { id: 'gh', type: 'groupHeader', height: 20, elements: [] });
    t = addBand(t, 'sec1', { id: 'gf', type: 'groupFooter', height: 20, elements: [] });

    const data = {
      items: [
        { group: 'A', n: 0 },
        { group: 'B', n: 1 },
      ],
    };
    const result = await doLayout(t, data);

    const ghBands = result.pages[0]!.bands.filter((b) => b.band.type === 'groupHeader');
    const gfBands = result.pages[0]!.bands.filter((b) => b.band.type === 'groupFooter');
    expect(ghBands.length).toBeGreaterThanOrEqual(1);
    expect(gfBands.length).toBeGreaterThanOrEqual(1);
    // All group bands should have columnIndex set
    for (const b of [...ghBands, ...gfBands]) {
      expect(b.columnIndex).toBeDefined();
    }
  });

  it('treats columns=1 as single-column (no columnIndex)', async () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', columns: 1, bands: [] });
    t = addBand(t, 'sec1', {
      id: 'detail',
      type: 'detail',
      height: 40,
      dataSource: 'items',
      elements: [],
    });

    const data = { items: [{ n: 0 }] };
    const result = await doLayout(t, data);

    const details = result.pages[0]!.bands.filter((b) => b.band.type === 'detail');
    expect(details[0]!.columnIndex).toBeUndefined();
  });

  it('accounts for columnGap in column widths', async () => {
    // contentWidth=160, columns=2, gap=20 → each column = (160-20)/2 = 70
    // Page 120 tall, margins 20 → 80pt available, items of 50pt → 1 per column
    let t = createTemplate({
      page: { width: 200, height: 120, margins: { top: 20, right: 20, bottom: 20, left: 20 } },
    });
    t = addSection(t, { id: 'sec1', columns: 2, columnGap: 20, bands: [] });
    t = addBand(t, 'sec1', {
      id: 'detail',
      type: 'detail',
      height: 50,
      dataSource: 'items',
      elements: [],
    });

    const data = { items: [{ n: 0 }, { n: 1 }] };
    const result = await doLayout(t, data);

    const details = result.pages[0]!.bands.filter((b) => b.band.type === 'detail');
    expect(details[0]!.columnWidth).toBe(70);
    expect(details[0]!.columnOffsetX).toBe(0);
    expect(details[1]!.columnWidth).toBe(70);
    expect(details[1]!.columnOffsetX).toBe(90); // 70 + 20 gap
  });
});

describe('layoutTemplate: title and summary', () => {
  it('places title band in content', async () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'title', type: 'title', height: 50, elements: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 100, elements: [] });

    const result = await doLayout(t);
    const types = result.pages[0]!.bands.map((b) => b.band.type);
    expect(types).toContain('title');
  });

  it('places summary band after body', async () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 100, elements: [] });
    t = addBand(t, 'sec1', { id: 'summary', type: 'summary', height: 50, elements: [] });

    const result = await doLayout(t);
    const types = result.pages[0]!.bands.map((b) => b.band.type);
    const bodyIdx = types.indexOf('body');
    const summaryIdx = types.indexOf('summary');
    expect(summaryIdx).toBeGreaterThan(bodyIdx);
  });
});
