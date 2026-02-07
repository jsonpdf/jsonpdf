import { describe, it, expect } from 'vitest';
import { renderPdf } from '../src/renderer.js';
import { createTemplate, addSection, addBand, addElement } from '@jsonpdf/template';
import type { Band, Element } from '@jsonpdf/core';

describe('frame integration with renderer', () => {
  it('renders frame with single body band containing text', async () => {
    let t = createTemplate({ name: 'Frame Basic' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', {
      id: 'band1',
      type: 'body',
      height: 200,
      elements: [],
    });
    t = addElement(t, 'band1', {
      id: 'frame1',
      type: 'frame',
      x: 0,
      y: 0,
      width: 400,
      height: 150,
      properties: {
        bands: [
          {
            id: 'fb1',
            type: 'body',
            height: 50,
            elements: [
              {
                id: 'text1',
                type: 'text',
                x: 0,
                y: 0,
                width: 200,
                height: 20,
                properties: { content: 'Hello from frame' },
              },
            ],
          } as Band,
        ],
      },
    });

    const result = await renderPdf(t);
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.pageCount).toBe(1);
    const header = new TextDecoder().decode(result.bytes.slice(0, 5));
    expect(header).toBe('%PDF-');
  });

  it('renders frame with detail band iterating over data', async () => {
    let t = createTemplate({ name: 'Frame Detail' });
    t = {
      ...t,
      dataSchema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { type: 'object', properties: { name: { type: 'string' } } },
          },
        },
      },
    };
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', {
      id: 'band1',
      type: 'body',
      height: 400,
      elements: [],
    });
    t = addElement(t, 'band1', {
      id: 'frame1',
      type: 'frame',
      x: 0,
      y: 0,
      width: 400,
      height: 300,
      properties: {
        bands: [
          {
            id: 'detail1',
            type: 'detail',
            height: 25,
            dataSource: 'items',
            elements: [
              {
                id: 'itemText',
                type: 'text',
                x: 0,
                y: 0,
                width: 300,
                height: 20,
                properties: { content: '{{ item.name }}' },
              },
            ],
          } as Band,
        ],
      },
    });

    const data = {
      items: [{ name: 'Alpha' }, { name: 'Beta' }, { name: 'Gamma' }],
    };

    const result = await renderPdf(t, { data });
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.pageCount).toBe(1);
  });

  it('renders two frames side-by-side in a horizontal container', async () => {
    let t = createTemplate({ name: 'Side-by-Side Frames' });
    t = {
      ...t,
      dataSchema: {
        type: 'object',
        properties: {
          orders: {
            type: 'array',
            items: { type: 'object', properties: { id: { type: 'string' } } },
          },
          products: {
            type: 'array',
            items: { type: 'object', properties: { sku: { type: 'string' } } },
          },
        },
      },
    };
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', {
      id: 'band1',
      type: 'body',
      height: 400,
      elements: [],
    });

    const leftFrame: Element = {
      id: 'leftFrame',
      type: 'frame',
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      properties: {
        bands: [
          {
            id: 'ordersDetail',
            type: 'detail',
            height: 20,
            dataSource: 'orders',
            elements: [
              {
                id: 'orderText',
                type: 'text',
                x: 0,
                y: 0,
                width: 180,
                height: 18,
                properties: { content: 'Order: {{ item.id }}' },
              },
            ],
          } as Band,
        ],
      },
    };

    const rightFrame: Element = {
      id: 'rightFrame',
      type: 'frame',
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      properties: {
        bands: [
          {
            id: 'productsDetail',
            type: 'detail',
            height: 20,
            dataSource: 'products',
            elements: [
              {
                id: 'productText',
                type: 'text',
                x: 0,
                y: 0,
                width: 180,
                height: 18,
                properties: { content: 'SKU: {{ item.sku }}' },
              },
            ],
          } as Band,
        ],
      },
    };

    t = addElement(t, 'band1', {
      id: 'container1',
      type: 'container',
      x: 0,
      y: 0,
      width: 500,
      height: 300,
      properties: { layout: 'horizontal', gap: 20 },
      elements: [leftFrame, rightFrame],
    });

    const data = {
      orders: [{ id: 'ORD-001' }, { id: 'ORD-002' }],
      products: [{ sku: 'SKU-A' }, { sku: 'SKU-B' }, { sku: 'SKU-C' }],
    };

    const result = await renderPdf(t, { data });
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.pageCount).toBe(1);
  });

  it('renders frame with grouped detail bands', async () => {
    let t = createTemplate({ name: 'Frame Grouped' });
    t = {
      ...t,
      dataSchema: {
        type: 'object',
        properties: {
          employees: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                dept: { type: 'string' },
              },
            },
          },
        },
      },
    };
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', {
      id: 'band1',
      type: 'body',
      height: 500,
      elements: [],
    });
    t = addElement(t, 'band1', {
      id: 'frame1',
      type: 'frame',
      x: 0,
      y: 0,
      width: 400,
      height: 400,
      properties: {
        bands: [
          {
            id: 'groupHdr',
            type: 'groupHeader',
            height: 25,
            elements: [
              {
                id: 'groupTitle',
                type: 'text',
                x: 0,
                y: 0,
                width: 300,
                height: 20,
                properties: { content: 'Department: {{ _groupKey }}' },
              },
            ],
          } as Band,
          {
            id: 'empDetail',
            type: 'detail',
            height: 20,
            dataSource: 'employees',
            groupBy: 'dept',
            elements: [
              {
                id: 'empName',
                type: 'text',
                x: 10,
                y: 0,
                width: 290,
                height: 18,
                properties: { content: '{{ item.name }}' },
              },
            ],
          } as Band,
          {
            id: 'groupFtr',
            type: 'groupFooter',
            height: 15,
            elements: [
              {
                id: 'groupLine',
                type: 'line',
                x: 0,
                y: 5,
                width: 300,
                height: 1,
                properties: { direction: 'horizontal' },
              },
            ],
          } as Band,
        ],
      },
    });

    const data = {
      employees: [
        { name: 'Alice', dept: 'Engineering' },
        { name: 'Bob', dept: 'Engineering' },
        { name: 'Carol', dept: 'Sales' },
      ],
    };

    const result = await renderPdf(t, { data });
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.pageCount).toBe(1);
  });

  it('renders frame with noData band when data source is empty', async () => {
    let t = createTemplate({ name: 'Frame NoData' });
    t = {
      ...t,
      dataSchema: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { type: 'object' } },
        },
      },
    };
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', {
      id: 'band1',
      type: 'body',
      height: 200,
      elements: [],
    });
    t = addElement(t, 'band1', {
      id: 'frame1',
      type: 'frame',
      x: 0,
      y: 0,
      width: 400,
      height: 150,
      properties: {
        bands: [
          {
            id: 'detail1',
            type: 'detail',
            height: 20,
            dataSource: 'items',
            elements: [
              {
                id: 'itemText',
                type: 'text',
                x: 0,
                y: 0,
                width: 200,
                height: 18,
                properties: { content: '{{ item.name }}' },
              },
            ],
          } as Band,
          {
            id: 'noData1',
            type: 'noData',
            height: 30,
            elements: [
              {
                id: 'noDataText',
                type: 'text',
                x: 0,
                y: 0,
                width: 200,
                height: 25,
                properties: { content: 'No items found' },
              },
            ],
          } as Band,
        ],
      },
    });

    const result = await renderPdf(t, { data: { items: [] } });
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.pageCount).toBe(1);
  });
});
