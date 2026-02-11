import { Toolbar } from './Toolbar';
import { CanvasViewport } from './CanvasViewport';
import { Sidebar } from './Sidebar';
import { LeftSidebar } from './left-sidebar';
import { BottomTabBar } from './bottom-tab-bar';
import { PreviewLayout } from './preview/preview-layout';
import { CodeLayout } from './code/code-layout';
import { useEditorStore } from '../store';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useFontFaceInjection } from '../hooks/use-font-face-injection';
import styles from './EditorShell.module.css';

export function EditorShell() {
  useKeyboardShortcuts();
  useFontFaceInjection();
  const activeTab = useEditorStore((s) => s.activeTab);

  return (
    <div className={styles.shell}>
      <Toolbar />
      <div className={styles.content}>
        {activeTab === 'editor' ? (
          <div className={styles.main}>
            <LeftSidebar />
            <CanvasViewport />
            <Sidebar />
          </div>
        ) : activeTab === 'code' ? (
          <CodeLayout />
        ) : (
          <PreviewLayout />
        )}
      </div>
      <BottomTabBar />
    </div>
  );
}
