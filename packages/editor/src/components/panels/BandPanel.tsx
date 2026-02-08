import { useCallback } from 'react';
import type { Band } from '@jsonpdf/core';
import { useEditorStore } from '../../store';
import { PropertyGroup, NumberField, TextField, CheckboxField, ColorField } from '../fields';
import styles from './Panel.module.css';

const DATA_BAND_TYPES = new Set(['detail', 'groupHeader', 'groupFooter']);

function bandTypeLabel(type: string): string {
  return type.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
}

interface BandPanelProps {
  band: Band;
}

export function BandPanel({ band }: BandPanelProps) {
  const updateBandProps = useEditorStore((s) => s.updateBandProps);
  const updateBandHeight = useEditorStore((s) => s.updateBandHeight);

  const update = useCallback(
    (updates: Partial<Omit<Band, 'id' | 'elements'>>) => {
      updateBandProps(band.id, updates);
    },
    [band.id, updateBandProps],
  );

  const showData = DATA_BAND_TYPES.has(band.type);
  const isColumnFooter = band.type === 'columnFooter';

  // Handle backgroundColor: only support string values for MVP (not gradients)
  const bgColor =
    band.backgroundColor && typeof band.backgroundColor === 'string'
      ? band.backgroundColor
      : undefined;

  return (
    <div>
      <div className={styles.panelHeader}>{bandTypeLabel(band.type)} Band</div>
      <div className={styles.panelSubheader}>{band.id}</div>

      <PropertyGroup label="Band">
        <NumberField
          label="Height"
          value={band.height}
          onChange={(v) => {
            updateBandHeight(band.id, v ?? 10);
          }}
          min={10}
        />
        <CheckboxField
          label="Auto Height"
          value={band.autoHeight}
          onChange={(v) => {
            update({ autoHeight: v });
          }}
        />
        <TextField
          label="Condition"
          value={band.condition}
          onChange={(v) => {
            update({ condition: v });
          }}
          placeholder="Liquid expression"
        />
        <ColorField
          label="Background"
          value={bgColor}
          onChange={(v) => {
            update({ backgroundColor: v });
          }}
        />
      </PropertyGroup>

      {showData && (
        <PropertyGroup label="Data">
          <TextField
            label="Data Source"
            value={band.dataSource}
            onChange={(v) => {
              update({ dataSource: v });
            }}
          />
          <TextField
            label="Item Name"
            value={band.itemName}
            onChange={(v) => {
              update({ itemName: v });
            }}
            placeholder="item"
          />
          <TextField
            label="Group By"
            value={band.groupBy}
            onChange={(v) => {
              update({ groupBy: v });
            }}
          />
        </PropertyGroup>
      )}

      <PropertyGroup label="Advanced" defaultOpen={false}>
        {isColumnFooter && (
          <CheckboxField
            label="Float"
            value={band.float}
            onChange={(v) => {
              update({ float: v });
            }}
          />
        )}
        <CheckboxField
          label="Page Break"
          value={band.pageBreakBefore}
          onChange={(v) => {
            update({ pageBreakBefore: v });
          }}
        />
        <TextField
          label="Bookmark"
          value={band.bookmark}
          onChange={(v) => {
            update({ bookmark: v });
          }}
        />
        <TextField
          label="Anchor"
          value={band.anchor}
          onChange={(v) => {
            update({ anchor: v });
          }}
        />
      </PropertyGroup>
    </div>
  );
}
