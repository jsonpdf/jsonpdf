import { describe, it, expect, beforeAll } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';

import type { Style } from '@jsonpdf/core';
import { tablePlugin } from '../../src/table/table-plugin.js';
import { computeColumnWidths, measureAllRows } from '../../src/table/table-types.js';
import type { TableProps, TableColumn } from '../../src/table/table-types.js';
import { fontKey } from '../../src/types.js';
import type { MeasureContext, RenderContext, FontMap, ImageCache } from '../../src/types.js';

let doc: PDFDocument;
let page: PDFPage;
let fonts: FontMap;
const noopImageCache: ImageCache = {
  getOrEmbed: () => Promise.reject(new Error('no images in test')),
};

const defaultStyle: Style = {
  fontFamily: 'Helvetica',
  fontSize: 12,
  fontWeight: 'normal',
  fontStyle: 'normal',
  color: '#000000',
  lineHeight: 1.2,
};

const styles: Record<string, Style> = {
  header: {
    fontFamily: 'Helvetica',
    fontSize: 12,
    fontWeight: 'bold',
    fontStyle: 'normal',
    color: '#000000',
    backgroundColor: '#CCCCCC',
  },
  stripe: {
    fontFamily: 'Helvetica',
    fontSize: 12,
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: '#000000',
    backgroundColor: '#F0F0F0',
  },
};

beforeAll(async () => {
  doc = await PDFDocument.create();
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  page = doc.addPage([612, 792]);
  fonts = new Map();
  fonts.set(fontKey('Helvetica', 'normal', 'normal'), helvetica);
  fonts.set(fontKey('Helvetica', 'bold', 'normal'), helveticaBold);
});

function makeMeasureCtx(overrides?: Partial<MeasureContext>): MeasureContext {
  return {
    fonts,
    availableWidth: 500,
    availableHeight: 700,
    resolveStyle: (name: string) => ({ ...defaultStyle, ...(styles[name] ?? {}) }),
    elementStyle: defaultStyle,
    pdfDoc: doc,
    imageCache: noopImageCache,
    ...overrides,
  };
}

function makeRenderCtx(overrides?: Partial<RenderContext>): RenderContext {
  return {
    ...makeMeasureCtx(),
    page,
    x: 40,
    y: 752,
    width: 500,
    height: 700,
    ...overrides,
  };
}

const basicColumns: TableColumn[] = [
  { key: 'name', header: 'Name' },
  { key: 'value', header: 'Value' },
];

const basicRows: Record<string, string>[] = [
  { name: 'Alice', value: '100' },
  { name: 'Bob', value: '200' },
];

// ── resolveProps ──

describe('tablePlugin.resolveProps', () => {
  it('merges with defaults', () => {
    const props = tablePlugin.resolveProps({
      columns: basicColumns,
      rows: basicRows,
    });
    expect(props.showHeader).toBe(true);
    expect(props.borderWidth).toBe(0.5);
    expect(props.cellPadding).toBe(4);
    expect(props.headerRepeat).toBe(true);
  });

  it('preserves explicit values', () => {
    const props = tablePlugin.resolveProps({
      columns: basicColumns,
      rows: [],
      showHeader: false,
      borderWidth: 2,
      cellPadding: 8,
    });
    expect(props.showHeader).toBe(false);
    expect(props.borderWidth).toBe(2);
    expect(props.cellPadding).toBe(8);
  });
});

// ── validate ──

describe('tablePlugin.validate', () => {
  it('returns no errors for valid props', () => {
    const errors = tablePlugin.validate({
      columns: basicColumns,
      rows: basicRows,
    } as TableProps);
    expect(errors).toEqual([]);
  });

  it('returns error for empty columns', () => {
    const errors = tablePlugin.validate({
      columns: [],
      rows: basicRows,
    } as TableProps);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].path).toBe('/columns');
  });
});

// ── computeColumnWidths ──

