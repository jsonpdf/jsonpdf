import { useMemo } from 'react';
import type { Template, Band, Element } from '@jsonpdf/core';
import { useEditorStore } from '../../store';
import { BAND_TYPE_META } from '../../constants/band-types';
import { OutlineNode } from './OutlineNode';

export interface TreeNode {
  id: string;
  kind: 'section' | 'band' | 'element';
  label: string;
  typeLabel: string;
  children: TreeNode[];
  sectionId: string;
  bandId?: string;
  /** When inside a frame, clicks select the parent frame element instead. */
  frameOwnerId?: string;
  /** The bandId of the frame element's parent band (for correct store selection). */
  frameOwnerBandId?: string;
}

function buildElementNode(
  element: Element,
  sectionId: string,
  bandId: string,
  frameOwnerId?: string,
  frameOwnerBandId?: string,
): TreeNode {
  const children: TreeNode[] = [];

  // Container children
  if (element.elements) {
    for (const child of element.elements) {
      children.push(buildElementNode(child, sectionId, bandId, frameOwnerId, frameOwnerBandId));
    }
  }

  // Frame children — nested bands inside properties.bands
  if (element.type === 'frame' && Array.isArray(element.properties.bands)) {
    const frameBands = element.properties.bands as Band[];
    for (const fb of frameBands) {
      children.push(buildBandNode(fb, sectionId, element.id, bandId));
    }
  }

  return {
    id: element.id,
    kind: 'element',
    label: element.id,
    typeLabel: element.type,
    children,
    sectionId,
    bandId,
    frameOwnerId,
    frameOwnerBandId,
  };
}

function buildBandNode(
  band: Band,
  sectionId: string,
  frameOwnerId?: string,
  frameOwnerBandId?: string,
): TreeNode {
  const meta = BAND_TYPE_META[band.type];
  const children = band.elements.map((el) =>
    buildElementNode(el, sectionId, band.id, frameOwnerId, frameOwnerBandId),
  );

  return {
    id: band.id,
    kind: 'band',
    label: meta.label,
    typeLabel: band.type,
    children,
    sectionId,
    bandId: band.id,
    frameOwnerId,
    frameOwnerBandId,
  };
}

function buildTree(template: Template): TreeNode[] {
  return template.sections.map((section) => ({
    id: section.id,
    kind: 'section' as const,
    label: section.name ?? section.id,
    typeLabel: 'Section',
    children: section.bands.map((band) => buildBandNode(band, section.id)),
    sectionId: section.id,
  }));
}

export function OutlineTree() {
  const template = useEditorStore((s) => s.template);
  const nodes = useMemo(() => buildTree(template), [template]);

  return (
    <div role="tree" aria-label="Template outline">
      {nodes.map((node) => (
        <OutlineNode key={node.id} node={node} depth={0} />
      ))}
    </div>
  );
}
