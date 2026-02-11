import { useState } from 'react';
import { OutlinePanel } from '../outline';
import { StylesPanel } from '../styles';
import { DataPanel } from '../data-schema';
import css from './LeftSidebar.module.css';

type LeftTab = 'outline' | 'styles' | 'data';

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
        <button
          className={`${css.tab} ${activeTab === 'data' ? css.tabActive : ''}`}
          onClick={() => {
            setActiveTab('data');
          }}
        >
          Data
        </button>
      </div>
      <div className={css.tabContent}>
        {activeTab === 'outline' ? (
          <OutlinePanel />
        ) : activeTab === 'styles' ? (
          <StylesPanel />
        ) : (
          <DataPanel />
        )}
      </div>
    </div>
  );
}
