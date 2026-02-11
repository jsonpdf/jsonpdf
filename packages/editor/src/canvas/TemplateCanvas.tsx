import { useMemo, useCallback } from 'react';
import { Stage, Layer } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { findBand, findElement } from '@jsonpdf/template';
import { useEditorStore } from '../store';
import { computeDesignLayout } from '../layout';
import { useSelectionGeometry } from '../hooks/useSelectionGeometry';
import { collectSnapTargets } from '../snap/snap';
import { PageRenderer } from './PageRenderer';
import { SelectionOverlay } from './SelectionOverlay';
import type { SnapInfo } from './SelectionOverlay';
import { AlignmentGuides } from './AlignmentGuides';

/** Gap between pages and padding around the canvas (in points). */
export const PAGE_GAP = 40;
export const CANVAS_PADDING = 40;

interface TemplateCanvasProps {
  viewportWidth: number;
}

export function TemplateCanvas({ viewportWidth }: TemplateCanvasProps) {
  const template = useEditorStore((s) => s.template);
  const zoom = useEditorStore((s) => s.zoom);
  const selectedElementIds = useEditorStore((s) => s.selectedElementIds);
  const selectedBandId = useEditorStore((s) => s.selectedBandId);

  const pages = useMemo(() => computeDesignLayout(template), [template]);

  // Compute total canvas size
  const maxPageWidth = pages.reduce((max, p) => Math.max(max, p.pageConfig.width), 0);
  const totalHeight = pages.reduce(
    (sum, p) => sum + p.designHeight + PAGE_GAP,
    CANVAS_PADDING * 2 - PAGE_GAP,
  );

  const contentWidth = maxPageWidth + CANVAS_PADDING * 2;
  const stageWidth = Math.max(contentWidth * zoom, viewportWidth);
  const stageHeight = Math.max(totalHeight * zoom, 1);

  const stageWidthInPts = stageWidth / zoom;

  // Center each page individually within the stage
  const pageXOffsets = useMemo(
    () => pages.map((p) => Math.max(CANVAS_PADDING, (stageWidthInPts - p.pageConfig.width) / 2)),
    [pages, stageWidthInPts],
  );

  // Compute page Y offsets
  const pageYOffsets = useMemo(() => {
    let currentY = CANVAS_PADDING;
    return pages.map((p) => {
      const y = currentY;
      currentY += p.designHeight + PAGE_GAP;
      return y;
    });
  }, [pages]);

  const selectionGeometry = useSelectionGeometry(
    selectedElementIds,
    pages,
    pageXOffsets,
    pageYOffsets,
  );

  // Compute snap info for resize handles
  const snapInfo: SnapInfo | null = useMemo(() => {
    if (!selectedBandId || selectedElementIds.length === 0) return null;

    const bandResult = findBand(template, selectedBandId);
    if (!bandResult) return null;

    const { band, sectionIndex } = bandResult;
    const page = pages[sectionIndex];

    const { margins } = page.pageConfig;
    const bandContentWidth = page.pageConfig.width - margins.left - margins.right;
    const targets = collectSnapTargets(
      band.elements,
      selectedElementIds,
      bandContentWidth,
      band.height,
    );

    // Find the band's offsetY within the page
    const designBand = page.bands.find((db) => db.band.id === selectedBandId);
    if (!designBand) return null;

    const stageOffsetX = pageXOffsets[sectionIndex] + margins.left;
    const stageOffsetY = pageYOffsets[sectionIndex] + margins.top + designBand.offsetY;

    return {
      targets,
      stageOffsetX,
      stageOffsetY,
      bandId: selectedBandId,
      sectionIndex,
    };
  }, [template, selectedBandId, selectedElementIds, pages, pageXOffsets, pageYOffsets]);

  const handleStageClick = useCallback((e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Only deselect in select mode
    if (useEditorStore.getState().activeTool !== 'select') return;
    // Deselect when clicking empty canvas
    if (e.target === e.target.getStage()) {
      useEditorStore.getState().setSelection(null);
    }
  }, []);

  const handleResizeEnd = useCallback(
    (newX: number, newY: number, newW: number, newH: number) => {
      if (!selectionGeometry || selectedElementIds.length === 0) return;

      const store = useEditorStore.getState();
      const deltaX = newX - selectionGeometry.x;
      const deltaY = newY - selectionGeometry.y;

      if (selectedElementIds.length === 1) {
        // Single element: set exact position and size
        const singleId = selectedElementIds[0];
        const result = findElement(store.template, singleId);
        if (result) {
          const el = result.element;
          store.updateElementBounds(singleId, el.x + deltaX, el.y + deltaY, newW, newH);
        }
      } else {
        // Multiple elements: proportional resize
        const scaleX = newW / selectionGeometry.width;
        const scaleY = newH / selectionGeometry.height;
        store.resizeSelectedElements(deltaX, deltaY, scaleX, scaleY);
      }
    },
    [selectedElementIds, selectionGeometry],
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
            x={pageXOffsets[i]}
            y={pageYOffsets[i]}
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
            snapInfo={snapInfo}
          />
        )}
        <AlignmentGuides
          pages={pages}
          pageXOffsets={pageXOffsets}
          pageYOffsets={pageYOffsets}
          zoom={zoom}
        />
      </Layer>
    </Stage>
  );
}
