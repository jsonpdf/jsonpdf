import { OutlineTree } from './OutlineTree';
import styles from './Outline.module.css';

export function OutlinePanel() {
  return (
    <div className={styles.outlinePanel}>
      <div className={styles.outlineHeader}>Outline</div>
      <div className={styles.outlineBody}>
        <OutlineTree />
      </div>
    </div>
  );
}
