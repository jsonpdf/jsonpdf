import type { ComponentType } from 'react';
import type { ElementRendererChildProps } from './ElementRenderer';
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

export const ELEMENT_RENDERERS: Record<string, ComponentType<ElementRendererChildProps>> = {
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
