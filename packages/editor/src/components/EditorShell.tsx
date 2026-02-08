import { Toolbar } from './Toolbar';
import { CanvasViewport } from './CanvasViewport';
import { Sidebar } from './Sidebar';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import styles from './EditorShell.module.css';

export function EditorShell() {
  useKeyboardShortcuts();

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
