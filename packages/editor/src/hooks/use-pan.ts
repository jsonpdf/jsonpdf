import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useEditorStore } from '../store';

interface UsePanResult {
  isPanning: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
}

/**
 * Pan-mode mouse handling for a scrollable viewport.
 * Uses window-level mousemove/mouseup so dragging outside the viewport
 * continues the pan rather than cancelling it.
 */
export function usePan(ref: RefObject<HTMLDivElement | null>): UsePanResult {
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(
    null,
  );

  const activeTool = useEditorStore((s) => s.activeTool);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool !== 'pan' || e.button !== 0) return;
      const el = ref.current;
      if (!el) return;
      setIsPanning(true);
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: el.scrollLeft,
        scrollTop: el.scrollTop,
      };
    },
    [activeTool, ref],
  );

  useEffect(() => {
    if (!isPanning) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!panStart.current) return;
      const el = ref.current;
      if (!el) return;
      el.scrollLeft = panStart.current.scrollLeft - (e.clientX - panStart.current.x);
      el.scrollTop = panStart.current.scrollTop - (e.clientY - panStart.current.y);
    };

    const handleMouseUp = () => {
      setIsPanning(false);
      panStart.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, ref]);

  return { isPanning, handleMouseDown };
}
