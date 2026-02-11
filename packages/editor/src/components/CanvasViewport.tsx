import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useEditorStore } from '../store';
import { computeDesignLayout } from '../layout';
import { useWheelZoom } from '../hooks/use-wheel-zoom';
import { usePan } from '../hooks/use-pan';
import { DRAG_TYPE } from './ElementPalette';
import { TemplateCanvas, CANVAS_PADDING, PAGE_GAP } from '../canvas/TemplateCanvas';
import { CanvasToolbar } from './canvas-toolbar';
import shared from './viewport-shared.module.css';
import styles from './CanvasViewport.module.css';

export function CanvasViewport() {
  const ref = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [dropActive, setDropActive] = useState(false);

  const activeTool = useEditorStore((s) => s.activeTool);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
    };
  }, []);

  useWheelZoom(ref);
  const { isPanning, handleMouseDown } = usePan(ref);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDropActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only deactivate when leaving the viewport (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropActive(false);
    }
  }, []);

  const template = useEditorStore((s) => s.template);
  const zoom = useEditorStore((s) => s.zoom);
  const addElement = useEditorStore((s) => s.addElement);

  const pages = useMemo(() => computeDesignLayout(template), [template]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      setDropActive(false);
      const elementType = e.dataTransfer.getData(DRAG_TYPE);
      if (!elementType) return;
      e.preventDefault();

      const el = ref.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left + el.scrollLeft) / zoom;
      const canvasY = (e.clientY - rect.top + el.scrollTop) / zoom;

      // Compute page offsets (same logic as TemplateCanvas)
      const maxPageWidth = pages.reduce((max, p) => Math.max(max, p.pageConfig.width), 0);
      const contentWidth = maxPageWidth + CANVAS_PADDING * 2;
      const stageWidth = Math.max(contentWidth * zoom, viewportWidth);
      const stageWidthInPts = stageWidth / zoom;

      let currentY = CANVAS_PADDING;
      for (const page of pages) {
        const pageX = Math.max(CANVAS_PADDING, (stageWidthInPts - page.pageConfig.width) / 2);
        const pageY = currentY;
        const pageBottom = pageY + page.designHeight;

        if (canvasY >= pageY && canvasY < pageBottom) {
          // Inside this page — find the band
          const contentX = canvasX - pageX - page.pageConfig.margins.left;
          const contentY = canvasY - pageY - page.pageConfig.margins.top;

          for (const db of page.bands) {
            if (contentY >= db.offsetY && contentY < db.offsetY + db.height) {
              const localX = Math.max(0, contentX);
              const localY = Math.max(0, contentY - db.offsetY);
              addElement(db.band.id, elementType, localX, localY);
              return;
            }
          }
        }
        currentY = pageBottom + PAGE_GAP;
      }
    },
    [pages, zoom, viewportWidth, addElement],
  );

  let viewportClass = shared.viewport;
  if (dropActive) viewportClass += ` ${styles.dropActive}`;
  if (activeTool === 'pan') {
    viewportClass += isPanning ? ` ${shared.grabbing}` : ` ${shared.grab}`;
  }

  return (
    <div className={shared.wrapper}>
      <div
        ref={ref}
        className={viewportClass}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseDown={handleMouseDown}
      >
        <TemplateCanvas viewportWidth={viewportWidth} />
      </div>
      <CanvasToolbar />
    </div>
  );
}
