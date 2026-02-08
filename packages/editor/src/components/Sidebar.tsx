import { useMemo } from 'react';
import { findElement, findBand, findSection } from '@jsonpdf/template';
import { useEditorStore } from '../store';
import { TemplatePanel } from './panels/TemplatePanel';
import { SectionPanel } from './panels/SectionPanel';
import { BandPanel } from './panels/BandPanel';
import { ElementPanel } from './panels/ElementPanel';
import styles from './Sidebar.module.css';

export function Sidebar() {
  const template = useEditorStore((s) => s.template);
  const selectedElementId = useEditorStore((s) => s.selectedElementId);
  const selectedBandId = useEditorStore((s) => s.selectedBandId);
  const selectedSectionId = useEditorStore((s) => s.selectedSectionId);

  const element = useMemo(
    () => (selectedElementId ? findElement(template, selectedElementId)?.element : undefined),
    [template, selectedElementId],
  );

  const band = useMemo(
    () => (selectedBandId ? findBand(template, selectedBandId)?.band : undefined),
    [template, selectedBandId],
  );

  const section = useMemo(
    () => (selectedSectionId ? findSection(template, selectedSectionId) : undefined),
    [template, selectedSectionId],
  );

  let content: React.ReactNode;

  if (element) {
    content = <ElementPanel element={element} />;
  } else if (band) {
    content = <BandPanel band={band} />;
  } else if (section) {
    content = <SectionPanel section={section} />;
  } else {
    content = <TemplatePanel />;
  }

  return <div className={styles.sidebar}>{content}</div>;
}
