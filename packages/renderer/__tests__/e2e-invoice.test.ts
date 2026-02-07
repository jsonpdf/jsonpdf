import { describe, it, expect } from 'vitest';
import { createTemplate, addSection, addBand, addElement, addStyle } from '@jsonpdf/template';
import { renderPdf } from '../src/renderer.js';

function buildInvoiceTemplate() {
  let t = createTemplate({
    name: 'Invoice',
    page: {
      width: 612,
      height: 792,
      margins: { top: 40, right: 40, bottom: 40, left: 40 },
    },
  });

  t = addStyle(t, 'heading', { fontSize: 20, fontWeight: 'bold' });
  t = addStyle(t, 'small', { fontSize: 10 });
  t = addStyle(t, 'bold', { fontWeight: 'bold' });

  t = addSection(t, { id: 'invoice', bands: [] });

  // Page header
  t = addBand(t, 'invoice', {
    id: 'page-header',
    type: 'pageHeader',
    height: 40,
    elements: [],
  });
  t = addElement(t, 'page-header', {
    id: 'invoice-title',
    type: 'text',
    x: 0,
    y: 5,
    width: 300,
    height: 25,
    style: 'heading',
    properties: { content: 'Invoice #{{ invoiceNumber }}' },
  });
  t = addElement(t, 'page-header', {
    id: 'invoice-date',
    type: 'text',
    x: 350,
    y: 10,
    width: 182,
    height: 15,
    style: 'small',
    properties: { content: 'Date: {{ date }}' },
  });

  // Column header (repeats on each page)
  t = addBand(t, 'invoice', {
    id: 'col-header',
    type: 'columnHeader',
    height: 25,
    backgroundColor: '#f0f0f0',
    elements: [],
  });
  t = addElement(t, 'col-header', {
    id: 'col-desc',
    type: 'text',
    x: 0,
    y: 5,
    width: 250,
    height: 15,
    style: 'bold',
    properties: { content: 'Description' },
  });
  t = addElement(t, 'col-header', {
    id: 'col-qty',
    type: 'text',
    x: 260,
    y: 5,
    width: 60,
    height: 15,
    style: 'bold',
    properties: { content: 'Qty' },
  });
  t = addElement(t, 'col-header', {
    id: 'col-price',
    type: 'text',
    x: 330,
    y: 5,
    width: 80,
    height: 15,
    style: 'bold',
    properties: { content: 'Price' },
  });
  t = addElement(t, 'col-header', {
    id: 'col-total',
    type: 'text',
    x: 420,
    y: 5,
    width: 112,
    height: 15,
    style: 'bold',
    properties: { content: 'Total' },
  });

  // Detail band (one per line item)
  t = addBand(t, 'invoice', {
    id: 'line-item',
    type: 'detail',
    height: 20,
    dataSource: 'items',
    elements: [],
  });
  t = addElement(t, 'line-item', {
    id: 'item-desc',
    type: 'text',
    x: 0,
    y: 3,
    width: 250,
    height: 14,
    style: 'small',
    properties: { content: '{{ item.description }}' },
  });
  t = addElement(t, 'line-item', {
    id: 'item-qty',
    type: 'text',
    x: 260,
    y: 3,
    width: 60,
    height: 14,
    style: 'small',
    properties: { content: '{{ item.qty }}' },
  });
  t = addElement(t, 'line-item', {
    id: 'item-price',
    type: 'text',
    x: 330,
    y: 3,
    width: 80,
    height: 14,
    style: 'small',
    properties: { content: '{{ item.price | money }}' },
  });
  t = addElement(t, 'line-item', {
    id: 'item-total',
    type: 'text',
    x: 420,
    y: 3,
    width: 112,
    height: 14,
    style: 'small',
    properties: { content: '{{ item.total | money }}' },
  });

  // No data band
  t = addBand(t, 'invoice', {
    id: 'no-items',
    type: 'noData',
    height: 40,
    elements: [],
  });
  t = addElement(t, 'no-items', {
    id: 'no-items-text',
    type: 'text',
    x: 0,
    y: 10,
    width: 532,
    height: 20,
    properties: { content: 'No line items' },
  });

  // Summary band (grand total)
  t = addBand(t, 'invoice', {
    id: 'summary-band',
    type: 'summary',
    height: 30,
    elements: [],
  });
  t = addElement(t, 'summary-band', {
    id: 'grand-total-label',
    type: 'text',
    x: 330,
    y: 5,
    width: 80,
    height: 20,
    style: 'bold',
    properties: { content: 'Grand Total:' },
  });
  t = addElement(t, 'summary-band', {
    id: 'grand-total-value',
    type: 'text',
    x: 420,
    y: 5,
    width: 112,
    height: 20,
    style: 'bold',
    properties: { content: '{{ grandTotal | money }}' },
  });

  // Page footer
  t = addBand(t, 'invoice', {
    id: 'page-footer',
    type: 'pageFooter',
    height: 25,
    elements: [],
  });
  t = addElement(t, 'page-footer', {
    id: 'page-num',
    type: 'text',
    x: 200,
    y: 5,
    width: 132,
    height: 15,
    style: 'small',
    properties: { content: 'Page {{ _pageNumber }} of {{ _totalPages }}' },
  });

  // Last page footer
  t = addBand(t, 'invoice', {
    id: 'last-page-footer',
    type: 'lastPageFooter',
    height: 40,
    elements: [],
  });
  t = addElement(t, 'last-page-footer', {
    id: 'last-page-num',
    type: 'text',
    x: 200,
    y: 5,
    width: 132,
    height: 15,
    style: 'small',
    properties: { content: 'Page {{ _pageNumber }} of {{ _totalPages }}' },
  });
  t = addElement(t, 'last-page-footer', {
    id: 'thank-you',
    type: 'text',
    x: 0,
    y: 22,
    width: 532,
    height: 15,
    style: 'small',
    properties: { content: 'Thank you for your business!' },
  });

  return t;
}

