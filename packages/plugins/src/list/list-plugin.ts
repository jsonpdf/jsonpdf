import { rgb, pushGraphicsState, popGraphicsState, setCharacterSpacing } from 'pdf-lib';
import { parseColor } from '@jsonpdf/core';
import type { ValidationError, JSONSchema } from '@jsonpdf/core';
import type { Plugin, MeasureContext, RenderContext } from '../types.js';
import { getFont, getLineHeight } from '../utils.js';
import { wrapText, measureTextWidth } from '../text/word-wrap.js';
import { drawTextDecoration } from '../text/text-decoration.js';
import { toListItem } from './list-types.js';
import type { ListItemInput, ListItem } from './list-types.js';

export interface ListProps {
  listType?: 'bullet' | 'numbered' | 'lettered';
  items: ListItemInput[];
  bulletStyle?: string;
  indent?: number;
  itemSpacing?: number;
}

export const listPropsSchema: JSONSchema = {
  type: 'object',
  required: ['items'],
  properties: {
    listType: { type: 'string', enum: ['bullet', 'numbered', 'lettered'] },
    items: { type: 'array' },
    bulletStyle: { type: 'string' },
    indent: { type: 'number', minimum: 0 },
    itemSpacing: { type: 'number', minimum: 0 },
  },
};

function getMarker(
  listType: 'bullet' | 'numbered' | 'lettered',
  index: number,
  bulletStyle: string,
): string {
  switch (listType) {
    case 'bullet':
      return bulletStyle;
    case 'numbered':
      return `${String(index + 1)}.`;
    case 'lettered':
      return `${toLetter(index)}.`;
  }
}

function toLetter(index: number): string {
  let result = '';
  let n = index;
  do {
    result = String.fromCharCode(97 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return result;
}

function measureItems(
  items: ListItem[],
  ctx: MeasureContext,
  listType: 'bullet' | 'numbered' | 'lettered',
  bulletStyle: string,
  indent: number,
  itemSpacing: number,
  depth: number,
): number {
  const style = ctx.elementStyle;
  const font = getFont(ctx.fonts, style);
  const fontSize = style.fontSize ?? 12;
  const lh = getLineHeight(style);

  const ls = style.letterSpacing ?? 0;

  let totalHeight = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const depthIndent = depth * indent;
    const marker = getMarker(listType, i, bulletStyle);
    const markerWidth = measureTextWidth(marker + ' ', font, fontSize, ls || undefined);
    const contentWidth = ctx.availableWidth - depthIndent - markerWidth;

    const text =
      typeof item.content === 'string' ? item.content : item.content.map((r) => r.text).join('');
    const wrapped = wrapText(
      text,
      font,
      fontSize,
      Math.max(contentWidth, 1),
      lh,
      undefined,
      ls || undefined,
    );
    totalHeight += wrapped.height;

    if (item.children && item.children.length > 0) {
      totalHeight += itemSpacing;
      totalHeight += measureItems(
        item.children,
        ctx,
        listType,
        bulletStyle,
        indent,
        itemSpacing,
        depth + 1,
      );
    }

    if (i < items.length - 1) {
      totalHeight += itemSpacing;
    }
  }

  return totalHeight;
}

function renderItems(
  items: ListItem[],
  ctx: RenderContext,
  listType: 'bullet' | 'numbered' | 'lettered',
  bulletStyle: string,
  indent: number,
  itemSpacing: number,
  depth: number,
  offsetY: number,
): number {
  const style = ctx.elementStyle;
  const font = getFont(ctx.fonts, style);
  const fontSize = style.fontSize ?? 12;
  const lh = getLineHeight(style);
  const color = parseColor(style.color ?? '#000000');
  const pdfColor = rgb(color.r, color.g, color.b);
  const ascent = font.heightAtSize(fontSize, { descender: false });
  const ls = style.letterSpacing ?? 0;
  const decoration = style.textDecoration;
  const needsCharSpacing = ls !== 0;

  let currentY = offsetY;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const depthIndent = depth * indent;
    const marker = getMarker(listType, i, bulletStyle);
    const markerWidth = measureTextWidth(marker + ' ', font, fontSize, ls || undefined);
    const contentX = ctx.x + depthIndent + markerWidth;
    const contentWidth = ctx.width - depthIndent - markerWidth;

    // Draw marker
    if (needsCharSpacing) {
      ctx.page.pushOperators(pushGraphicsState(), setCharacterSpacing(ls));
    }
    ctx.page.drawText(marker, {
      x: ctx.x + depthIndent,
      y: ctx.y - currentY - ascent,
      font,
      size: fontSize,
      color: pdfColor,
      opacity: ctx.opacity,
    });
    if (needsCharSpacing) {
      ctx.page.pushOperators(popGraphicsState());
    }

    // Draw content
    const text =
      typeof item.content === 'string' ? item.content : item.content.map((r) => r.text).join('');
    const wrapped = wrapText(
      text,
      font,
      fontSize,
      Math.max(contentWidth, 1),
      lh,
      undefined,
      ls || undefined,
    );

    for (let j = 0; j < wrapped.lines.length; j++) {
      const line = wrapped.lines[j];
      if (line === '') continue;

      const lineY = ctx.y - currentY - j * lh - ascent;

      if (needsCharSpacing) {
        ctx.page.pushOperators(pushGraphicsState(), setCharacterSpacing(ls));
      }
      ctx.page.drawText(line, {
        x: contentX,
        y: lineY,
        font,
        size: fontSize,
        color: pdfColor,
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
          contentX,
          lineY,
          lineWidth,
          font,
          fontSize,
          color,
          ctx.opacity,
        );
      }
    }

    currentY += wrapped.height;

    if (item.children && item.children.length > 0) {
      currentY += itemSpacing;
      currentY = renderItems(
        item.children,
        ctx,
        listType,
        bulletStyle,
        indent,
        itemSpacing,
        depth + 1,
        currentY,
      );
    }

    if (i < items.length - 1) {
      currentY += itemSpacing;
    }
  }

  return currentY;
}

