import { useEditorStore } from '../../store';
import { OutlineTree } from './OutlineTree';
import styles from './Outline.module.css';

export function OutlinePanel() {
  const addSection = useEditorStore((s) => s.addSection);

  return (
    <div className={styles.outlinePanel}>
      <div className={styles.outlineHeader}>Outline</div>
      <div className={styles.outlineBody}>
        <OutlineTree />
        <button className={styles.addSectionBtn} onClick={addSection} aria-label="Add section">
          + Add Section
        </button>
      </div>
    </div>
  );
}
