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
