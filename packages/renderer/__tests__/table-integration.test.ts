import { describe, it, expect } from 'vitest';
import { renderPdf } from '../src/renderer.js';
import { createTemplate, addSection, addBand, addElement } from '@jsonpdf/template';

describe('table integration with renderer', () => {
  it('renders a basic table to valid PDF', async () => {
    let t = createTemplate({ name: 'Table Test' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 200, elements: [] });
    t = addElement(t, 'band1', {
      id: 'table1',
      type: 'table',
      x: 0,
      y: 0,
      width: 500,
      height: 200,
      properties: {
        columns: [
          { key: 'name', header: 'Name' },
          { key: 'amount', header: 'Amount', align: 'right' },
        ],
        rows: [
          { name: 'Item A', amount: '$100' },
          { name: 'Item B', amount: '$200' },
          { name: 'Item C', amount: '$300' },
        ],
      },
    });

    const result = await renderPdf(t);
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.pageCount).toBe(1);
    const header = new TextDecoder().decode(result.bytes.slice(0, 5));
    expect(header).toBe('%PDF-');
  });

  it('renders table with styles', async () => {
    let t = createTemplate({ name: 'Styled Table' });
    t = {
      ...t,
      styles: {
        tableHeader: {
          fontWeight: 'bold',
          backgroundColor: '#CCCCCC',
        },
        stripe: {
          backgroundColor: '#F0F0F0',
        },
      },
    };
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 200, elements: [] });
    t = addElement(t, 'band1', {
      id: 'table1',
      type: 'table',
      x: 0,
      y: 0,
      width: 500,
      height: 200,
      properties: {
        columns: [
          { key: 'name', header: 'Name' },
          { key: 'value', header: 'Value' },
        ],
        rows: [
          { name: 'A', value: '1' },
          { name: 'B', value: '2' },
          { name: 'C', value: '3' },
        ],
        headerStyle: 'tableHeader',
        alternateRowStyle: 'stripe',
      },
    });

    const result = await renderPdf(t);
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.pageCount).toBe(1);
  });

  it('splits a large table across pages', async () => {
    // Create a table with many rows that won't fit on one page
    const rows = Array.from({ length: 60 }, (_, i) => ({
      id: `${i + 1}`,
      name: `Item ${i + 1}`,
      desc: `Description for item ${i + 1}`,
    }));

    let t = createTemplate({ name: 'Split Table' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', {
      id: 'band1',
      type: 'body',
      autoHeight: true,
      height: 0,
      elements: [],
    });
    t = addElement(t, 'band1', {
      id: 'table1',
      type: 'table',
      x: 0,
      y: 0,
      width: 500,
      height: 50, // autoHeight will override this
      properties: {
        columns: [
          { key: 'id', header: '#', width: 40 },
          { key: 'name', header: 'Name' },
          { key: 'desc', header: 'Description', flex: 2 },
        ],
        rows,
        headerRepeat: true,
      },
    });

    const result = await renderPdf(t);
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.pageCount).toBeGreaterThan(1);
  });

  it('splits across 3+ pages for very long tables', async () => {
    const rows = Array.from({ length: 150 }, (_, i) => ({
      col1: `Row ${i + 1}`,
      col2: `Value ${i + 1}`,
    }));

    let t = createTemplate({ name: 'Long Table' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', {
      id: 'band1',
      type: 'body',
      autoHeight: true,
      height: 0,
      elements: [],
    });
    t = addElement(t, 'band1', {
      id: 'table1',
      type: 'table',
      x: 0,
      y: 0,
      width: 500,
      height: 50,
      properties: {
        columns: [
          { key: 'col1', header: 'Column 1' },
          { key: 'col2', header: 'Column 2' },
        ],
        rows,
        headerRepeat: true,
      },
    });

    const result = await renderPdf(t);
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.pageCount).toBeGreaterThanOrEqual(3);
  });
});
