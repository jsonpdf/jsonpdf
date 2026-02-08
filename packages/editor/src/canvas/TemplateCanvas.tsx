import { useMemo, useCallback } from 'react';
import { Stage, Layer } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useEditorStore } from '../store';
import { computeDesignLayout } from '../layout';
import { useSelectionGeometry } from '../hooks/useSelectionGeometry';
import { PageRenderer } from './PageRenderer';
import { SelectionOverlay } from './SelectionOverlay';

/** Gap between pages and padding around the canvas (in points). */
const PAGE_GAP = 40;
export const CANVAS_PADDING = 40;

export function TemplateCanvas() {
  const template = useEditorStore((s) => s.template);
  const zoom = useEditorStore((s) => s.zoom);
  const selectedElementId = useEditorStore((s) => s.selectedElementId);

  const pages = useMemo(() => computeDesignLayout(template), [template]);

  // Compute total canvas size
  const maxPageWidth = pages.reduce((max, p) => Math.max(max, p.pageConfig.width), 0);
  const totalHeight = pages.reduce(
    (sum, p) => sum + p.pageConfig.height + PAGE_GAP,
    CANVAS_PADDING * 2 - PAGE_GAP,
  );

  const stageWidth = (maxPageWidth + CANVAS_PADDING * 2) * zoom;
  const stageHeight = Math.max(totalHeight * zoom, 1);

  // Compute page Y offsets
  let currentY = CANVAS_PADDING;
  const pageOffsets = pages.map((p) => {
    const y = currentY;
    currentY += p.pageConfig.height + PAGE_GAP;
    return y;
  });

  const selectionGeometry = useSelectionGeometry(
    selectedElementId,
    pages,
    pageOffsets,
    CANVAS_PADDING,
  );

  const handleStageClick = useCallback((e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Deselect when clicking empty canvas
    if (e.target === e.target.getStage()) {
      useEditorStore.getState().setSelection(null);
    }
  }, []);

  const handleResizeEnd = useCallback(
    (newX: number, newY: number, newW: number, newH: number) => {
      if (!selectedElementId || !selectionGeometry) return;

      // Convert absolute canvas coordinates back to element-local coordinates
      // by computing the delta from the original geometry position
      const store = useEditorStore.getState();
      const template = store.template;

      // Find the element to get its current position
      for (const section of template.sections) {
        for (const band of section.bands) {
          const el = findElementRecursive(band.elements, selectedElementId);
          if (el) {
            const deltaX = newX - selectionGeometry.x;
            const deltaY = newY - selectionGeometry.y;
            store.updateElementBounds(selectedElementId, el.x + deltaX, el.y + deltaY, newW, newH);
            return;
          }
        }
      }
    },
    [selectedElementId, selectionGeometry],
  );

  return (
    <Stage
      width={stageWidth}
      height={stageHeight}
      scaleX={zoom}
      scaleY={zoom}
      onClick={handleStageClick}
      onTap={handleStageClick}
    >
      <Layer>
        {pages.map((page, i) => (
          <PageRenderer
            key={page.sectionId}
            page={page}
            x={CANVAS_PADDING}
            y={pageOffsets[i]}
            styles={template.styles}
          />
        ))}
      </Layer>
      <Layer>
        {selectionGeometry && (
          <SelectionOverlay
            geometry={selectionGeometry}
            zoom={zoom}
            onResizeEnd={handleResizeEnd}
          />
        )}
      </Layer>
    </Stage>
  );
}

/** Recursively find an element by ID. */
function findElementRecursive(
  elements: { id: string; x: number; y: number; elements?: typeof elements }[],
  id: string,
): { x: number; y: number } | null {
  for (const el of elements) {
    if (el.id === id) return { x: el.x, y: el.y };
    if (el.elements) {
      const found = findElementRecursive(el.elements, id);
      if (found) return found;
    }
  }
  return null;
}
