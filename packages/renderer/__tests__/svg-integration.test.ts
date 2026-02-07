import { describe, it, expect } from 'vitest';
import { renderPdf } from '../src/renderer.js';
import { createTemplate, addSection, addBand, addElement } from '@jsonpdf/template';

// ── Test fixtures ──

const TINY_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><rect width="100" height="50" fill="red"/></svg>';

const VIEWBOX_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><circle cx="100" cy="50" r="40" fill="blue"/></svg>';

const SVG_BASE64 = Buffer.from(TINY_SVG).toString('base64');
const SVG_DATA_URI = `data:image/svg+xml;base64,${SVG_BASE64}`;

// Minimal 1x1 PNG as data URI
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const PNG_DATA_URI = `data:image/png;base64,${TINY_PNG_BASE64}`;

describe('SVG integration with renderer', () => {
  it('renders SVG data URI to valid PDF', async () => {
    let t = createTemplate({ name: 'SVG Test' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 200, elements: [] });
    t = addElement(t, 'band1', {
      id: 'svg1',
      type: 'image',
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      properties: { src: SVG_DATA_URI },
    });

    const result = await renderPdf(t);
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.pageCount).toBe(1);
    const header = new TextDecoder().decode(result.bytes.slice(0, 5));
    expect(header).toBe('%PDF-');
  });

  it('renders SVG with viewBox-only dimensions', async () => {
    const viewBoxDataUri = `data:image/svg+xml;base64,${Buffer.from(VIEWBOX_SVG).toString('base64')}`;

    let t = createTemplate({ name: 'ViewBox SVG' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 200, elements: [] });
    t = addElement(t, 'band1', {
      id: 'svg1',
      type: 'image',
      x: 0,
      y: 0,
      width: 300,
      height: 150,
      properties: { src: viewBoxDataUri },
    });

    const result = await renderPdf(t);
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.pageCount).toBe(1);
  });

  it('renders SVG with URL-encoded data URI', async () => {
    const encodedDataUri = `data:image/svg+xml,${encodeURIComponent(TINY_SVG)}`;

    let t = createTemplate({ name: 'Encoded SVG' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 200, elements: [] });
    t = addElement(t, 'band1', {
      id: 'svg1',
      type: 'image',
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      properties: { src: encodedDataUri },
    });

    const result = await renderPdf(t);
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.pageCount).toBe(1);
  });

  it('renders SVG image with data binding', async () => {
    let t = createTemplate({ name: 'Bound SVG' });
    t = {
      ...t,
      dataSchema: {
        type: 'object',
        properties: {
          iconSvg: { type: 'string' },
        },
      },
    };
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 200, elements: [] });
    t = addElement(t, 'band1', {
      id: 'svg1',
      type: 'image',
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      properties: { src: '{{ iconSvg }}' },
    });

    const result = await renderPdf(t, { data: { iconSvg: SVG_DATA_URI } });
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.pageCount).toBe(1);
  });

  it('renders SVG alongside PNG on same page', async () => {
    let t = createTemplate({ name: 'SVG + PNG' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 300, elements: [] });
    t = addElement(t, 'band1', {
      id: 'svg1',
      type: 'image',
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      properties: { src: SVG_DATA_URI },
    });
    t = addElement(t, 'band1', {
      id: 'png1',
      type: 'image',
      x: 0,
      y: 120,
      width: 50,
      height: 50,
      properties: { src: PNG_DATA_URI },
    });

    const result = await renderPdf(t);
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.pageCount).toBe(1);
  });
});
