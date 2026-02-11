import { useEditorStore } from '../store';
import { ZOOM_STEP } from '../constants/zoom';
import styles from './canvas-toolbar.module.css';

const ZOOM_PRESETS = [50, 75, 100, 125, 150, 200];

/** Inline SVG icon: pointer/cursor for select tool. */
function SelectIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 1L3 12.5L6.5 9L10.5 15L12.5 14L8.5 8L13 8L3 1Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Inline SVG icon: open hand for pan tool. */
function PanIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6 8V3.5a1 1 0 0 1 2 0V8M8 3.5V2a1 1 0 0 1 2 0v6M10 4a1 1 0 0 1 2 0v5.5a4.5 4.5 0 0 1-4.5 4.5h-.3A4.5 4.5 0 0 1 3 9.7V6.5a1 1 0 0 1 2 0V8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CanvasToolbar() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);

  return (
    <div className={styles.toolbar}>
      <button
        className={`${styles.toolBtn} ${activeTool === 'select' ? styles.toolBtnActive : ''}`}
        onClick={() => {
          setActiveTool('select');
        }}
        aria-label="Select tool (V)"
        title="Select tool (V)"
      >
        <SelectIcon />
      </button>
      <button
        className={`${styles.toolBtn} ${activeTool === 'pan' ? styles.toolBtnActive : ''}`}
        onClick={() => {
          setActiveTool('pan');
        }}
        aria-label="Pan tool (H)"
        title="Pan tool (H)"
      >
        <PanIcon />
      </button>

      <div className={styles.separator} />

      <button
        className={styles.zoomBtn}
        onClick={() => {
          setZoom(zoom - ZOOM_STEP);
        }}
        aria-label="Zoom out"
      >
        -
      </button>
      <select
        className={styles.zoomSelect}
        value={Math.round(zoom * 100)}
        onChange={(e) => {
          setZoom(Number(e.target.value) / 100);
        }}
        aria-label="Zoom level"
      >
        {!ZOOM_PRESETS.includes(Math.round(zoom * 100)) && (
          <option value={Math.round(zoom * 100)}>{Math.round(zoom * 100)}%</option>
        )}
        {ZOOM_PRESETS.map((pct) => (
          <option key={pct} value={pct}>
            {pct}%
          </option>
        ))}
      </select>
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
  );
}