function generateLineItems(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    description: `Product ${i + 1} - Widget Model ${String.fromCharCode(65 + (i % 26))}`,
    qty: (i % 5) + 1,
    price: ((i % 50) + 1) * 9.99,
    total: ((i % 5) + 1) * (((i % 50) + 1) * 9.99),
  }));
}

describe('E2E: Invoice with multi-page rendering', () => {
  it('renders 100+ line items across multiple pages', async () => {
    const template = buildInvoiceTemplate();
    const items = generateLineItems(120);
    const grandTotal = items.reduce((sum, item) => sum + item.total, 0);

    const result = await renderPdf(template, {
      data: {
        invoiceNumber: 'INV-2024-001',
        date: '2024-06-15',
        items,
        grandTotal,
      },
    });

    // Multiple pages
    expect(result.pageCount).toBeGreaterThan(1);

    // Valid PDF
    const header = new TextDecoder().decode(result.bytes.slice(0, 5));
    expect(header).toBe('%PDF-');

    // Non-trivial size
    expect(result.bytes.length).toBeGreaterThan(5000);
  });

  it('renders noData band when items array is empty', async () => {
    const template = buildInvoiceTemplate();
    const result = await renderPdf(template, {
      data: {
        invoiceNumber: 'INV-2024-002',
        date: '2024-06-15',
        items: [],
        grandTotal: 0,
      },
    });

    expect(result.pageCount).toBe(1);
    const header = new TextDecoder().decode(result.bytes.slice(0, 5));
    expect(header).toBe('%PDF-');
  });

  it('renders grouped invoice with category headers', async () => {
    let t = createTemplate({
      name: 'Grouped Invoice',
      page: {
        width: 612,
        height: 792,
        margins: { top: 40, right: 40, bottom: 40, left: 40 },
      },
    });

    t = addStyle(t, 'heading', { fontSize: 16, fontWeight: 'bold' });
    t = addStyle(t, 'small', { fontSize: 10 });
    t = addStyle(t, 'group-heading', { fontSize: 12, fontWeight: 'bold' });

    t = addSection(t, { id: 'sec1', bands: [] });

    // Group header
    t = addBand(t, 'sec1', {
      id: 'group-header',
      type: 'groupHeader',
      height: 25,
      backgroundColor: '#e8e8e8',
      elements: [],
    });
    t = addElement(t, 'group-header', {
      id: 'group-name',
      type: 'text',
      x: 0,
      y: 5,
      width: 532,
      height: 15,
      style: 'group-heading',
      properties: { content: 'Category: {{ _groupKey }}' },
    });

    // Detail band with groupBy
    t = addBand(t, 'sec1', {
      id: 'detail',
      type: 'detail',
      height: 20,
      dataSource: 'items',
      groupBy: 'category',
      elements: [],
    });
    t = addElement(t, 'detail', {
      id: 'item-name',
      type: 'text',
      x: 20,
      y: 3,
      width: 512,
      height: 14,
      style: 'small',
      properties: { content: '{{ item.name }} - {{ item.price | money }}' },
    });

    // Group footer
    t = addBand(t, 'sec1', {
      id: 'group-footer',
      type: 'groupFooter',
      height: 5,
      elements: [],
    });

    // Summary
    t = addBand(t, 'sec1', {
      id: 'summary',
      type: 'summary',
      height: 30,
      elements: [],
    });
    t = addElement(t, 'summary', {
      id: 'total',
      type: 'text',
      x: 0,
      y: 5,
      width: 532,
      height: 20,
      style: 'heading',
      properties: { content: 'Total: {{ total | money }}' },
    });

    const data = {
      items: [
        { name: 'Widget A', price: 19.99, category: 'Widgets' },
        { name: 'Widget B', price: 29.99, category: 'Widgets' },
        { name: 'Gadget X', price: 49.99, category: 'Gadgets' },
        { name: 'Gadget Y', price: 59.99, category: 'Gadgets' },
        { name: 'Gadget Z', price: 39.99, category: 'Gadgets' },
      ],
      total: 199.95,
    };

    const result = await renderPdf(t, { data });
    expect(result.pageCount).toBeGreaterThanOrEqual(1);

    const header = new TextDecoder().decode(result.bytes.slice(0, 5));
    expect(header).toBe('%PDF-');
  });
});
