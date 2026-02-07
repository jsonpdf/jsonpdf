import type { PDFFont } from 'pdf-lib';
import type { Style, JSONSchema } from '@jsonpdf/core';
import type { MeasureContext } from '../types.js';
import { getFont, getLineHeight } from '../utils.js';
import { wrapText } from '../text/word-wrap.js';

export interface TableColumn {
  /** Key in each row object to extract cell data. */
  key: string;
  /** Column header label. Defaults to key. */
  header?: string;
  /** Fixed width in points. */
  width?: number;
  /** Flex factor for distributing remaining space. Default 1. */
  flex?: number;
  /** Horizontal alignment for cell content. Default 'left'. */
  align?: 'left' | 'center' | 'right';
}

export interface TableProps {
  /** Column definitions. */
  columns: TableColumn[];
  /** Row data. Each object maps column keys to string values. */
  rows: Record<string, string>[];
  /** Show the header row. Default true. */
  showHeader?: boolean;
  /** Named style for header cells. */
  headerStyle?: string;
  /** Named style for body rows. */
  rowStyle?: string;
  /** Named style for alternating body rows (striping). */
  alternateRowStyle?: string;
  /** Border width for cell borders in points. Default 0.5. */
  borderWidth?: number;
  /** Border color as hex string. Default '#000000'. */
  borderColor?: string;
  /** Cell padding in points (uniform all sides). Default 4. */
  cellPadding?: number;
  /** Repeat header row when table splits across pages. Default true. */
  headerRepeat?: boolean;
}

export const tablePropsSchema: JSONSchema = {
  type: 'object',
  required: ['columns', 'rows'],
  additionalProperties: false,
  properties: {
    columns: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['key'],
        additionalProperties: false,
        properties: {
          key: { type: 'string' },
          header: { type: 'string' },
          width: { type: 'number', minimum: 0 },
          flex: { type: 'number', minimum: 0 },
          align: { type: 'string', enum: ['left', 'center', 'right'] },
        },
      },
    },
    rows: {
      type: 'array',
      items: { type: 'object' },
    },
    showHeader: { type: 'boolean' },
    headerStyle: { type: 'string' },
    rowStyle: { type: 'string' },
    alternateRowStyle: { type: 'string' },
    borderWidth: { type: 'number', minimum: 0 },
    borderColor: { type: 'string' },
    cellPadding: { type: 'number', minimum: 0 },
    headerRepeat: { type: 'boolean' },
  },
};

export const TABLE_DEFAULTS: TableProps = {
  columns: [],
  rows: [],
  showHeader: true,
  borderWidth: 0.5,
  borderColor: '#000000',
  cellPadding: 4,
  headerRepeat: true,
};

/** Result of measuring all table rows. */
export interface TableMeasurement {
  columnWidths: number[];
  headerHeight: number;
  rowHeights: number[];
  totalHeight: number;
}

/** Compute column widths from column definitions and available width. */
export function computeColumnWidths(columns: TableColumn[], availableWidth: number): number[] {
  if (columns.length === 0) return [];

  const widths: number[] = new Array<number>(columns.length).fill(0);
  let totalFixed = 0;
  const flexIndices: number[] = [];

  for (let i = 0; i < columns.length; i++) {
    const colWidth = columns[i].width;
    if (colWidth !== undefined) {
      widths[i] = colWidth;
      totalFixed += widths[i];
    } else {
      flexIndices.push(i);
    }
  }

  if (flexIndices.length === 0) {
    return widths;
  }

  const remaining = Math.max(0, availableWidth - totalFixed);
  let totalFlex = 0;
  for (const idx of flexIndices) {
    totalFlex += columns[idx].flex ?? 1;
  }

  for (const idx of flexIndices) {
    const flexVal = columns[idx].flex ?? 1;
    widths[idx] =
      totalFlex > 0 ? (remaining * flexVal) / totalFlex : remaining / flexIndices.length;
  }

  return widths;
}

/** Measure a single row's height by wrapping text in each cell. */
function measureRowHeight(
  cells: string[],
  columnWidths: number[],
  cellPadding: number,
  font: PDFFont,
  fontSize: number,
  lineHeight: number,
): number {
  let maxCellHeight = 0;
  for (let c = 0; c < cells.length; c++) {
    const contentWidth = Math.max(0, columnWidths[c] - 2 * cellPadding);
    const wrapped = wrapText(cells[c], font, fontSize, contentWidth, lineHeight);
    maxCellHeight = Math.max(maxCellHeight, wrapped.height);
  }
  return maxCellHeight + 2 * cellPadding;
}

/** Measure all rows and the header, returning per-row heights and totals. */
export function measureAllRows(props: TableProps, ctx: MeasureContext): TableMeasurement {
  const columnWidths = computeColumnWidths(props.columns, ctx.availableWidth);
  const cellPadding = props.cellPadding ?? 4;
  const showHeader = props.showHeader !== false;

  // Resolve header style
  const headerStyle: Style = props.headerStyle
    ? { ...ctx.elementStyle, ...ctx.resolveStyle(props.headerStyle) }
    : ctx.elementStyle;
  const headerFont = getFont(ctx.fonts, headerStyle);
  const headerFontSize = headerStyle.fontSize ?? 12;
  const headerLineHeight = getLineHeight(headerStyle);

  // Measure header
  let headerHeight = 0;
  if (showHeader) {
    const headerCells = props.columns.map((col) => col.header ?? col.key);
    headerHeight = measureRowHeight(
      headerCells,
      columnWidths,
      cellPadding,
      headerFont,
      headerFontSize,
      headerLineHeight,
    );
  }

  // Resolve row styles
  const rowStyle: Style = props.rowStyle
    ? { ...ctx.elementStyle, ...ctx.resolveStyle(props.rowStyle) }
    : ctx.elementStyle;
  const altStyle: Style = props.alternateRowStyle
    ? { ...ctx.elementStyle, ...ctx.resolveStyle(props.alternateRowStyle) }
    : rowStyle;

  // Measure each data row
  const rowHeights: number[] = [];
  for (let r = 0; r < props.rows.length; r++) {
    const style = r % 2 === 0 ? rowStyle : altStyle;
    const font = getFont(ctx.fonts, style);
    const fontSize = style.fontSize ?? 12;
    const lineHeight = getLineHeight(style);

    const cells = props.columns.map((col) => props.rows[r][col.key] ?? '');
    rowHeights.push(measureRowHeight(cells, columnWidths, cellPadding, font, fontSize, lineHeight));
  }

  const totalHeight = headerHeight + rowHeights.reduce((sum, h) => sum + h, 0);
  return { columnWidths, headerHeight, rowHeights, totalHeight };
}
