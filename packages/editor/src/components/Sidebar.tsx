import { useMemo } from 'react';
import type { BandType } from '@jsonpdf/core';
import { findElement, findBand, findSection } from '@jsonpdf/template';
import { useEditorStore } from '../store';
import { TemplatePanel } from './panels/TemplatePanel';
import { SectionPanel } from './panels/SectionPanel';
import { BandPanel } from './panels/BandPanel';
import { AddBandPanel } from './panels/AddBandPanel';
import { ElementPanel } from './panels/ElementPanel';
import { ElementPalette } from './ElementPalette';
import styles from './Sidebar.module.css';

export function Sidebar() {
  const template = useEditorStore((s) => s.template);
  const selectedElementIds = useEditorStore((s) => s.selectedElementIds);
  const selectedBandId = useEditorStore((s) => s.selectedBandId);
  const selectedSectionId = useEditorStore((s) => s.selectedSectionId);

  const singleElementId = selectedElementIds.length === 1 ? selectedElementIds[0] : null;

  const element = useMemo(
    () => (singleElementId ? findElement(template, singleElementId)?.element : undefined),
    [template, singleElementId],
  );

  const band = useMemo(
    () => (selectedBandId ? findBand(template, selectedBandId)?.band : undefined),
    [template, selectedBandId],
  );

  const section = useMemo(
    () => (selectedSectionId ? findSection(template, selectedSectionId) : undefined),
    [template, selectedSectionId],
  );

  // Detect placeholder band selection (format: "sectionId::bandType")
  const placeholderInfo = useMemo(() => {
    if (!selectedBandId || !selectedBandId.includes('::')) return null;
    const sepIdx = selectedBandId.indexOf('::');
    const sectionId = selectedBandId.substring(0, sepIdx);
    const bandType = selectedBandId.substring(sepIdx + 2) as BandType;
    return { sectionId, bandType };
  }, [selectedBandId]);

  let content: React.ReactNode;

  if (selectedElementIds.length > 1) {
    content = (
      <div className={styles.panelArea}>
        <div style={{ padding: 'var(--jp-space-md)', color: 'var(--jp-color-text-secondary)' }}>
          {selectedElementIds.length} elements selected
        </div>
      </div>
    );
  } else if (element) {
    content = <ElementPanel element={element} />;
  } else if (band) {
    content = <BandPanel band={band} />;
  } else if (placeholderInfo) {
    content = (
      <AddBandPanel sectionId={placeholderInfo.sectionId} bandType={placeholderInfo.bandType} />
    );
  } else if (section) {
    content = <SectionPanel section={section} />;
  } else {
    content = <TemplatePanel />;
  }

  return (
    <div className={styles.sidebar}>
      <ElementPalette />
      <div className={styles.panelArea}>{content}</div>
    </div>
  );
}
