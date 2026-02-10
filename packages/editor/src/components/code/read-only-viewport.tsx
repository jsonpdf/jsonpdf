import { useRef, useState, useEffect } from 'react';
import { ReadOnlyCanvas, type CanvasItemClick } from '../../canvas/ReadOnlyCanvas';
import styles from './read-only-viewport.module.css';

interface ReadOnlyViewportProps {
  onItemClick?: (item: CanvasItemClick) => void;
}

export function ReadOnlyViewport({ onItemClick }: ReadOnlyViewportProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);

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

  return (
    <div ref={ref} className={styles.viewport}>
      <ReadOnlyCanvas viewportWidth={viewportWidth} onItemClick={onItemClick} />
    </div>
  );
}
