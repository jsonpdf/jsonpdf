import { useRef, useCallback } from 'react';
import { Group, Rect } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Element, Style } from '@jsonpdf/core';
import { findBand } from '@jsonpdf/template';
import { useEditorStore } from '../store';
import { resolveElementStyle } from '../style';
import type { SnapTargets } from '../snap/snap';
import { collectSnapTargets, snapPosition } from '../snap/snap';
import { useGuideStore } from '../snap/guide-store';
import { useBandGeometry } from '../snap/band-context';
import { UnknownElement } from './elements/UnknownElement';
import { ELEMENT_RENDERERS } from './element-renderers';

export interface ElementRendererChildProps {
  element: Element;
  style: Style;
  styles: Record<string, Style>;
  bandId: string;
  sectionId: string;
}

interface ElementRendererProps {
  element: Element;
  styles: Record<string, Style>;
  bandId: string;
  sectionId: string;
}

export function ElementRenderer({ element, styles, bandId, sectionId }: ElementRendererProps) {
  const style = resolveElementStyle(element, styles);
  const Renderer = ELEMENT_RENDERERS[element.type] ?? UnknownElement;
  const isDragging = useRef(false);
  const snapTargetsRef = useRef<SnapTargets | null>(null);

  const { contentWidth, bandHeight, sectionIndex } = useBandGeometry();

  const isSelected = useEditorStore((s) => s.selectedElementIds.includes(element.id));
  const activeTool = useEditorStore((s) => s.activeTool);

  const handleClick = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (useEditorStore.getState().activeTool !== 'select') return;
      if (isDragging.current) return;
      e.cancelBubble = true;
      const evt = e.evt;
      const mod = 'metaKey' in evt && (evt.metaKey || evt.ctrlKey);
      if (mod) {
        useEditorStore.getState().toggleElementSelection(element.id, bandId, sectionId);
      } else {
        useEditorStore.getState().setSelection(element.id, bandId, sectionId);
      }
    },
    [element.id, bandId, sectionId],
  );

  const handleDragStart = useCallback(() => {
    isDragging.current = true;

    // Cache snap targets once at drag start — they don't change during drag
    const store = useEditorStore.getState();
    const bandResult = findBand(store.template, bandId);
    if (bandResult) {
      snapTargetsRef.current = collectSnapTargets(
        bandResult.band.elements,
        store.selectedElementIds,
        contentWidth,
        bandHeight,
      );
    }
  }, [bandId, contentWidth, bandHeight]);

  const handleDragMove = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      const rot = element.rotation ?? 0;
      if (rot) return;

      // Skip snapping when Alt is held
      if (e.evt.altKey) {
        useGuideStore.getState().clearGuides();
        return;
      }

      const targets = snapTargetsRef.current;
      if (!targets) return;

      const node = e.target;

      if (useEditorStore.getState().selectedElementIds.length > 1) {
        // Multi-select: compute bounding box of all selected elements
        const store = useEditorStore.getState();
        const bandResult = findBand(store.template, bandId);
        if (!bandResult) return;
        const siblings = bandResult.band.elements;

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const id of store.selectedElementIds) {
          for (const el of siblings) {
            if (el.id === id) {
              minX = Math.min(minX, el.x);
              minY = Math.min(minY, el.y);
              maxX = Math.max(maxX, el.x + el.width);
              maxY = Math.max(maxY, el.y + el.height);
            }
          }
        }
        // Compute the delta from original position to current dragged position
        const dragX = node.x();
        const dragY = node.y();
        const dx = dragX - element.x;
        const dy = dragY - element.y;
        const bboxX = minX + dx;
        const bboxY = minY + dy;
        const bboxW = maxX - minX;
        const bboxH = maxY - minY;

        const result = snapPosition(bboxX, bboxY, bboxW, bboxH, targets);
        const snapDx = result.x - bboxX;
        const snapDy = result.y - bboxY;
        node.x(dragX + snapDx);
        node.y(dragY + snapDy);
        useGuideStore.getState().setGuides(result.guides, bandId, sectionIndex);
      } else {
        const dragX = node.x();
        const dragY = node.y();
        const result = snapPosition(dragX, dragY, element.width, element.height, targets);
        node.x(result.x);
        node.y(result.y);
        useGuideStore.getState().setGuides(result.guides, bandId, sectionIndex);
      }
    },
    [
      element.id,
      element.x,
      element.y,
      element.width,
      element.height,
      element.rotation,
      bandId,
      sectionIndex,
    ],
  );

  const handleDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      useGuideStore.getState().clearGuides();
      snapTargetsRef.current = null;
      const node = e.target;
      // When rotated, the Group's x/y is the rotation center — subtract offset to get top-left
      const rot = element.rotation ?? 0;
      const newX = rot ? node.x() - element.width / 2 : node.x();
      const newY = rot ? node.y() - element.height / 2 : node.y();
      const dx = newX - element.x;
      const dy = newY - element.y;
      const store = useEditorStore.getState();
      if (store.selectedElementIds.length > 1) {
        store.moveSelectedElements(dx, dy);
      } else {
        store.updateElementPosition(element.id, newX, newY);
      }
      // Reset isDragging after a tick so the click handler doesn't fire
      setTimeout(() => {
        isDragging.current = false;
      }, 0);
    },
    [element.id, element.x, element.y, element.rotation, element.width, element.height],
  );

  const handleMouseEnter = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (useEditorStore.getState().activeTool !== 'select') return;
    const stage = e.target.getStage();
    if (stage) {
      stage.container().style.cursor = 'move';
    }
  }, []);

  const handleMouseLeave = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (useEditorStore.getState().activeTool !== 'select') return;
    const stage = e.target.getStage();
    if (stage) {
      stage.container().style.cursor = 'default';
    }
  }, []);

  const hasBorder = style.borderWidth && style.borderWidth > 0;
  const hasBg =
    style.backgroundColor &&
    typeof style.backgroundColor === 'string' &&
    style.backgroundColor !== 'transparent';

  return (
    <Group
      x={element.rotation ? element.x + element.width / 2 : element.x}
      y={element.rotation ? element.y + element.height / 2 : element.y}
      rotation={element.rotation ?? 0}
      offsetX={element.rotation ? element.width / 2 : 0}
      offsetY={element.rotation ? element.height / 2 : 0}
      draggable={isSelected && activeTool === 'select'}
      onClick={handleClick}
      onTap={handleClick}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background fill */}
      {hasBg && (
        <Rect
          x={0}
          y={0}
          width={element.width}
          height={element.height}
          fill={style.backgroundColor as string}
          cornerRadius={style.borderRadius ?? 0}
        />
      )}

      {/* Border */}
      {hasBorder && (
        <Rect
          x={0}
          y={0}
          width={element.width}
          height={element.height}
          stroke={style.borderColor ?? '#000000'}
          strokeWidth={style.borderWidth}
          cornerRadius={style.borderRadius ?? 0}
        />
      )}

      {/* Type-specific renderer */}
      <Renderer
        element={element}
        style={style}
        styles={styles}
        bandId={bandId}
        sectionId={sectionId}
      />
    </Group>
  );
}
