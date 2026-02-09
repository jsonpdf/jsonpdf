import { useState, useContext, useCallback } from 'react';
import { useEditorStore } from '../../store';
import type { TreeNode } from './OutlineTree';
import { OutlineDragContext } from './OutlineTree';
import { BAND_TYPE_META } from '../../constants/band-types';
import styles from './Outline.module.css';

interface OutlineNodeProps {
  node: TreeNode;
  depth: number;
  index?: number;
}

/** Compute drop position from mouse Y relative to the target element. */
export function computeDropPosition(
  clientY: number,
  rect: { top: number; height: number },
  targetKind: 'band' | 'element' | 'section',
  sourceKind: 'element' | 'section' | 'band',
): 'before' | 'after' | 'inside' {
  const ratio = (clientY - rect.top) / rect.height;
  // Element dropping on band header → "inside" (append to band)
  // Band dropping on band → before/after (reorder)
  if (targetKind === 'band' && sourceKind !== 'band') return 'inside';
  return ratio < 0.5 ? 'before' : 'after';
}

export function OutlineNode({ node, depth, index }: OutlineNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const isSelected = useEditorStore((s) => {
    if (node.placeholder) return s.selectedBandId === node.id && s.selectedElementId === null;
    if (node.kind === 'element') return s.selectedElementId === node.id;
    if (node.kind === 'band') return s.selectedBandId === node.id && s.selectedElementId === null;
    return (
      s.selectedSectionId === node.id && s.selectedBandId === null && s.selectedElementId === null
    );
  });
  const setSelection = useEditorStore((s) => s.setSelection);
  const addBandAction = useEditorStore((s) => s.addBand);

  const dragCtx = useContext(OutlineDragContext);

  const hasChildren = node.children.length > 0;
  const isDragSource = dragCtx?.draggingId === node.id;
  const indicator = dragCtx?.dropIndicator;
  const indicatorPos =
    indicator != null && indicator.targetId === node.id ? indicator.position : null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.frameOwnerId) {
      setSelection(node.frameOwnerId, node.frameOwnerBandId ?? null, node.sectionId);
    } else if (node.kind === 'element') {
      setSelection(node.id, node.bandId ?? null, node.sectionId);
    } else if (node.kind === 'band') {
      setSelection(null, node.id, node.sectionId);
    } else {
      setSelection(null, null, node.id);
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  /* ---------- Drag source handlers ---------- */

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (!dragCtx || !node.draggable) return;
      e.stopPropagation();
      if (node.kind === 'band') {
        dragCtx.dragRef.current = {
          kind: 'band',
          elementId: node.id,
          sourceBandId: '',
          sourceIndex: node.bandArrayIndex ?? 0,
          bandType: node.typeLabel,
        };
      } else {
        dragCtx.dragRef.current = {
          kind: node.kind === 'section' ? 'section' : 'element',
          elementId: node.id,
          sourceBandId: node.bandId ?? '',
          sourceIndex: index ?? 0,
        };
      }
      dragCtx.setDraggingId(node.id);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', node.id);
    },
    [
      dragCtx,
      node.id,
      node.bandId,
      node.bandArrayIndex,
      node.kind,
      node.typeLabel,
      node.draggable,
      index,
    ],
  );

  const handleDragEnd = useCallback(() => {
    if (!dragCtx) return;
    dragCtx.dragRef.current = null;
    dragCtx.setDraggingId(null);
    dragCtx.setDropIndicator(null);
  }, [dragCtx]);

  /* ---------- Drop target handlers ---------- */

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!dragCtx) return;
      const source = dragCtx.dragRef.current;
      if (!source || source.elementId === node.id) return;

      // Kind-matching rules
      if (source.kind === 'section' && node.kind !== 'section') return;
      if (source.kind === 'element' && node.kind === 'section') return;
      // Band drag: only accept same-type bands
      if (source.kind === 'band') {
        if (node.kind !== 'band' || node.placeholder || source.bandType !== node.typeLabel) return;
      }
      // Don't drop elements/sections on a band that's currently being dragged by another band
      if (source.kind !== 'band' && node.kind === 'band' && node.draggable) {
        // Still allow element→band "inside" drops on draggable bands
      }

      e.preventDefault();
      e.stopPropagation();

      const rect = e.currentTarget.getBoundingClientRect();
      const position = computeDropPosition(e.clientY, rect, node.kind, source.kind);

      // Only update state when indicator actually changes
      const prev = dragCtx.dropIndicator;
      if (!prev || prev.targetId !== node.id || prev.position !== position) {
        dragCtx.setDropIndicator({ targetId: node.id, position });
      }
    },
    [dragCtx, node.id, node.kind, node.placeholder, node.typeLabel, node.draggable],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (!dragCtx) return;
      // Only clear if leaving this specific node (not entering a child)
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        if (dragCtx.dropIndicator?.targetId === node.id) {
          dragCtx.setDropIndicator(null);
        }
      }
    },
    [dragCtx, node.id],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (!dragCtx) return;
      e.preventDefault();
      e.stopPropagation();

      const source = dragCtx.dragRef.current;
      const currentIndicator = dragCtx.dropIndicator;
      dragCtx.dragRef.current = null;
      dragCtx.setDraggingId(null);
      dragCtx.setDropIndicator(null);

      if (!source || !currentIndicator) return;

      const store = useEditorStore.getState();

      // Band reorder (same type within same section)
      if (source.kind === 'band' && node.kind === 'band' && node.bandArrayIndex != null) {
        const S = source.sourceIndex;
        const T = node.bandArrayIndex;
        let toIndex: number;
        if (currentIndicator.position === 'before') {
          toIndex = S < T ? T - 1 : T;
        } else {
          toIndex = S < T ? T : T + 1;
        }
        if (toIndex !== S) {
          store.reorderBand(source.elementId, node.sectionId, toIndex);
        }
        return;
      }

      // Section reorder
      if (source.kind === 'section' && node.kind === 'section') {
        const S = source.sourceIndex;
        const T = index ?? 0;
        let toIndex: number;
        if (currentIndicator.position === 'before') {
          toIndex = S < T ? T - 1 : T;
        } else {
          toIndex = S < T ? T : T + 1;
        }
        if (toIndex !== S) {
          store.moveSection(source.elementId, toIndex);
        }
        return;
      }

      if (currentIndicator.position === 'inside' && node.kind === 'band') {
        // Drop on band header → append to that band (skip if already in this band)
        if (source.sourceBandId === node.id) return;
        store.moveElementToBand(source.elementId, node.id);
        return;
      }

      if (node.kind === 'element' && node.bandId) {
        const targetIndex = index ?? 0;

        if (source.sourceBandId === node.bandId) {
          // Same band → reorder
          const S = source.sourceIndex;
          const T = targetIndex;
          let toIndex: number;
          if (currentIndicator.position === 'before') {
            toIndex = S < T ? T - 1 : T;
          } else {
            toIndex = S < T ? T : T + 1;
          }
          if (toIndex === S) return; // Already at target position
          store.reorderElement(source.elementId, toIndex);
        } else {
          // Different band → move
          const toIndex = currentIndicator.position === 'before' ? targetIndex : targetIndex + 1;
          store.moveElementToBand(source.elementId, node.bandId, toIndex);
        }
      }
    },
    [dragCtx, node.kind, node.bandId, node.id, index],
  );

  /* ---------- Inline add-button for multi-band types ---------- */

  if (node.addBandType) {
    const bandType = node.addBandType;
    const meta = BAND_TYPE_META[bandType];
    return (
      <button
        className={styles.addBandInline}
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={() => {
          addBandAction(node.sectionId, bandType);
        }}
        aria-label={`Add ${meta.label}`}
      >
        + Add {meta.label}
      </button>
    );
  }

  /* ---------- CSS classes ---------- */

  const nodeClasses = [
    styles.node,
    isSelected ? styles.nodeSelected : '',
    isDragSource ? styles.nodeDragging : '',
    indicatorPos === 'inside' ? styles.dropTargetInside : '',
    node.placeholder ? styles.nodePlaceholder : '',
  ]
    .filter(Boolean)
    .join(' ');

  const dragSource = dragCtx?.dragRef.current;
  const isDropTarget =
    !node.frameOwnerId &&
    !node.placeholder &&
    (node.kind === 'band' ||
      (node.kind === 'element' && node.draggable) ||
      (node.kind === 'section' && dragSource?.kind === 'section'));

  return (
    <div>
      <div className={styles.nodeWrapper}>
        {indicatorPos === 'before' && (
          <div className={`${styles.dropLine} ${styles.dropLineBefore}`} />
        )}
        <div
          className={nodeClasses}
          style={{ paddingLeft: depth * 16 + 8 }}
          onClick={handleClick}
          role="treeitem"
          aria-expanded={hasChildren ? expanded : undefined}
          aria-selected={isSelected}
          draggable={node.draggable || undefined}
          onDragStart={node.draggable ? handleDragStart : undefined}
          onDragEnd={node.draggable ? handleDragEnd : undefined}
          onDragOver={isDropTarget ? handleDragOver : undefined}
          onDragLeave={isDropTarget ? handleDragLeave : undefined}
          onDrop={isDropTarget ? handleDrop : undefined}
        >
          {hasChildren ? (
            <span
              className={expanded ? styles.chevronOpen : styles.chevron}
              onClick={handleToggle}
              data-testid={`toggle-${node.id}`}
            >
              &#9654;
            </span>
          ) : (
            <span className={styles.chevronSpacer} />
          )}
          <span className={styles.nodeLabel}>{node.label}</span>
          <span className={styles.nodeType}>{node.typeLabel}</span>
        </div>
        {indicatorPos === 'after' && (
          <div className={`${styles.dropLine} ${styles.dropLineAfter}`} />
        )}
      </div>
      {hasChildren && expanded && (
        <div role="group">
          {node.children.map((child, i) => (
            <OutlineNode key={child.id} node={child} depth={depth + 1} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
