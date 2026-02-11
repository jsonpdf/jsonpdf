import { useEffect, type RefObject } from 'react';
import { useEditorStore } from '../store';
import { ZOOM_STEP, MIN_ZOOM, MAX_ZOOM } from '../constants/zoom';

/** Attach Ctrl/Cmd+wheel zoom (cursor-centered) to a scrollable viewport element. */
export function useWheelZoom(ref: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();

      const store = useEditorStore.getState();
      const oldZoom = store.zoom;
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZoom + delta));
      if (newZoom === oldZoom) return;

      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const canvasX = (mouseX + el.scrollLeft) / oldZoom;
      const canvasY = (mouseY + el.scrollTop) / oldZoom;

      store.setZoom(newZoom);

      requestAnimationFrame(() => {
        el.scrollLeft = canvasX * newZoom - mouseX;
        el.scrollTop = canvasY * newZoom - mouseY;
      });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [ref]);
}
