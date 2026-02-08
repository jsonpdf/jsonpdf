import { useCallback } from 'react';
import type { Section, PageConfig } from '@jsonpdf/core';
import { useEditorStore } from '../../store';
import { PropertyGroup, NumberField, TextField, SelectField } from '../fields';
import styles from './Panel.module.css';

const COLUMN_MODE_OPTIONS = [
  { value: 'tile', label: 'Tile' },
  { value: 'flow', label: 'Flow' },
];

interface SectionPanelProps {
  section: Section;
}

export function SectionPanel({ section }: SectionPanelProps) {
  const page = useEditorStore((s) => s.template.page);
  const updateSectionProps = useEditorStore((s) => s.updateSectionProps);

  const update = useCallback(
    (updates: Partial<Omit<Section, 'id' | 'bands'>>) => {
      updateSectionProps(section.id, updates);
    },
    [section.id, updateSectionProps],
  );

  const handlePageOverride = useCallback(
    (updates: Partial<PageConfig>) => {
      const current = section.page ?? {};
      update({ page: { ...current, ...updates } });
    },
    [section.page, update],
  );

  return (
    <div>
      <div className={styles.panelHeader}>Section</div>
      <div className={styles.panelSubheader}>{section.id}</div>

      <PropertyGroup label="Section">
        <TextField
          label="Name"
          value={section.name}
          onChange={(v) => {
            update({ name: v });
          }}
        />
        <NumberField
          label="Columns"
          value={section.columns}
          onChange={(v) => {
            update({ columns: v });
          }}
          min={1}
          step={1}
          placeholder="1"
        />
        <NumberField
          label="Col Gap"
          value={section.columnGap}
          onChange={(v) => {
            update({ columnGap: v });
          }}
          min={0}
          placeholder="0"
        />
        <SelectField
          label="Col Mode"
          value={section.columnMode}
          onChange={(v) => {
            update({ columnMode: v as 'tile' | 'flow' | undefined });
          }}
          options={COLUMN_MODE_OPTIONS}
          allowEmpty
        />
        <TextField
          label="Bookmark"
          value={section.bookmark}
          onChange={(v) => {
            update({ bookmark: v });
          }}
        />
      </PropertyGroup>

      <PropertyGroup label="Page Overrides">
        <NumberField
          label="Width"
          value={section.page?.width}
          onChange={(v) => {
            handlePageOverride({ width: v });
          }}
          min={1}
          placeholder={String(page.width)}
        />
        <NumberField
          label="Height"
          value={section.page?.height}
          onChange={(v) => {
            handlePageOverride({ height: v });
          }}
          min={1}
          placeholder={String(page.height)}
        />
        <NumberField
          label="Top"
          value={section.page?.margins?.top}
          onChange={(v) => {
            const current = section.page?.margins ?? {};
            handlePageOverride({
              margins: { ...page.margins, ...current, top: v ?? page.margins.top },
            });
          }}
          min={0}
          placeholder={String(page.margins.top)}
        />
        <NumberField
          label="Right"
          value={section.page?.margins?.right}
          onChange={(v) => {
            const current = section.page?.margins ?? {};
            handlePageOverride({
              margins: { ...page.margins, ...current, right: v ?? page.margins.right },
            });
          }}
          min={0}
          placeholder={String(page.margins.right)}
        />
        <NumberField
          label="Bottom"
          value={section.page?.margins?.bottom}
          onChange={(v) => {
            const current = section.page?.margins ?? {};
            handlePageOverride({
              margins: { ...page.margins, ...current, bottom: v ?? page.margins.bottom },
            });
          }}
          min={0}
          placeholder={String(page.margins.bottom)}
        />
        <NumberField
          label="Left"
          value={section.page?.margins?.left}
          onChange={(v) => {
            const current = section.page?.margins ?? {};
            handlePageOverride({
              margins: { ...page.margins, ...current, left: v ?? page.margins.left },
            });
          }}
          min={0}
          placeholder={String(page.margins.left)}
        />
      </PropertyGroup>
    </div>
  );
}
