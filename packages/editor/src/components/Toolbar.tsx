import { useRef } from 'react';
import { useEditorStore } from '../store';
import styles from './Toolbar.module.css';

const ZOOM_STEP = 0.1;

export function Toolbar() {
  const name = useEditorStore((s) => s.template.name);
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = useEditorStore.getState().importTemplate(reader.result as string);
      if (!result.success) {
        alert(`Import failed:\n${result.error}`);
      }
    };
    reader.readAsText(file);

    // Reset so the same file can be re-imported
    e.target.value = '';
  };

  const handleExport = () => {
    const json = useEditorStore.getState().exportTemplate();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name || 'template'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.toolbar}>
      <div className={styles.name}>{name}</div>
      <div className={styles.fileControls}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className={styles.hiddenInput}
          onChange={handleFileChange}
          aria-label="Import template file"
        />
        <button className={styles.toolbarBtn} onClick={handleImport} aria-label="Import template">
          Import
        </button>
        <button className={styles.toolbarBtn} onClick={handleExport} aria-label="Export template">
          Export
        </button>
      </div>
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
