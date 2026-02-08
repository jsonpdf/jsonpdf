import { useRef, useCallback } from 'react';
import { Group, Rect } from 'react-konva';
import type { ComponentType } from 'react';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Element, Style } from '@jsonpdf/core';
import { useEditorStore } from '../store';
import { resolveElementStyle } from '../style';
import { TextElement } from './elements/TextElement';
import { ImageElement } from './elements/ImageElement';
import { LineElement } from './elements/LineElement';
import { ShapeElement } from './elements/ShapeElement';
import { ContainerElement } from './elements/ContainerElement';
import { TableElement } from './elements/TableElement';
import { ChartElement } from './elements/ChartElement';
import { BarcodeElement } from './elements/BarcodeElement';
import { ListElement } from './elements/ListElement';
import { FrameElement } from './elements/FrameElement';
import { UnknownElement } from './elements/UnknownElement';

export interface ElementRendererChildProps {
  element: Element;
  style: Style;
  styles: Record<string, Style>;
  bandId: string;
  sectionId: string;
}

const ELEMENT_RENDERERS: Record<string, ComponentType<ElementRendererChildProps>> = {
  text: TextElement,
  image: ImageElement,
  line: LineElement,
  shape: ShapeElement,
  container: ContainerElement,
  table: TableElement,
  chart: ChartElement,
  barcode: BarcodeElement,
  list: ListElement,
  frame: FrameElement,
};

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

  const selectedElementId = useEditorStore((s) => s.selectedElementId);
  const isSelected = selectedElementId === element.id;

  const handleClick = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (isDragging.current) return;
      e.cancelBubble = true;
      useEditorStore.getState().setSelection(element.id, bandId, sectionId);
    },
    [element.id, bandId, sectionId],
  );

  const handleDragStart = useCallback(() => {
    isDragging.current = true;
  }, []);

  const handleDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      const node = e.target;
      // When rotated, the Group's x/y is the rotation center — subtract offset to get top-left
      const rot = element.rotation ?? 0;
      const newX = rot ? node.x() - element.width / 2 : node.x();
      const newY = rot ? node.y() - element.height / 2 : node.y();
      useEditorStore.getState().updateElementPosition(element.id, newX, newY);
      // Reset isDragging after a tick so the click handler doesn't fire
      setTimeout(() => {
        isDragging.current = false;
      }, 0);
    },
    [element.id, element.rotation, element.width, element.height],
  );

  const handleMouseEnter = useCallback((e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (stage) {
      stage.container().style.cursor = 'move';
    }
  }, []);

  const handleMouseLeave = useCallback((e: KonvaEventObject<MouseEvent>) => {
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
      draggable={isSelected}
      onClick={handleClick}
      onTap={handleClick}
      onDragStart={handleDragStart}
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
