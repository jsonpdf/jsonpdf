import { useState } from 'react';
import { OutlinePanel } from '../outline';
import { StylesPanel } from '../styles';
import { FontsPanel } from '../fonts';
import { DataPanel } from '../data-schema';
import css from './LeftSidebar.module.css';

type LeftTab = 'outline' | 'styles' | 'fonts' | 'data';

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
          className={`${css.tab} ${activeTab === 'fonts' ? css.tabActive : ''}`}
          onClick={() => {
            setActiveTab('fonts');
          }}
        >
          Fonts
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
        ) : activeTab === 'fonts' ? (
          <FontsPanel />
        ) : (
          <DataPanel />
        )}
      </div>
    </div>
  );
}
