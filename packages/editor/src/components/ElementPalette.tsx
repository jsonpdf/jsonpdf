import { useCallback } from 'react';
import { ELEMENT_TYPES } from '../constants/element-defaults';
import styles from './ElementPalette.module.css';

const ELEMENT_LABELS: Record<string, string> = {
  text: 'Text',
  image: 'Image',
  line: 'Line',
  shape: 'Shape',
  container: 'Container',
  table: 'Table',
  chart: 'Chart',
  barcode: 'Barcode',
  list: 'List',
  frame: 'Frame',
};

const ELEMENT_ABBR: Record<string, string> = {
  text: 'T',
  image: 'Im',
  line: '\u2014',
  shape: '\u25A1',
  container: '\u229E',
  table: '\u2637',
  chart: '\u2261',
  barcode: '\u259A',
  list: '\u2630',
  frame: '\u25A3',
};

export const DRAG_TYPE = 'application/x-jsonpdf-element';

function PaletteItem({ type }: { type: string }) {
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData(DRAG_TYPE, type);
      e.dataTransfer.effectAllowed = 'copy';
    },
    [type],
  );

  return (
    <div
      className={styles.item}
      draggable
      onDragStart={handleDragStart}
      data-testid={`palette-${type}`}
    >
      <span className={styles.itemAbbr}>{ELEMENT_ABBR[type] ?? '?'}</span>
      <span className={styles.itemLabel}>{ELEMENT_LABELS[type] ?? type}</span>
    </div>
  );
}

export function ElementPalette() {
  return (
    <div className={styles.palette}>
      <div className={styles.header}>Elements</div>
      <div className={styles.grid}>
        {ELEMENT_TYPES.map((type) => (
          <PaletteItem key={type} type={type} />
        ))}
      </div>
    </div>
  );
}
