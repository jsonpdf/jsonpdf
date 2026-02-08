import { rgb, pushGraphicsState, popGraphicsState, setCharacterSpacing } from 'pdf-lib';
import { parseColor } from '@jsonpdf/core';
import type { Style, ValidationError } from '@jsonpdf/core';
import type { Plugin, MeasureContext, RenderContext } from '../types.js';
import { getFont, getLineHeight } from '../utils.js';
import { wrapText, measureTextWidth } from '../text/word-wrap.js';
import { drawTextDecoration } from '../text/text-decoration.js';
import {
  type TableProps,
  type TableColumn,
  tablePropsSchema,
  TABLE_DEFAULTS,
  measureAllRows,
} from './table-types.js';

export const tablePlugin: Plugin<TableProps> = {
  type: 'table',
  propsSchema: tablePropsSchema,
  defaultProps: TABLE_DEFAULTS,
  canSplit: true,

  resolveProps(raw: Record<string, unknown>): TableProps {
    return { ...TABLE_DEFAULTS, ...raw } as TableProps;
  },

  validate(props: TableProps): ValidationError[] {
    const errors: ValidationError[] = [];
    if (!Array.isArray(props.columns) || props.columns.length === 0) {
      errors.push({ path: '/columns', message: 'must have at least one column' });
    }
    if (!Array.isArray(props.rows)) {
      errors.push({ path: '/rows', message: 'must be an array' });
    }
    return errors;
  },

  measure(props: TableProps, ctx: MeasureContext) {
    if (props.columns.length === 0) {
      return Promise.resolve({ width: ctx.availableWidth, height: 0 });
    }
    const m = measureAllRows(props, ctx);
    return Promise.resolve({ width: ctx.availableWidth, height: m.totalHeight });
  },

  render(props: TableProps, ctx: RenderContext): Promise<void> {
    if (props.columns.length === 0 || (props.rows.length === 0 && props.showHeader === false)) {
      return Promise.resolve();
    }

    const m = measureAllRows(props, ctx);
    const cellPadding = props.cellPadding ?? 4;
    const borderWidth = props.borderWidth ?? 0.5;
    const borderColor =
      borderWidth > 0 ? parseColor(props.borderColor ?? '#000000') : { r: 0, g: 0, b: 0 };
    const showHeader = props.showHeader !== false;

    let cursorY = 0; // offset from ctx.y going downward

    // Render header row
    if (showHeader) {
      const headerStyle: Style = props.headerStyle
        ? { ...ctx.elementStyle, ...ctx.resolveStyle(props.headerStyle) }
        : ctx.elementStyle;

      // Header background
      if (headerStyle.backgroundColor) {
        const bg = parseColor(headerStyle.backgroundColor);
        ctx.page.drawRectangle({
          x: ctx.x,
          y: ctx.y - cursorY - m.headerHeight,
          width: ctx.width,
          height: m.headerHeight,
          color: rgb(bg.r, bg.g, bg.b),
          opacity: ctx.opacity,
        });
      }

      // Header cell text
      renderRowCells(
        props.columns.map((col) => col.header ?? col.key),
        props.columns,
        m.columnWidths,
        m.headerHeight,
        cellPadding,
        headerStyle,
        ctx,
        cursorY,
      );

      // Header borders (top + verticals)
      if (borderWidth > 0) {
        drawRowTopAndVerticals(
          ctx,
          cursorY,
          m.headerHeight,
          m.columnWidths,
          borderWidth,
          borderColor,
        );
      }

      cursorY += m.headerHeight;
    }

    // Render data rows
    const rowStyle: Style = props.rowStyle
      ? { ...ctx.elementStyle, ...ctx.resolveStyle(props.rowStyle) }
      : ctx.elementStyle;
    const altStyle: Style = props.alternateRowStyle
      ? { ...ctx.elementStyle, ...ctx.resolveStyle(props.alternateRowStyle) }
      : rowStyle;

    for (let r = 0; r < props.rows.length; r++) {
      const style = r % 2 === 0 ? rowStyle : altStyle;
      const rowHeight = m.rowHeights[r];

      // Row background
      if (style.backgroundColor) {
        const bg = parseColor(style.backgroundColor);
        ctx.page.drawRectangle({
          x: ctx.x,
          y: ctx.y - cursorY - rowHeight,
          width: ctx.width,
          height: rowHeight,
          color: rgb(bg.r, bg.g, bg.b),
          opacity: ctx.opacity,
        });
      }

      // Cell text
      const cells = props.columns.map((col) => props.rows[r][col.key] ?? '');
      renderRowCells(
        cells,
        props.columns,
        m.columnWidths,
        rowHeight,
        cellPadding,
        style,
        ctx,
        cursorY,
      );

      // Row borders (top + verticals; no header? first row draws the top border)
      if (borderWidth > 0) {
        drawRowTopAndVerticals(ctx, cursorY, rowHeight, m.columnWidths, borderWidth, borderColor);
      }

      cursorY += rowHeight;
    }

    // Final bottom border
    if (borderWidth > 0 && (showHeader || props.rows.length > 0)) {
      drawTableBottomBorder(ctx, cursorY, borderWidth, borderColor);
    }
    return Promise.resolve();
  },

  split(
    props: TableProps,
    ctx: MeasureContext,
    availableHeight: number,
  ): Promise<{ fit: TableProps; overflow: TableProps } | null> {
    if (props.columns.length === 0 || props.rows.length === 0) {
      return Promise.resolve(null);
    }

    const m = measureAllRows(props, ctx);
    const showHeader = props.showHeader !== false;

    let consumed = 0;
    if (showHeader) {
      consumed += m.headerHeight;
      if (consumed > availableHeight) {
        return Promise.resolve(null); // can't even fit the header
      }
    }

    let fitRowCount = 0;
    for (let r = 0; r < props.rows.length; r++) {
      if (consumed + m.rowHeights[r] > availableHeight) break;
      consumed += m.rowHeights[r];
      fitRowCount++;
    }

    if (fitRowCount === 0) return Promise.resolve(null);
    if (fitRowCount === props.rows.length) return Promise.resolve(null);

    const fit: TableProps = {
      ...props,
      rows: props.rows.slice(0, fitRowCount),
    };

    const overflow: TableProps = {
      ...props,
      rows: props.rows.slice(fitRowCount),
      showHeader: props.headerRepeat !== false ? props.showHeader !== false : false,
    };

    return Promise.resolve({ fit, overflow });
  },
};

