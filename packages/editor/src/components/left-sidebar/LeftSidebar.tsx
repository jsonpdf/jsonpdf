import { useState } from 'react';
import { OutlinePanel } from '../outline';
import { StylesPanel } from '../styles';
import css from './LeftSidebar.module.css';

type LeftTab = 'outline' | 'styles';

export function LeftSidebar() {
  const [activeTab, setActiveTab] = useState<LeftTab>('outline');

  return (
    <div className={css.sidebar}>
      <div className={css.tabRow}>
        <button
          className={`${css.tab} ${activeTab === 'outline' ? css.tabActive : ''}`}
          onClick={() => {
            setActiveTab('outline');
          }}
        >
          Outline
        </button>
        <button
          className={`${css.tab} ${activeTab === 'styles' ? css.tabActive : ''}`}
          onClick={() => {
            setActiveTab('styles');
          }}
        >
          Styles
        </button>
      </div>
      <div className={css.tabContent}>
        {activeTab === 'outline' ? <OutlinePanel /> : <StylesPanel />}
      </div>
    </div>
  );
}
