import { describe, it, expect } from 'vitest';
import { renderPdf } from '../src/renderer.js';
import { createTemplate, addSection, addBand, addElement } from '@jsonpdf/template';

describe('barcode integration with renderer', () => {
  it('renders a QR code to valid PDF', async () => {
    let t = createTemplate({ name: 'QR Test' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 150, elements: [] });
    t = addElement(t, 'band1', {
      id: 'qr1',
      type: 'barcode',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      properties: {
        value: 'https://example.com',
        format: 'qrcode',
      },
    });

    const result = await renderPdf(t);
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.pageCount).toBe(1);
    const header = new TextDecoder().decode(result.bytes.slice(0, 5));
    expect(header).toBe('%PDF-');
  });

  it('renders a Code128 with includeText', async () => {
    let t = createTemplate({ name: 'Code128 Test' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'band1', {
      id: 'bc1',
      type: 'barcode',
      x: 0,
      y: 0,
      width: 200,
      height: 80,
      properties: {
        value: 'SKU-12345',
        format: 'code128',
        includeText: true,
        moduleHeight: 8,
      },
    });

    const result = await renderPdf(t);
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.pageCount).toBe(1);
  });

  it('renders QR code and linear barcode on same page', async () => {
    let t = createTemplate({ name: 'Multi Barcode' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 200, elements: [] });
    t = addElement(t, 'band1', {
      id: 'qr1',
      type: 'barcode',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      properties: {
        value: 'QR Data',
        format: 'qrcode',
      },
    });
    t = addElement(t, 'band1', {
      id: 'bc1',
      type: 'barcode',
      x: 120,
      y: 10,
      width: 200,
      height: 60,
      properties: {
        value: 'LINEAR-001',
        format: 'code128',
        barColor: '#333333',
      },
    });

    const result = await renderPdf(t);
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.pageCount).toBe(1);
  });

  it('renders barcode with data binding', async () => {
    let t = createTemplate({ name: 'Data Barcode' });
    t = {
      ...t,
      dataSchema: {
        type: 'object',
        properties: {
          productCode: { type: 'string' },
        },
      },
    };
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 150, elements: [] });
    t = addElement(t, 'band1', {
      id: 'qr1',
      type: 'barcode',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      properties: {
        value: '{{ productCode }}',
        format: 'qrcode',
      },
    });

    const result = await renderPdf(t, { data: { productCode: 'PROD-ABC-789' } });
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.pageCount).toBe(1);
  });

  it('renders multiple barcodes across pages via detail bands', async () => {
    let t = createTemplate({ name: 'Multi Page Barcodes' });
    t = {
      ...t,
      dataSchema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: { code: { type: 'string' } },
            },
          },
        },
      },
    };
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', {
      id: 'detail1',
      type: 'detail',
      height: 250,
      dataSource: 'items',
      elements: [],
    });
    t = addElement(t, 'detail1', {
      id: 'qr1',
      type: 'barcode',
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      properties: {
        value: '{{ item.code }}',
        format: 'qrcode',
        scale: 2,
      },
    });

    const items = Array.from({ length: 6 }, (_, i) => ({ code: `ITEM-${i + 1}` }));
    const result = await renderPdf(t, { data: { items } });
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.pageCount).toBeGreaterThanOrEqual(2);
  });
});
