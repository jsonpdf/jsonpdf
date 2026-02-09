import type { BandType } from '@jsonpdf/core';
import { useEditorStore } from '../../store';
import { BAND_TYPE_META } from '../../constants/band-types';
import styles from './Panel.module.css';

const BAND_HINTS: Partial<Record<BandType, string>> = {
  title: 'Rendered once at the beginning of the section.',
  pageHeader: 'Rendered at the top of every page.',
  pageFooter: 'Rendered at the bottom of every page.',
  lastPageFooter: 'Rendered at the bottom of the last page instead of the regular page footer.',
  columnHeader: 'Rendered at the top of each column.',
  columnFooter: 'Rendered at the bottom of each column.',
  detail: 'Repeats for each data item in the data source.',
  summary: 'Rendered once at the end of the section.',
  body: 'General-purpose content band.',
  background: 'Rendered behind all other bands on every page.',
  noData: 'Rendered when detail bands produce no data items.',
  groupHeader: 'Rendered before each group of data items.',
  groupFooter: 'Rendered after each group of data items.',
};

interface AddBandPanelProps {
  sectionId: string;
  bandType: BandType;
}

export function AddBandPanel({ sectionId, bandType }: AddBandPanelProps) {
  const addBand = useEditorStore((s) => s.addBand);
  const meta = BAND_TYPE_META[bandType];
  const hint = BAND_HINTS[bandType];

  return (
    <div>
      <div className={styles.panelHeader}>{meta.label} Band</div>
      {hint && <p className={styles.readOnlyLabel}>{hint}</p>}
      <button
        className={styles.addBandBtn}
        onClick={() => {
          addBand(sectionId, bandType);
        }}
        aria-label={`Add ${meta.label} band`}
      >
        Add Band
      </button>
    </div>
  );
}
