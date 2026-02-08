import { useEditorStore } from '../store';
import styles from './Toolbar.module.css';

const ZOOM_STEP = 0.1;

export function Toolbar() {
  const name = useEditorStore((s) => s.template.name);
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);

  return (
    <div className={styles.toolbar}>
      <div className={styles.name}>{name}</div>
      <div className={styles.zoomControls}>
        <button
          className={styles.zoomBtn}
          onClick={() => {
            setZoom(zoom - ZOOM_STEP);
          }}
          aria-label="Zoom out"
        >
          -
        </button>
        <span className={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
        <button
          className={styles.zoomBtn}
          onClick={() => {
            setZoom(zoom + ZOOM_STEP);
          }}
          aria-label="Zoom in"
        >
          +
        </button>
      </div>
    </div>
  );
}
