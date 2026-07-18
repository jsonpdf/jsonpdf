import type { Element } from '@jsonpdf/core';

export interface ContainerChildLayout {
  element: Element;
  offsetX: number;
  offsetY: number;
}

function alignOffset(alignItems: unknown, available: number, size: number): number {
  switch (alignItems) {
    case 'center':
      return (available - size) / 2;
    case 'end':
      return available - size;
    default:
      return 0;
  }
}

export function computeContainerChildLayouts(container: Element): ContainerChildLayout[] {
  const children = container.elements ?? [];
  const layout = container.properties.layout ?? 'absolute';
  const gap = typeof container.properties.gap === 'number' ? container.properties.gap : 0;
  const alignItems = container.properties.alignItems;

  switch (layout) {
    case 'horizontal': {
      let cursorX = 0;
      return children.map((child) => {
        const offset = {
          element: child,
          offsetX: cursorX,
          offsetY: alignOffset(alignItems, container.height, child.height),
        };
        cursorX += child.width + gap;
        return offset;
      });
    }
    case 'vertical': {
      let cursorY = 0;
      return children.map((child) => {
        const offset = {
          element: child,
          offsetX: alignOffset(alignItems, container.width, child.width),
          offsetY: cursorY,
        };
        cursorY += child.height + gap;
        return offset;
      });
    }
    case 'grid': {
      const rawColumns = container.properties.gridColumns;
      const gridColumns =
        typeof rawColumns === 'number' && Number.isFinite(rawColumns)
          ? Math.max(1, Math.floor(rawColumns))
          : 2;
      const columnWidth = (container.width - gap * (gridColumns - 1)) / gridColumns;
      const rowCount = Math.ceil(children.length / gridColumns);
      const rowHeights: number[] = [];

      for (let row = 0; row < rowCount; row++) {
        let maxHeight = 0;
        const columnsInRow = Math.min(gridColumns, children.length - row * gridColumns);
        for (let col = 0; col < columnsInRow; col++) {
          const child = children[row * gridColumns + col];
          maxHeight = Math.max(maxHeight, child.height);
        }
        rowHeights.push(maxHeight);
      }

      let cursorY = 0;
      const layouts: ContainerChildLayout[] = [];
      for (let row = 0; row < rowCount; row++) {
        const columnsInRow = Math.min(gridColumns, children.length - row * gridColumns);
        for (let col = 0; col < columnsInRow; col++) {
          const child = children[row * gridColumns + col];
          layouts.push({
            element: child,
            offsetX: col * (columnWidth + gap),
            offsetY: cursorY + alignOffset(alignItems, rowHeights[row], child.height),
          });
        }
        cursorY += rowHeights[row] + gap;
      }
      return layouts;
    }
    default:
      return children.map((child) => ({ element: child, offsetX: child.x, offsetY: child.y }));
  }
}
