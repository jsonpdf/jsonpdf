import { useRef, useState, useEffect } from 'react';
import { useEditorStore } from '../../store';
import { useWheelZoom } from '../../hooks/use-wheel-zoom';
import { usePan } from '../../hooks/use-pan';
import { ReadOnlyCanvas, type CanvasItemClick } from '../../canvas/ReadOnlyCanvas';
import { CanvasToolbar } from '../canvas-toolbar';
import shared from '../viewport-shared.module.css';

interface ReadOnlyViewportProps {
  onItemClick?: (item: CanvasItemClick) => void;
}

export function ReadOnlyViewport({ onItemClick }: ReadOnlyViewportProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);

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

  let viewportClass = shared.viewport;
  if (activeTool === 'pan') {
    viewportClass += isPanning ? ` ${shared.grabbing}` : ` ${shared.grab}`;
  }

  return (
    <div className={shared.wrapper}>
      <div ref={ref} className={viewportClass} onMouseDown={handleMouseDown}>
        <ReadOnlyCanvas viewportWidth={viewportWidth} onItemClick={onItemClick} />
      </div>
      <CanvasToolbar />
    </div>
  );
}
