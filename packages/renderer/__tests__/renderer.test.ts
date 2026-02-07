import { describe, it, expect } from 'vitest';
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