describe('computeColumnWidths', () => {
  it('distributes equally when no widths specified', () => {
    const cols: TableColumn[] = [{ key: 'a' }, { key: 'b' }];
    const widths = computeColumnWidths(cols, 400);
    expect(widths[0]).toBe(200);
    expect(widths[1]).toBe(200);
  });

  it('uses fixed widths', () => {
    const cols: TableColumn[] = [
      { key: 'a', width: 100 },
      { key: 'b', width: 150 },
    ];
    const widths = computeColumnWidths(cols, 400);
    expect(widths[0]).toBe(100);
    expect(widths[1]).toBe(150);
  });

  it('distributes remaining space to flex columns', () => {
    const cols: TableColumn[] = [
      { key: 'a', width: 100 },
      { key: 'b' }, // flex default 1
      { key: 'c' }, // flex default 1
    ];
    const widths = computeColumnWidths(cols, 500);
    expect(widths[0]).toBe(100);
    expect(widths[1]).toBe(200);
    expect(widths[2]).toBe(200);
  });

  it('respects flex ratios', () => {
    const cols: TableColumn[] = [
      { key: 'a', flex: 2 },
      { key: 'b', flex: 1 },
    ];
    const widths = computeColumnWidths(cols, 300);
    expect(widths[0]).toBe(200);
    expect(widths[1]).toBe(100);
  });

  it('handles empty columns', () => {
    expect(computeColumnWidths([], 500)).toEqual([]);
  });
});

// ── measure ──

describe('tablePlugin.measure', () => {
  it('returns zero height for empty columns', async () => {
    const result = await tablePlugin.measure(
      { columns: [], rows: [] } as TableProps,
      makeMeasureCtx(),
    );
    expect(result.height).toBe(0);
    expect(result.width).toBe(500);
  });

  it('measures header-only table', async () => {
    const ctx = makeMeasureCtx();
    const result = await tablePlugin.measure(
      { columns: basicColumns, rows: [], cellPadding: 4 } as TableProps,
      ctx,
    );
    // Header: lineHeight(12*1.2=14.4) + 2*4(padding) = 22.4
    expect(result.height).toBeCloseTo(22.4, 1);
  });

  it('measures table with rows', async () => {
    const ctx = makeMeasureCtx();
    const result = await tablePlugin.measure(
      { columns: basicColumns, rows: basicRows, cellPadding: 4 } as TableProps,
      ctx,
    );
    // Header + 2 rows, each 14.4 + 8 = 22.4
    expect(result.height).toBeCloseTo(22.4 * 3, 1);
  });

  it('excludes header when showHeader=false', async () => {
    const ctx = makeMeasureCtx();
    const withHeader = await tablePlugin.measure(
      { columns: basicColumns, rows: basicRows, cellPadding: 4, showHeader: true } as TableProps,
      ctx,
    );
    const without = await tablePlugin.measure(
      { columns: basicColumns, rows: basicRows, cellPadding: 4, showHeader: false } as TableProps,
      ctx,
    );
    expect(without.height).toBeLessThan(withHeader.height);
    // Difference should be approximately one row height
    expect(withHeader.height - without.height).toBeCloseTo(22.4, 1);
  });
});

// ── render ──

describe('tablePlugin.render', () => {
  it('renders without error', async () => {
    const ctx = makeRenderCtx();
    await expect(
      tablePlugin.render(
        {
          columns: basicColumns,
          rows: basicRows,
          cellPadding: 4,
          borderWidth: 0.5,
          borderColor: '#000000',
        } as TableProps,
        ctx,
      ),
    ).resolves.toBeUndefined();
  });

  it('renders empty rows (header only) without error', async () => {
    const ctx = makeRenderCtx();
    await expect(
      tablePlugin.render({ columns: basicColumns, rows: [], cellPadding: 4 } as TableProps, ctx),
    ).resolves.toBeUndefined();
  });

  it('renders with showHeader=false and empty rows without error', async () => {
    const ctx = makeRenderCtx();
    await expect(
      tablePlugin.render({ columns: basicColumns, rows: [], showHeader: false } as TableProps, ctx),
    ).resolves.toBeUndefined();
  });

  it('renders with striping styles', async () => {
    const ctx = makeRenderCtx();
    await expect(
      tablePlugin.render(
        {
          columns: basicColumns,
          rows: [
            { name: 'A', value: '1' },
            { name: 'B', value: '2' },
            { name: 'C', value: '3' },
          ],
          cellPadding: 4,
          alternateRowStyle: 'stripe',
        } as TableProps,
        ctx,
      ),
    ).resolves.toBeUndefined();
  });
});

