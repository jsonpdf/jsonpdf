import type { Element, JSONSchema, ValidationError } from '@jsonpdf/core';
import type { Plugin, MeasureContext, RenderContext } from '../types.js';

export interface ContainerProps {
  /** Layout mode for child elements. */
  layout: 'horizontal' | 'vertical' | 'absolute' | 'grid';
  /** Spacing between children in points (horizontal, vertical, grid). Default 0. */
  gap?: number;
  /** Number of columns for grid layout. Default 2. */
  gridColumns?: number;
  /** Cross-axis alignment for horizontal/vertical/grid layouts. */
  alignItems?: 'start' | 'center' | 'end';
}

export const containerPropsSchema: JSONSchema = {
  type: 'object',
  required: ['layout'],
  additionalProperties: false,
  properties: {
    layout: { type: 'string', enum: ['horizontal', 'vertical', 'absolute', 'grid'] },
    gap: { type: 'number', minimum: 0 },
    gridColumns: { type: 'integer', minimum: 1 },
    alignItems: { type: 'string', enum: ['start', 'center', 'end'] },
  },
};

const DEFAULTS: ContainerProps = {
  layout: 'absolute',
  gap: 0,
  gridColumns: 2,
  alignItems: 'start',
};

interface ChildLayout {
  element: Element;
  offsetX: number;
  offsetY: number;
}

async function measureChildren(
  children: Element[],
  measureChild: (element: Element) => Promise<{ width: number; height: number }>,
): Promise<Map<string, { width: number; height: number }>> {
  const entries = await Promise.all(
    children.map(async (child) => [child.id, await measureChild(child)] as const),
  );
  return new Map(entries);
}

function computeAbsoluteLayout(
  children: Element[],
  sizes: Map<string, { width: number; height: number }>,
): { layouts: ChildLayout[]; totalWidth: number; totalHeight: number } {
  const layouts: ChildLayout[] = [];
  let maxRight = 0;
  let maxBottom = 0;
  for (const child of children) {
    layouts.push({ element: child, offsetX: child.x, offsetY: child.y });
    const size = sizes.get(child.id);
    const childHeight = size ? size.height : child.height;
    maxRight = Math.max(maxRight, child.x + child.width);
    maxBottom = Math.max(maxBottom, child.y + childHeight);
  }
  return { layouts, totalWidth: maxRight, totalHeight: maxBottom };
}

function computeHorizontalLayout(
  children: Element[],
  sizes: Map<string, { width: number; height: number }>,
  gap: number,
  alignItems: string,
  containerHeight: number,
): { layouts: ChildLayout[]; totalWidth: number; totalHeight: number } {
  const layouts: ChildLayout[] = [];
  let cursorX = 0;
  let maxHeight = 0;

  for (const child of children) {
    const size = sizes.get(child.id);
    const childHeight = size ? size.height : child.height;
    maxHeight = Math.max(maxHeight, childHeight);
  }

  for (const child of children) {
    const size = sizes.get(child.id);
    const childHeight = size ? size.height : child.height;
    const offsetY = alignOffset(alignItems, containerHeight, childHeight);
    layouts.push({ element: child, offsetX: cursorX, offsetY });
    cursorX += child.width + gap;
  }

  const totalWidth = children.length > 0 ? cursorX - gap : 0;
  return { layouts, totalWidth, totalHeight: maxHeight };
}

function computeVerticalLayout(
  children: Element[],
  sizes: Map<string, { width: number; height: number }>,
  gap: number,
  alignItems: string,
  containerWidth: number,
): { layouts: ChildLayout[]; totalWidth: number; totalHeight: number } {
  const layouts: ChildLayout[] = [];
  let cursorY = 0;
  let maxWidth = 0;

  for (const child of children) {
    maxWidth = Math.max(maxWidth, child.width);
  }

  for (const child of children) {
    const size = sizes.get(child.id);
    const childHeight = size ? size.height : child.height;
    const offsetX = alignOffset(alignItems, containerWidth, child.width);
    layouts.push({ element: child, offsetX, offsetY: cursorY });
    cursorY += childHeight + gap;
  }

  const totalHeight = children.length > 0 ? cursorY - gap : 0;
  return { layouts, totalWidth: maxWidth, totalHeight };
}

