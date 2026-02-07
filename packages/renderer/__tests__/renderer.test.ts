import { describe, it, expect } from 'vitest';
import { PDFDocument, PDFName, PDFDict, PDFNumber, PDFArray } from 'pdf-lib';
import { renderPdf } from '../src/renderer.js';
import { createTemplate, addSection, addBand, addElement, addStyle } from '@jsonpdf/template';

function buildSimpleTemplate() {
  let t = createTemplate({ name: 'Simple Test' });
  t = addSection(t, { id: 'sec1', bands: [] });
  t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
  t = addElement(t, 'band1', {
    id: 'el1',
    type: 'text',
    x: 0,
    y: 0,
    width: 200,
    height: 20,
    properties: { content: 'Hello World' },
  });
  return t;
}

describe('renderPdf', () => {
  it('renders a simple template to valid PDF bytes', async () => {
    const result = await renderPdf(buildSimpleTemplate());
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.bytes.length).toBeGreaterThan(0);
    expect(result.pageCount).toBe(1);

    const header = new TextDecoder().decode(result.bytes.slice(0, 5));
    expect(header).toBe('%PDF-');
  });

  it('renders with skipValidation', async () => {
    const result = await renderPdf(buildSimpleTemplate(), { skipValidation: true });
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it('throws for invalid template', async () => {
    const t = createTemplate({ name: '' });
    await expect(renderPdf(t)).rejects.toThrow('validation failed');
  });

  it('renders template with styled text', async () => {
    let t = createTemplate({ name: 'Styled' });
    t = addStyle(t, 'heading', { fontSize: 24, fontWeight: 'bold' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'band1', {
      id: 'title',
      type: 'text',
      x: 0,
      y: 0,
      width: 400,
      height: 30,
      style: 'heading',
      properties: { content: 'Styled Heading' },
    });

    const result = await renderPdf(t);
    expect(result.pageCount).toBe(1);
  });

  it('renders band background color', async () => {
    let t = createTemplate({ name: 'BG Color' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', {
      id: 'band1',
      type: 'body',
      height: 50,
      backgroundColor: '#2c3e50',
      elements: [],
    });
    t = addElement(t, 'band1', {
      id: 'el1',
      type: 'text',
      x: 10,
      y: 10,
      width: 200,
      height: 20,
      styleOverrides: { color: '#ffffff' },
      properties: { content: 'White on dark' },
    });

    const result = await renderPdf(t);
    expect(result.pageCount).toBe(1);
  });

  it('renders empty template (no bands) with 0 pages', async () => {
    let t = createTemplate({ name: 'Empty' });
    t = addSection(t, { id: 'sec1', bands: [] });
    const result = await renderPdf(t);
    expect(result.pageCount).toBe(0);
  });

  it('throws for element with invalid plugin properties', async () => {
    let t = createTemplate({ name: 'Bad Props' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'band1', {
      id: 'bad-line',
      type: 'line',
      x: 0,
      y: 0,
      width: 200,
      height: 1,
      properties: { color: 'not-a-hex-color', thickness: -5 },
    });

    await expect(renderPdf(t)).rejects.toThrow('Invalid properties for line element "bad-line"');
  });
});

describe('renderPdf: data binding', () => {
  it('resolves Liquid expressions in text content', async () => {
    let t = createTemplate({ name: 'Data Binding' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'b1', {
      id: 'el1',
      type: 'text',
      x: 0,
      y: 0,
      width: 200,
      height: 20,
      properties: { content: 'Hello {{ name }}' },
    });

    const result = await renderPdf(t, { data: { name: 'World' } });
    expect(result.pageCount).toBe(1);
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it('validates data against dataSchema', async () => {
    let t = createTemplate({ name: 'Schema Validation' });
    // Override dataSchema with required fields
    t = {
      ...t,
      dataSchema: {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      },
    };
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'b1', {
      id: 'el1',
      type: 'text',
      x: 0,
      y: 0,
      width: 200,
      height: 20,
      properties: { content: '{{ name }}' },
    });

    // Valid data
    const result = await renderPdf(t, { data: { name: 'Test' } });
    expect(result.pageCount).toBe(1);

    // Invalid data (missing required field)
    await expect(renderPdf(t, { data: {} })).rejects.toThrow('Data validation failed');
  });

  it('skips element when condition is false', async () => {
    let t = createTemplate({ name: 'Conditional' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'b1', {
      id: 'el1',
      type: 'text',
      x: 0,
      y: 0,
      width: 200,
      height: 20,
      condition: 'showText',
      properties: { content: 'Conditional text' },
    });

    // Element condition false — should still render page (just skip element)
    const result = await renderPdf(t, { data: { showText: false } });
    expect(result.pageCount).toBe(1);
  });
});

describe('renderPdf: multi-page', () => {
  it('renders detail bands across multiple pages', async () => {
    let t = createTemplate({
      name: 'Multi-Page Detail',
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
    t = addElement(t, 'detail', {
      id: 'item-text',
      type: 'text',
      x: 0,
      y: 0,
      width: 160,
      height: 20,
      properties: { content: '{{ item.name }}' },
    });

    const data = {
      items: Array.from({ length: 20 }, (_, i) => ({ name: `Item ${i + 1}` })),
    };
    const result = await renderPdf(t, { data });
    expect(result.pageCount).toBeGreaterThan(1);

    const header = new TextDecoder().decode(result.bytes.slice(0, 5));
    expect(header).toBe('%PDF-');
  });

  it('renders multi-section template', async () => {
    let t = createTemplate({ name: 'Multi-Section' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'b1', {
      id: 'el1',
      type: 'text',
      x: 0,
      y: 0,
      width: 200,
      height: 20,
      properties: { content: 'Section 1' },
    });

    t = addSection(t, { id: 'sec2', bands: [] });
    t = addBand(t, 'sec2', { id: 'b2', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'b2', {
      id: 'el2',
      type: 'text',
      x: 0,
      y: 0,
      width: 200,
      height: 20,
      properties: { content: 'Section 2' },
    });

    const result = await renderPdf(t);
    expect(result.pageCount).toBe(2);
  });
});

describe('renderPdf: element rotation', () => {
  it('renders element with rotation without error', async () => {
    let t = createTemplate({ name: 'Rotation' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 200, elements: [] });
    t = addElement(t, 'b1', {
      id: 'rotated',
      type: 'text',
      x: 50,
      y: 50,
      width: 200,
      height: 30,
      rotation: 45,
      properties: { content: 'Rotated Text' },
    });

    const result = await renderPdf(t);
    expect(result.pageCount).toBe(1);
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it('renders with rotation=0 (no transform)', async () => {
    let t = createTemplate({ name: 'No Rotation' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'b1', {
      id: 'el1',
      type: 'text',
      x: 0,
      y: 0,
      width: 200,
      height: 20,
      rotation: 0,
      properties: { content: 'No rotation' },
    });

    const result = await renderPdf(t);
    expect(result.pageCount).toBe(1);
  });

  it('renders with negative rotation', async () => {
    let t = createTemplate({ name: 'Negative Rotation' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 200, elements: [] });
    t = addElement(t, 'b1', {
      id: 'el1',
      type: 'text',
      x: 50,
      y: 50,
      width: 200,
      height: 30,
      rotation: -90,
      properties: { content: 'Rotated -90' },
    });

    const result = await renderPdf(t);
    expect(result.pageCount).toBe(1);
  });

  it('applies rotation to shape element', async () => {
    let t = createTemplate({ name: 'Rotated Shape' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 200, elements: [] });
    t = addElement(t, 'b1', {
      id: 'rotated-rect',
      type: 'shape',
      x: 50,
      y: 50,
      width: 100,
      height: 50,
      rotation: 30,
      properties: { shapeType: 'rect', fill: '#ff0000' },
    });

    const result = await renderPdf(t);
    expect(result.pageCount).toBe(1);
    expect(result.bytes.length).toBeGreaterThan(0);
  });
});

describe('renderPdf: bookmarks', () => {
  it('creates PDF outline from section bookmark', async () => {
    let t = createTemplate({ name: 'Section Bookmark' });
    t = addSection(t, { id: 'sec1', bands: [], bookmark: 'Introduction' });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'b1', {
      id: 'el1',
      type: 'text',
      x: 0,
      y: 0,
      width: 200,
      height: 20,
      properties: { content: 'Hello' },
    });

    const result = await renderPdf(t);
    expect(result.pageCount).toBe(1);

    // Verify the PDF has an outline by re-loading
    const loadedDoc = await PDFDocument.load(result.bytes);
    const outlineRef = loadedDoc.catalog.get(PDFName.of('Outlines'));
    expect(outlineRef).toBeDefined();
  });

  it('creates PDF outline from band bookmark', async () => {
    let t = createTemplate({ name: 'Band Bookmark' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', {
      id: 'b1',
      type: 'body',
      height: 100,
      elements: [],
      bookmark: 'My Band',
    });
    t = addElement(t, 'b1', {
      id: 'el1',
      type: 'text',
      x: 0,
      y: 0,
      width: 200,
      height: 20,
      properties: { content: 'Hello' },
    });

    const result = await renderPdf(t);
    const loadedDoc = await PDFDocument.load(result.bytes);
    const outlineRef = loadedDoc.catalog.get(PDFName.of('Outlines'));
    expect(outlineRef).toBeDefined();
  });

  it('resolves bookmark expressions with data', async () => {
    let t = createTemplate({ name: 'Bookmark Expression' });
    t = addSection(t, { id: 'sec1', bands: [], bookmark: '{{ title }}' });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'b1', {
      id: 'el1',
      type: 'text',
      x: 0,
      y: 0,
      width: 200,
      height: 20,
      properties: { content: 'Content' },
    });

    const result = await renderPdf(t, { data: { title: 'Dynamic Title' } });
    expect(result.pageCount).toBe(1);
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it('has no outline when no bookmarks present', async () => {
    const result = await renderPdf(buildSimpleTemplate());
    const loadedDoc = await PDFDocument.load(result.bytes);
    const outlineRef = loadedDoc.catalog.get(PDFName.of('Outlines'));
    expect(outlineRef).toBeUndefined();
  });
});

describe('renderPdf: cross-references', () => {
  it('resolves {{ anchor | ref }} to page number', async () => {
    let t = createTemplate({ name: 'Cross Ref' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'b1', {
      id: 'el1',
      type: 'text',
      x: 0,
      y: 0,
      width: 200,
      height: 20,
      anchor: 'myAnchor',
      properties: { content: 'Anchored text' },
    });
    t = addElement(t, 'b1', {
      id: 'el2',
      type: 'text',
      x: 0,
      y: 30,
      width: 200,
      height: 20,
      properties: { content: 'See page {{ "myAnchor" | ref }}' },
    });

    const result = await renderPdf(t);
    expect(result.pageCount).toBe(1);
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it('resolves missing anchor to ??', async () => {
    let t = createTemplate({ name: 'Missing Ref' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'b1', {
      id: 'el1',
      type: 'text',
      x: 0,
      y: 0,
      width: 200,
      height: 20,
      properties: { content: 'See page {{ "nonexistent" | ref }}' },
    });

    const result = await renderPdf(t);
    expect(result.pageCount).toBe(1);
  });

  it('resolves band-level anchor', async () => {
    let t = createTemplate({ name: 'Band Anchor' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', {
      id: 'b1',
      type: 'body',
      height: 100,
      anchor: 'bandRef',
      elements: [],
    });
    t = addElement(t, 'b1', {
      id: 'el1',
      type: 'text',
      x: 0,
      y: 0,
      width: 200,
      height: 20,
      properties: { content: 'Band page: {{ "bandRef" | ref }}' },
    });

    const result = await renderPdf(t);
    expect(result.pageCount).toBe(1);
  });
});
