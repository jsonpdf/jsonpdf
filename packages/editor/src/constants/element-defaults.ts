import type { Element } from '@jsonpdf/core';
import { generateId } from '@jsonpdf/core';

const ELEMENT_DEFAULTS: Record<string, Omit<Element, 'id'>> = {
  text: {
    type: 'text',
    x: 10,
    y: 10,
    width: 150,
    height: 30,
    properties: { content: 'Text' },
  },
  image: {
    type: 'image',
    x: 10,
    y: 10,
    width: 150,
    height: 100,
    properties: { src: '', fit: 'contain' },
  },
  line: {
    type: 'line',
    x: 10,
    y: 10,
    width: 200,
    height: 1,
    properties: { color: '#000000', thickness: 1, direction: 'horizontal' },
  },
  shape: {
    type: 'shape',
    x: 10,
    y: 10,
    width: 100,
    height: 100,
    properties: { shapeType: 'rect' },
  },
  container: {
    type: 'container',
    x: 10,
    y: 10,
    width: 200,
    height: 100,
    properties: { layout: 'vertical', gap: 0 },
  },
  table: {
    type: 'table',
    x: 10,
    y: 10,
    width: 300,
    height: 100,
    properties: {
      columns: [
        { key: 'col1', header: 'Column 1', width: 150 },
        { key: 'col2', header: 'Column 2', width: 150 },
      ],
      rows: [],
    },
  },
  chart: {
    type: 'chart',
    x: 10,
    y: 10,
    width: 200,
    height: 150,
    properties: { spec: {}, fit: 'contain', scale: 2 },
  },
  barcode: {
    type: 'barcode',
    x: 10,
    y: 10,
    width: 100,
    height: 100,
    properties: { value: '12345', format: 'qrcode' },
  },
  list: {
    type: 'list',
    x: 10,
    y: 10,
    width: 150,
    height: 80,
    properties: { items: [{ content: 'Item 1' }, { content: 'Item 2' }] },
  },
  frame: {
    type: 'frame',
    x: 10,
    y: 10,
    width: 200,
    height: 150,
    properties: { bands: [] },
  },
};

export function createDefaultElement(type: string): Element {
  const defaults = ELEMENT_DEFAULTS[type] as Omit<Element, 'id'> | undefined;
  if (!defaults) {
    return {
      id: generateId('el'),
      type,
      x: 10,
      y: 10,
      width: 100,
      height: 50,
      properties: {},
    };
  }
  return {
    ...defaults,
    id: generateId('el'),
    properties: structuredClone(defaults.properties),
  };
}

export const ELEMENT_TYPES = Object.keys(ELEMENT_DEFAULTS);
