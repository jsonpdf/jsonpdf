import { Toolbar } from './Toolbar';
import { CanvasViewport } from './CanvasViewport';
import { Sidebar } from './Sidebar';
import styles from './EditorShell.module.css';

export function EditorShell() {
  return (
    <div className={styles.shell}>
      <Toolbar />
      <div className={styles.main}>
        <CanvasViewport />
        <Sidebar />
      </div>
    </div>
  );
}