function computeGridLayout(
  children: Element[],
  sizes: Map<string, { width: number; height: number }>,
  gap: number,
  gridColumns: number,
  alignItems: string,
  containerWidth: number,
): { layouts: ChildLayout[]; totalWidth: number; totalHeight: number } {
  const layouts: ChildLayout[] = [];
  const colWidth = (containerWidth - gap * (gridColumns - 1)) / gridColumns;

  // Compute row heights
  const rowCount = Math.ceil(children.length / gridColumns);
  const rowHeights: number[] = [];

  for (let row = 0; row < rowCount; row++) {
    let maxH = 0;
    for (let col = 0; col < gridColumns; col++) {
      const idx = row * gridColumns + col;
      if (idx >= children.length) break;
      const child = children[idx];
      const size = sizes.get(child.id);
      const childHeight = size ? size.height : child.height;
      maxH = Math.max(maxH, childHeight);
    }
    rowHeights.push(maxH);
  }

  let cursorY = 0;
  for (let row = 0; row < rowCount; row++) {
    for (let col = 0; col < gridColumns; col++) {
      const idx = row * gridColumns + col;
      if (idx >= children.length) break;
      const child = children[idx];
      const size = sizes.get(child.id);
      const childHeight = size ? size.height : child.height;
      const offsetX = col * (colWidth + gap);
      const offsetY = cursorY + alignOffset(alignItems, rowHeights[row], childHeight);
      layouts.push({ element: child, offsetX, offsetY });
    }
    cursorY += rowHeights[row] + gap;
  }

  const totalHeight = rowCount > 0 ? cursorY - gap : 0;
  return { layouts, totalWidth: containerWidth, totalHeight };
}

function alignOffset(alignItems: string, available: number, size: number): number {
  switch (alignItems) {
    case 'center':
      return (available - size) / 2;
    case 'end':
      return available - size;
    default:
      return 0;
  }
}

export const containerPlugin: Plugin<ContainerProps> = {
  type: 'container',
  propsSchema: containerPropsSchema,
  defaultProps: DEFAULTS,

  resolveProps(raw: Record<string, unknown>): ContainerProps {
    return { ...DEFAULTS, ...raw } as ContainerProps;
  },

  validate(props: ContainerProps): ValidationError[] {
    const errors: ValidationError[] = [];
    if (props.layout === 'grid' && props.gridColumns !== undefined && props.gridColumns < 1) {
      errors.push({ path: '/gridColumns', message: 'must be at least 1' });
    }
    return errors;
  },

  async measure(props: ContainerProps, ctx: MeasureContext) {
    const children = ctx.children ?? [];
    if (children.length === 0) {
      return { width: ctx.availableWidth, height: ctx.availableHeight };
    }
    if (!ctx.measureChild) {
      return { width: ctx.availableWidth, height: ctx.availableHeight };
    }

    const sizes = await measureChildren(children, ctx.measureChild);
    const gap = props.gap ?? 0;
    const align = props.alignItems ?? 'start';

    let result: { totalWidth: number; totalHeight: number };
    switch (props.layout) {
      case 'absolute':
        result = computeAbsoluteLayout(children, sizes);
        break;
      case 'horizontal':
        result = computeHorizontalLayout(children, sizes, gap, align, ctx.availableHeight);
        break;
      case 'vertical':
        result = computeVerticalLayout(children, sizes, gap, align, ctx.availableWidth);
        break;
      case 'grid':
        result = computeGridLayout(
          children,
          sizes,
          gap,
          props.gridColumns ?? 2,
          align,
          ctx.availableWidth,
        );
        break;
    }

    return { width: result.totalWidth, height: result.totalHeight };
  },

  async render(props: ContainerProps, ctx: RenderContext) {
    const children = ctx.children ?? [];
    if (children.length === 0 || !ctx.renderChild) return;

    if (!ctx.measureChild) {
      throw new Error('Container plugin requires measureChild callback');
    }

    const sizes = await measureChildren(children, ctx.measureChild);
    const gap = props.gap ?? 0;
    const align = props.alignItems ?? 'start';

    let layouts: ChildLayout[];
    switch (props.layout) {
      case 'absolute':
        layouts = computeAbsoluteLayout(children, sizes).layouts;
        break;
      case 'horizontal':
        layouts = computeHorizontalLayout(children, sizes, gap, align, ctx.height).layouts;
        break;
      case 'vertical':
        layouts = computeVerticalLayout(children, sizes, gap, align, ctx.width).layouts;
        break;
      case 'grid':
        layouts = computeGridLayout(
          children,
          sizes,
          gap,
          props.gridColumns ?? 2,
          align,
          ctx.width,
        ).layouts;
        break;
    }

    for (const layout of layouts) {
      await ctx.renderChild(layout.element, layout.offsetX, layout.offsetY);
    }
  },
};