/** Render text in each cell of a row. */
function renderRowCells(
  cells: string[],
  columns: TableColumn[],
  columnWidths: number[],
  rowHeight: number,
  cellPadding: number,
  style: Style,
  ctx: RenderContext,
  offsetY: number,
): void {
  const font = getFont(ctx.fonts, style);
  const fontSize = style.fontSize ?? 12;
  const lineHeight = getLineHeight(style);
  const color = parseColor(style.color ?? '#000000');
  const ascent = font.heightAtSize(fontSize, { descender: false });
  const ls = style.letterSpacing ?? 0;
  const decoration = style.textDecoration;
  const needsCharSpacing = ls !== 0;

  let colX = 0;
  for (let c = 0; c < cells.length; c++) {
    const contentWidth = Math.max(0, columnWidths[c] - 2 * cellPadding);
    const wrapped = wrapText(
      cells[c],
      font,
      fontSize,
      contentWidth,
      lineHeight,
      undefined,
      ls || undefined,
    );
    const align = columns[c]?.align ?? style.textAlign ?? 'left';

    for (let i = 0; i < wrapped.lines.length; i++) {
      const line = wrapped.lines[i];
      if (line === '') continue;

      let lineX = ctx.x + colX + cellPadding;
      if (align === 'center' || align === 'right') {
        const lineWidth = measureTextWidth(line, font, fontSize, ls || undefined);
        if (align === 'center') {
          lineX += (contentWidth - lineWidth) / 2;
        } else {
          lineX += contentWidth - lineWidth;
        }
      }

      const lineY = ctx.y - offsetY - cellPadding - ascent - i * lineHeight;

      if (needsCharSpacing) {
        ctx.page.pushOperators(pushGraphicsState(), setCharacterSpacing(ls));
      }
      ctx.page.drawText(line, {
        x: lineX,
        y: lineY,
        font,
        size: fontSize,
        color: rgb(color.r, color.g, color.b),
        opacity: ctx.opacity,
      });
      if (needsCharSpacing) {
        ctx.page.pushOperators(popGraphicsState());
      }

      // Text decoration
      if (decoration && decoration !== 'none') {
        const lineWidth = measureTextWidth(line, font, fontSize, ls || undefined);
        drawTextDecoration(
          ctx.page,
          decoration,
          lineX,
          lineY,
          lineWidth,
          font,
          fontSize,
          color,
          ctx.opacity,
        );
      }
    }

    colX += columnWidths[c];
  }
}

/** Draw the top border and vertical borders for a row. */
function drawRowTopAndVerticals(
  ctx: RenderContext,
  offsetY: number,
  rowHeight: number,
  columnWidths: number[],
  borderWidth: number,
  borderColor: { r: number; g: number; b: number },
): void {
  const pdfColor = rgb(borderColor.r, borderColor.g, borderColor.b);
  const topY = ctx.y - offsetY;
  const bottomY = topY - rowHeight;

  // Top border
  ctx.page.drawLine({
    start: { x: ctx.x, y: topY },
    end: { x: ctx.x + ctx.width, y: topY },
    thickness: borderWidth,
    color: pdfColor,
    opacity: ctx.opacity,
  });

  // Vertical borders (left edge + column separators + right edge)
  let colX = 0;
  for (let c = 0; c <= columnWidths.length; c++) {
    ctx.page.drawLine({
      start: { x: ctx.x + colX, y: topY },
      end: { x: ctx.x + colX, y: bottomY },
      thickness: borderWidth,
      color: pdfColor,
      opacity: ctx.opacity,
    });
    if (c < columnWidths.length) colX += columnWidths[c];
  }
}

/** Draw the bottom border of the table. */
function drawTableBottomBorder(
  ctx: RenderContext,
  offsetY: number,
  borderWidth: number,
  borderColor: { r: number; g: number; b: number },
): void {
  const pdfColor = rgb(borderColor.r, borderColor.g, borderColor.b);
  const bottomY = ctx.y - offsetY;
  ctx.page.drawLine({
    start: { x: ctx.x, y: bottomY },
    end: { x: ctx.x + ctx.width, y: bottomY },
    thickness: borderWidth,
    color: pdfColor,
    opacity: ctx.opacity,
  });
}
