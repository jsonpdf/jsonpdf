import { useCallback } from 'react';
import type { PageConfig } from '@jsonpdf/core';
import { useEditorStore } from '../../store';
import { PropertyGroup, NumberField, TextField } from '../fields';
import { StyleFields } from '../styles/StyleFields';
import styles from './Panel.module.css';

export function TemplatePanel() {
  const name = useEditorStore((s) => s.template.name);
  const description = useEditorStore((s) => s.template.description);
  const page = useEditorStore((s) => s.template.page);
  const defaultStyle = useEditorStore((s) => s.template.defaultStyle);
  const updateTemplateProps = useEditorStore((s) => s.updateTemplateProps);

  const handlePageChange = useCallback(
    (updates: Partial<PageConfig>) => {
      updateTemplateProps({ page: updates });
    },
    [updateTemplateProps],
  );

  const handleDefaultStyleChange = useCallback(
    (key: string, value: unknown) => {
      updateTemplateProps({
        defaultStyle: { ...defaultStyle, [key]: value } as typeof defaultStyle,
      });
    },
    [defaultStyle, updateTemplateProps],
  );

  return (
    <div>
      <div className={styles.panelHeader}>Template</div>

      <PropertyGroup label="Info">
        <TextField
          label="Name"
          value={name}
          onChange={(v) => {
            updateTemplateProps({ name: v ?? 'Untitled Template' });
          }}
        />
        <TextField
          label="Description"
          value={description}
          onChange={(v) => {
            updateTemplateProps({ description: v });
          }}
          multiline
        />
      </PropertyGroup>

      <PropertyGroup label="Default Page">
        <NumberField
          label="Width"
          value={page.width}
          onChange={(v) => {
            handlePageChange({ width: v ?? 612 });
          }}
          min={1}
        />
        <NumberField
          label="Height"
          value={page.height}
          onChange={(v) => {
            handlePageChange({ height: v ?? 792 });
          }}
          min={1}
        />
        <NumberField
          label="Top"
          value={page.margins.top}
          onChange={(v) => {
            handlePageChange({ margins: { ...page.margins, top: v ?? 0 } });
          }}
          min={0}
        />
        <NumberField
          label="Right"
          value={page.margins.right}
          onChange={(v) => {
            handlePageChange({ margins: { ...page.margins, right: v ?? 0 } });
          }}
          min={0}
        />
        <NumberField
          label="Bottom"
          value={page.margins.bottom}
          onChange={(v) => {
            handlePageChange({ margins: { ...page.margins, bottom: v ?? 0 } });
          }}
          min={0}
        />
        <NumberField
          label="Left"
          value={page.margins.left}
          onChange={(v) => {
            handlePageChange({ margins: { ...page.margins, left: v ?? 0 } });
          }}
          min={0}
        />
      </PropertyGroup>

      <div className={styles.panelHeader}>Default Style</div>
      <StyleFields values={defaultStyle} onChange={handleDefaultStyleChange} />
    </div>
  );
}
