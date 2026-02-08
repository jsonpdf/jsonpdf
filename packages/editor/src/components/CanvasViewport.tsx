import { useRef, useState, useEffect } from 'react';
import { TemplateCanvas } from '../canvas/TemplateCanvas';
import styles from './CanvasViewport.module.css';

export function CanvasViewport() {
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
      <TemplateCanvas viewportWidth={viewportWidth} />
    </div>
  );
}