// ── split ──

describe('tablePlugin.split', () => {
  it('returns null when all rows fit', async () => {
    const ctx = makeMeasureCtx();
    const props: TableProps = {
      columns: basicColumns,
      rows: basicRows,
      cellPadding: 4,
    } as TableProps;
    const m = measureAllRows(props, ctx);
    const result = await tablePlugin.split!(props, ctx, m.totalHeight + 100);
    expect(result).toBeNull();
  });

  it('returns null when no rows fit', async () => {
    const ctx = makeMeasureCtx();
    const props: TableProps = {
      columns: basicColumns,
      rows: basicRows,
      cellPadding: 4,
    } as TableProps;
    // Available height is less than header
    const result = await tablePlugin.split!(props, ctx, 5);
    expect(result).toBeNull();
  });

  it('returns null for empty table', async () => {
    const ctx = makeMeasureCtx();
    const result = await tablePlugin.split!(
      { columns: basicColumns, rows: [] } as TableProps,
      ctx,
      100,
    );
    expect(result).toBeNull();
  });

  it('splits correctly when some rows fit', async () => {
    const ctx = makeMeasureCtx();
    const rows = Array.from({ length: 10 }, (_, i) => ({
      name: `Row ${i}`,
      value: `${i * 10}`,
    }));
    const props: TableProps = {
      columns: basicColumns,
      rows,
      cellPadding: 4,
      headerRepeat: true,
    } as TableProps;

    const m = measureAllRows(props, ctx);
    // Allow header + 3 rows
    const available = m.headerHeight + m.rowHeights[0] + m.rowHeights[1] + m.rowHeights[2];

    const result = await tablePlugin.split!(props, ctx, available);
    expect(result).not.toBeNull();
    expect(result!.fit.rows).toHaveLength(3);
    expect(result!.overflow.rows).toHaveLength(7);
    expect(result!.overflow.showHeader).toBe(true); // headerRepeat
  });

  it('excludes header from overflow when headerRepeat=false', async () => {
    const ctx = makeMeasureCtx();
    const rows = Array.from({ length: 5 }, (_, i) => ({
      name: `Row ${i}`,
      value: `${i}`,
    }));
    const props: TableProps = {
      columns: basicColumns,
      rows,
      cellPadding: 4,
      headerRepeat: false,
    } as TableProps;

    const m = measureAllRows(props, ctx);
    const available = m.headerHeight + m.rowHeights[0] + m.rowHeights[1];
    const result = await tablePlugin.split!(props, ctx, available);
    expect(result).not.toBeNull();
    expect(result!.overflow.showHeader).toBe(false);
  });
});

// ── measureAllRows helper ──

describe('measureAllRows', () => {
  it('computes correct column widths', () => {
    const ctx = makeMeasureCtx({ availableWidth: 400 });
    const props: TableProps = {
      columns: [{ key: 'a', width: 100 }, { key: 'b' }],
      rows: [],
      cellPadding: 4,
    } as TableProps;
    const m = measureAllRows(props, ctx);
    expect(m.columnWidths[0]).toBe(100);
    expect(m.columnWidths[1]).toBe(300);
  });

  it('word-wraps long text and increases row height', () => {
    const ctx = makeMeasureCtx({ availableWidth: 200 });
    const shortProps: TableProps = {
      columns: [{ key: 'a' }],
      rows: [{ a: 'Hi' }],
      showHeader: false,
      cellPadding: 4,
    } as TableProps;
    const longProps: TableProps = {
      columns: [{ key: 'a' }],
      rows: [{ a: 'This is a very long text that should wrap to multiple lines within the cell' }],
      showHeader: false,
      cellPadding: 4,
    } as TableProps;
    const shortM = measureAllRows(shortProps, ctx);
    const longM = measureAllRows(longProps, ctx);
    expect(longM.rowHeights[0]).toBeGreaterThan(shortM.rowHeights[0]);
  });
});
