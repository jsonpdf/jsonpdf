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

  it('throws for element with invalid plugin properties (schema-level)', async () => {
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
      properties: { thickness: -5 },
    });

    // thickness: -5 violates exclusiveMinimum: 0 in the line propsSchema
    await expect(renderPdf(t)).rejects.toThrow('validation failed');
  });

  it('throws for element with invalid plugin properties (imperative validate)', async () => {
    let t = createTemplate({ name: 'Bad Color' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'band1', {
      id: 'bad-line',
      type: 'line',
      x: 0,
      y: 0,
      width: 200,
      height: 1,
      properties: { color: 'not-a-hex-color' },
    });

    // color format is checked by imperative validate(), not schema
    await expect(renderPdf(t)).rejects.toThrow('Invalid properties for line element "bad-line"');
  });

  it('throws for shape element missing required shapeType', async () => {
    let t = createTemplate({ name: 'Missing shapeType' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'band1', {
      id: 'bad-shape',
      type: 'shape',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      properties: { fill: '#ff0000' },
    });

    await expect(renderPdf(t)).rejects.toThrow('validation failed');
  });

  it('accepts expression values in plugin properties', async () => {
    let t = createTemplate({ name: 'Expression Props' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'band1', {
      id: 'el1',
      type: 'image',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      properties: { src: '{{ data.imageSrc }}' },
    });

    // Should not throw at schema validation — expression strings pass through.
    // Will fail at render time because the expression resolves to invalid data,
    // so we use skipValidation=false to specifically test the schema accepts expressions.
    const result = await renderPdf(t, { skipValidation: false, data: {} }).catch(
      (e: Error) => e.message,
    );
    // The error should NOT be about schema validation; if it fails, it's a render error
    expect(result).not.toContain('validation failed');
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

describe('renderPdf: Phase 6 style features', () => {
  it('renders element with backgroundColor', async () => {
    let t = createTemplate({ name: 'BG Color Element' });
    t = addStyle(t, 'bgStyle', { backgroundColor: '#FF0000' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'band1', {
      id: 'el1',
      type: 'text',
      x: 0,
      y: 0,
      width: 200,
      height: 20,
      style: 'bgStyle',
      properties: { content: 'Red background' },
    });

    const result = await renderPdf(t);
    expect(result.pageCount).toBe(1);
    expect(result.bytes.length).toBeGreaterThan(0);
    const header = new TextDecoder().decode(result.bytes.slice(0, 5));
    expect(header).toBe('%PDF-');
  });

  it('renders element with borderTop only', async () => {
    let t = createTemplate({ name: 'Border Top' });
    t = addStyle(t, 'topBorder', { borderTop: { width: 1, color: '#FF0000' } });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'band1', {
      id: 'el1',
      type: 'text',
      x: 0,
      y: 0,
      width: 200,
      height: 20,
      style: 'topBorder',
      properties: { content: 'Top border only' },
    });

    const result = await renderPdf(t);
    expect(result.pageCount).toBe(1);
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it('renders element with all individual borders', async () => {
    let t = createTemplate({ name: 'All Borders' });
    t = addStyle(t, 'allBorders', {
      borderTop: { width: 1, color: '#FF0000' },
      borderRight: { width: 2, color: '#00FF00' },
      borderBottom: { width: 1, color: '#0000FF' },
      borderLeft: { width: 2, color: '#FF00FF' },
    });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'band1', {
      id: 'el1',
      type: 'text',
      x: 10,
      y: 10,
      width: 200,
      height: 40,
      style: 'allBorders',
      properties: { content: 'All borders' },
    });

    const result = await renderPdf(t);
    expect(result.pageCount).toBe(1);
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it('renders element with borderRadius and backgroundColor', async () => {
    let t = createTemplate({ name: 'Border Radius' });
    t = addStyle(t, 'rounded', {
      backgroundColor: '#3498db',
      borderRadius: 8,
    });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'band1', {
      id: 'el1',
      type: 'text',
      x: 10,
      y: 10,
      width: 200,
      height: 40,
      style: 'rounded',
      properties: { content: 'Rounded corners' },
    });

    const result = await renderPdf(t);
    expect(result.pageCount).toBe(1);
    expect(result.bytes.length).toBeGreaterThan(0);
    const header = new TextDecoder().decode(result.bytes.slice(0, 5));
    expect(header).toBe('%PDF-');
  });

  it('renders element with opacity', async () => {
    let t = createTemplate({ name: 'Opacity' });
    t = addStyle(t, 'semiTransparent', { opacity: 0.5 });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'band1', {
      id: 'el1',
      type: 'text',
      x: 0,
      y: 0,
      width: 200,
      height: 20,
      style: 'semiTransparent',
      properties: { content: 'Semi-transparent text' },
    });

    const result = await renderPdf(t);
    expect(result.pageCount).toBe(1);
    expect(result.bytes.length).toBeGreaterThan(0);
    const header = new TextDecoder().decode(result.bytes.slice(0, 5));
    expect(header).toBe('%PDF-');
  });
});

describe('renderPdf: gradient fills', () => {
  it('renders element with linear gradient backgroundColor', async () => {
    let t = createTemplate({ name: 'Gradient Test' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'band1', {
      id: 'el1',
      type: 'text',
      x: 10,
      y: 10,
      width: 200,
      height: 50,
      styleOverrides: {
        backgroundColor: {
          type: 'linear',
          angle: 90,
          stops: [
            { color: '#ff0000', position: 0 },
            { color: '#0000ff', position: 1 },
          ],
        },
      },
      properties: { content: 'Gradient bg' },
    });

    const result = await renderPdf(t, { skipValidation: true });
    expect(result.pageCount).toBe(1);
    expect(result.bytes.length).toBeGreaterThan(0);

    // Verify the PDF has shading resources
    const pdfDoc = await PDFDocument.load(result.bytes);
    const page = pdfDoc.getPage(0);
    const resources = page.node.get(PDFName.of('Resources')) as PDFDict;
    const shading = resources.get(PDFName.of('Shading')) as PDFDict;
    expect(shading).toBeDefined();
  });

  it('renders element with radial gradient backgroundColor', async () => {
    let t = createTemplate({ name: 'Radial Gradient' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'band1', {
      id: 'el1',
      type: 'text',
      x: 10,
      y: 10,
      width: 200,
      height: 50,
      styleOverrides: {
        backgroundColor: {
          type: 'radial',
          cx: 0.5,
          cy: 0.5,
          radius: 0.5,
          stops: [
            { color: '#ffffff', position: 0 },
            { color: '#000000', position: 1 },
          ],
        },
      },
      properties: { content: 'Radial' },
    });

    const result = await renderPdf(t, { skipValidation: true });
    expect(result.pageCount).toBe(1);
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it('renders band with gradient backgroundColor', async () => {
    let t = createTemplate({ name: 'Band Gradient' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', {
      id: 'band1',
      type: 'body',
      height: 80,
      backgroundColor: {
        type: 'linear',
        angle: 0,
        stops: [
          { color: '#ff6600', position: 0 },
          { color: '#ffcc00', position: 0.5 },
          { color: '#00cc66', position: 1 },
        ],
      },
      elements: [],
    });
    t = addElement(t, 'band1', {
      id: 'el1',
      type: 'text',
      x: 10,
      y: 10,
      width: 200,
      height: 20,
      properties: { content: 'On gradient band' },
    });

    const result = await renderPdf(t, { skipValidation: true });
    expect(result.pageCount).toBe(1);

    // Verify the PDF has shading resources for the band gradient
    const pdfDoc = await PDFDocument.load(result.bytes);
    const page = pdfDoc.getPage(0);
    const resources = page.node.get(PDFName.of('Resources')) as PDFDict;
    const shading = resources.get(PDFName.of('Shading')) as PDFDict;
    expect(shading).toBeDefined();
  });

  it('renders multi-stop linear gradient', async () => {
    let t = createTemplate({ name: 'Multi-stop' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'band1', {
      id: 'el1',
      type: 'text',
      x: 0,
      y: 0,
      width: 300,
      height: 60,
      styleOverrides: {
        backgroundColor: {
          type: 'linear',
          angle: 45,
          stops: [
            { color: '#ff0000', position: 0 },
            { color: '#00ff00', position: 0.33 },
            { color: '#0000ff', position: 0.66 },
            { color: '#ff00ff', position: 1 },
          ],
        },
      },
      properties: { content: 'Rainbow' },
    });

    const result = await renderPdf(t, { skipValidation: true });
    expect(result.pageCount).toBe(1);
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it('renders gradient with opacity', async () => {
    let t = createTemplate({ name: 'Gradient Opacity' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'band1', {
      id: 'el1',
      type: 'text',
      x: 0,
      y: 0,
      width: 200,
      height: 40,
      styleOverrides: {
        opacity: 0.5,
        backgroundColor: {
          type: 'linear',
          angle: 180,
          stops: [
            { color: '#000000', position: 0 },
            { color: '#ffffff', position: 1 },
          ],
        },
      },
      properties: { content: 'Semi-transparent' },
    });

    const result = await renderPdf(t, { skipValidation: true });
    expect(result.pageCount).toBe(1);

    // Verify opacity graphics state was added
    const pdfDoc = await PDFDocument.load(result.bytes);
    const page = pdfDoc.getPage(0);
    const resources = page.node.get(PDFName.of('Resources')) as PDFDict;
    const extGState = resources.get(PDFName.of('ExtGState')) as PDFDict;
    expect(extGState).toBeDefined();
  });
});

describe('renderPdf: _bookmarks TOC data source', () => {
  it('renders TOC section that iterates over _bookmarks', async () => {
    let t = createTemplate();
    t = addStyle(t, 'default', { fontFamily: 'Helvetica', fontSize: 10 });

    // TOC section
    t = addSection(t, { id: 'toc', bands: [] });
    t = addBand(t, 'toc', { id: 'toc-title', type: 'title', height: 30, elements: [] });
    t = addElement(t, 'toc-title', {
      id: 'toc-heading',
      type: 'text',
      x: 0,
      y: 0,
      width: 200,
      height: 20,
      style: 'default',
      properties: { content: 'Table of Contents' },
    });
    t = addBand(t, 'toc', {
      id: 'toc-entry',
      type: 'detail',
      height: 20,
      dataSource: '_bookmarks',
      itemName: 'bm',
      elements: [],
    });
    t = addElement(t, 'toc-entry', {
      id: 'toc-text',
      type: 'text',
      x: 0,
      y: 0,
      width: 400,
      height: 15,
      style: 'default',
      properties: { content: '{{ bm.title }} .... page {{ bm.pageNumber }}' },
    });

    // Content section with a bookmark
    t = addSection(t, { id: 'content', bands: [], bookmark: 'Chapter 1: Introduction' });
    t = addBand(t, 'content', { id: 'content-body', type: 'body', height: 50, elements: [] });
    t = addElement(t, 'content-body', {
      id: 'text1',
      type: 'text',
      x: 0,
      y: 0,
      width: 200,
      height: 30,
      style: 'default',
      properties: { content: 'Chapter content here' },
    });

    const result = await renderPdf(t, { skipValidation: true });
    // Should produce 2 pages: TOC + content
    expect(result.pageCount).toBe(2);
    expect(result.bytes.length).toBeGreaterThan(0);
  });
});

describe('renderPdf: footnotes', () => {
  it('renders footnote marker as superscript in rich text', async () => {
    let t = createTemplate({ name: 'Footnote Test' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'band1', {
      id: 'el1',
      type: 'text',
      x: 10,
      y: 10,
      width: 400,
      height: 40,
      properties: {
        content: [
          { text: 'This has a footnote' },
          { text: ' reference', footnote: 'This is the footnote content.' },
        ],
      },
    });

    const result = await renderPdf(t, { skipValidation: true });
    expect(result.pageCount).toBe(1);
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it('renders multiple footnotes with sequential numbering', async () => {
    let t = createTemplate({ name: 'Multiple Footnotes' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 200, elements: [] });
    t = addElement(t, 'band1', {
      id: 'el1',
      type: 'text',
      x: 10,
      y: 10,
      width: 400,
      height: 60,
      properties: {
        content: [
          { text: 'First', footnote: 'Footnote one.' },
          { text: ' and ' },
          { text: 'second', footnote: 'Footnote two.' },
          { text: ' items.' },
        ],
      },
    });

    const result = await renderPdf(t, { skipValidation: true });
    expect(result.pageCount).toBe(1);
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it('renders footnote with rich content (StyledRun array)', async () => {
    let t = createTemplate({ name: 'Rich Footnote' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'band1', {
      id: 'el1',
      type: 'text',
      x: 10,
      y: 10,
      width: 400,
      height: 30,
      properties: {
        content: [
          {
            text: 'Noted',
            footnote: [{ text: 'Rich ' }, { text: 'footnote content' }],
          },
        ],
      },
    });

    const result = await renderPdf(t, { skipValidation: true });
    expect(result.pageCount).toBe(1);
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it('does not render footnotes when no StyledRun has footnote property', async () => {
    let t = createTemplate({ name: 'No Footnotes' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'band1', {
      id: 'el1',
      type: 'text',
      x: 10,
      y: 10,
      width: 200,
      height: 20,
      properties: {
        content: [{ text: 'No footnotes here' }],
      },
    });

    const result = await renderPdf(t, { skipValidation: true });
    expect(result.pageCount).toBe(1);
    expect(result.bytes.length).toBeGreaterThan(0);
  });
});
