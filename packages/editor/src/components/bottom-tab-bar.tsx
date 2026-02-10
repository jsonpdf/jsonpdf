import { useEditorStore } from '../store';
import styles from './bottom-tab-bar.module.css';

const TABS = [
  { id: 'editor', label: 'Editor' },
  { id: 'preview', label: 'Preview' },
] as const;

export function BottomTabBar() {
  const activeTab = useEditorStore((s) => s.activeTab);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);

  return (
    <div className={styles.tabBar}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
          onClick={() => {
            setActiveTab(tab.id);
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
