import { Group, Rect } from 'react-konva';
import type { ComponentType } from 'react';
import type { Element, Style } from '@jsonpdf/core';
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
}

export function ElementRenderer({ element, styles }: ElementRendererProps) {
  const style = resolveElementStyle(element, styles);
  const Renderer = ELEMENT_RENDERERS[element.type] ?? UnknownElement;

  const hasBorder = style.borderWidth && style.borderWidth > 0;
  const hasBg =
    style.backgroundColor &&
    typeof style.backgroundColor === 'string' &&
    style.backgroundColor !== 'transparent';

  return (
    <Group
      x={element.x}
      y={element.y}
      rotation={element.rotation ?? 0}
      offsetX={element.rotation ? element.width / 2 : 0}
      offsetY={element.rotation ? element.height / 2 : 0}
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
      <Renderer element={element} style={style} styles={styles} />
    </Group>
  );
}
