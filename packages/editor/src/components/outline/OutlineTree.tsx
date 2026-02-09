import { createContext, useMemo, useRef, useState } from 'react';
import type { Template, Band, BandType, Element } from '@jsonpdf/core';
import { useEditorStore } from '../../store';
import {
  BAND_TYPE_META,
  BAND_DISPLAY_ORDER,
  SINGULAR_BAND_TYPES,
} from '../../constants/band-types';
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
  /** Whether this element can be dragged (direct band children only, not nested/frame-internal). */
  draggable: boolean;
  /** True for band types that don't exist yet (shown dimmed). */
  placeholder?: boolean;
  /** Set on inline "+ Add" nodes for multi-band types. */
  addBandType?: BandType;
  /** Index of this band in section.bands (real bands only, for reorder DnD). */
  bandArrayIndex?: number;
}

/* ------------------------------------------------------------------ */
/*  Drag-and-drop context                                              */
/* ------------------------------------------------------------------ */

export interface DragSource {
  kind: 'element' | 'section' | 'band';
  elementId: string;
  sourceBandId: string;
  sourceIndex: number;
  /** Band type of the dragged band (for same-type-only reorder matching). */
  bandType?: string;
}

export interface DropIndicatorState {
  targetId: string;
  position: 'before' | 'after' | 'inside';
}

export interface OutlineDragContextValue {
  dragRef: React.RefObject<DragSource | null>;
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
  dropIndicator: DropIndicatorState | null;
  setDropIndicator: (indicator: DropIndicatorState | null) => void;
}

export const OutlineDragContext = createContext<OutlineDragContextValue | null>(null);

/* ------------------------------------------------------------------ */
/*  Tree building                                                      */
/* ------------------------------------------------------------------ */

function buildElementNode(
  element: Element,
  sectionId: string,
  bandId: string,
  frameOwnerId?: string,
  frameOwnerBandId?: string,
  isDirectBandChild = false,
): TreeNode {
  const children: TreeNode[] = [];

  // Container children (not direct band children)
  if (element.elements) {
    for (const child of element.elements) {
      children.push(
        buildElementNode(child, sectionId, bandId, frameOwnerId, frameOwnerBandId, false),
      );
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
    draggable: isDirectBandChild && !frameOwnerId,
  };
}

function buildBandNode(
  band: Band,
  sectionId: string,
  frameOwnerId?: string,
  frameOwnerBandId?: string,
  bandArrayIndex?: number,
  draggable = false,
): TreeNode {
  const meta = BAND_TYPE_META[band.type];
  const children = band.elements.map((el) =>
    buildElementNode(el, sectionId, band.id, frameOwnerId, frameOwnerBandId, true),
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
    draggable,
    bandArrayIndex,
  };
}

function buildSectionChildren(sectionId: string, bands: Band[]): TreeNode[] {
  // Build lookup: band id → index in the section.bands array
  const bandIndexMap = new Map<string, number>();
  for (let i = 0; i < bands.length; i++) {
    bandIndexMap.set(bands[i].id, i);
  }

  // Group existing bands by type
  const byType = new Map<BandType, Band[]>();
  for (const band of bands) {
    const list = byType.get(band.type);
    if (list) {
      list.push(band);
    } else {
      byType.set(band.type, [band]);
    }
  }

  const children: TreeNode[] = [];

  for (const type of BAND_DISPLAY_ORDER) {
    const existing = byType.get(type);
    const isSingular = SINGULAR_BAND_TYPES.has(type);
    const meta = BAND_TYPE_META[type];
    // Multi-type bands are draggable when 2+ of the same type exist
    const canDrag = !isSingular && existing != null && existing.length >= 2;

    if (existing) {
      for (const band of existing) {
        children.push(
          buildBandNode(band, sectionId, undefined, undefined, bandIndexMap.get(band.id), canDrag),
        );
      }
    }

    if (isSingular && !existing) {
      // Placeholder for absent singular band type
      children.push({
        id: `${sectionId}::${type}`,
        kind: 'band',
        label: meta.label,
        typeLabel: type,
        children: [],
        sectionId,
        draggable: false,
        placeholder: true,
      });
    }

    if (!isSingular) {
      // "+ Add" button node for multi-band types
      children.push({
        id: `${sectionId}::add-${type}`,
        kind: 'band',
        label: `+ Add ${meta.label}`,
        typeLabel: type,
        children: [],
        sectionId,
        draggable: false,
        placeholder: true,
        addBandType: type,
      });
    }
  }

  return children;
}

function buildTree(template: Template): TreeNode[] {
  return template.sections.map((section) => ({
    id: section.id,
    kind: 'section' as const,
    label: section.name ?? section.id,
    typeLabel: 'Section',
    children: buildSectionChildren(section.id, section.bands),
    sectionId: section.id,
    draggable: true,
  }));
}

export function OutlineTree() {
  const template = useEditorStore((s) => s.template);
  const nodes = useMemo(() => buildTree(template), [template]);
  const dragRef = useRef<DragSource | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicatorState | null>(null);

  const contextValue = useMemo<OutlineDragContextValue>(
    () => ({ dragRef, draggingId, setDraggingId, dropIndicator, setDropIndicator }),
    [draggingId, dropIndicator],
  );

  return (
    <OutlineDragContext.Provider value={contextValue}>
      <div role="tree" aria-label="Template outline">
        {nodes.map((node, i) => (
          <OutlineNode key={node.id} node={node} depth={0} index={i} />
        ))}
      </div>
    </OutlineDragContext.Provider>
  );
}