const LIST_DEFAULTS: ListProps = {
  listType: 'bullet',
  items: [],
  bulletStyle: '\u2022',
  indent: 20,
  itemSpacing: 2,
};

export const listPlugin: Plugin<ListProps> = {
  type: 'list',
  propsSchema: listPropsSchema,
  defaultProps: LIST_DEFAULTS,

  resolveProps(raw: Record<string, unknown>): ListProps {
    return { ...LIST_DEFAULTS, ...raw } as ListProps;
  },

  validate(props: ListProps): ValidationError[] {
    const errors: ValidationError[] = [];
    if (!Array.isArray(props.items)) {
      errors.push({ path: '/items', message: 'items must be an array' });
    }
    return errors;
  },

  measure(props: ListProps, ctx: MeasureContext): Promise<{ width: number; height: number }> {
    const items = props.items.map(toListItem);
    if (items.length === 0) {
      return Promise.resolve({ width: ctx.availableWidth, height: 0 });
    }

    const height = measureItems(
      items,
      ctx,
      props.listType ?? 'bullet',
      props.bulletStyle ?? '\u2022',
      props.indent ?? 20,
      props.itemSpacing ?? 2,
      0,
    );

    return Promise.resolve({ width: ctx.availableWidth, height });
  },

  render(props: ListProps, ctx: RenderContext): Promise<void> {
    const items = props.items.map(toListItem);
    if (items.length === 0) return Promise.resolve();

    renderItems(
      items,
      ctx,
      props.listType ?? 'bullet',
      props.bulletStyle ?? '\u2022',
      props.indent ?? 20,
      props.itemSpacing ?? 2,
      0,
      0,
    );

    return Promise.resolve();
  },
};
