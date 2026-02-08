import { createTemplate, addSection, addBand, addElement, addStyle } from '@jsonpdf/template';
import type { Template } from '@jsonpdf/core';

/** Build a sample template for dev preview. */
export function buildSampleTemplate(): Template {
  let t = createTemplate({ name: 'Sample Template' });

  // Styles
  t = addStyle(t, 'heading', {
    fontFamily: 'Helvetica',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  });
  t = addStyle(t, 'subheading', {
    fontFamily: 'Helvetica',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
  });
  t = addStyle(t, 'body', {
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: '#444444',
    lineHeight: 1.4,
  });
  t = addStyle(t, 'footer', {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#888888',
    textAlign: 'center',
  });

  // --- Section 1: Main page ---
  t = addSection(t, { id: 'sec1', bands: [] });

  // Page header
  t = addBand(t, 'sec1', {
    id: 'ph1',
    type: 'pageHeader',
    height: 30,
    elements: [],
  });
  t = addElement(t, 'ph1', {
    id: 'ph1-line',
    type: 'line',
    x: 0,
    y: 28,
    width: 532,
    height: 1,
    properties: { color: '#2563eb', thickness: 2 },
  });

  // Title band
  t = addBand(t, 'sec1', {
    id: 'title1',
    type: 'title',
    height: 60,
    elements: [],
  });
  t = addElement(t, 'title1', {
    id: 'title-text',
    type: 'text',
    x: 0,
    y: 10,
    width: 400,
    height: 40,
    style: 'heading',
    properties: { content: 'Sample Document' },
  });

  // Detail band
  t = addBand(t, 'sec1', {
    id: 'detail1',
    type: 'detail',
    height: 120,
    elements: [],
  });
  t = addElement(t, 'detail1', {
    id: 'detail-subheading',
    type: 'text',
    x: 0,
    y: 0,
    width: 300,
    height: 20,
    style: 'subheading',
    properties: { content: 'Section Overview' },
  });
  t = addElement(t, 'detail1', {
    id: 'detail-body',
    type: 'text',
    x: 0,
    y: 28,
    width: 400,
    height: 60,
    style: 'body',
    properties: {
      content:
        'This is a sample template used for developing and testing the JsonPDF editor canvas. It demonstrates various element types including text, shapes, lines, and images.',
    },
  });

  // Body band with mixed elements
  t = addBand(t, 'sec1', {
    id: 'body1',
    type: 'body',
    height: 200,
    elements: [],
  });
  t = addElement(t, 'body1', {
    id: 'shape-rect',
    type: 'shape',
    x: 0,
    y: 10,
    width: 120,
    height: 80,
    properties: {
      shapeType: 'rect',
      fill: '#dbeafe',
      stroke: '#2563eb',
      strokeWidth: 1,
      borderRadius: 8,
    },
  });
  t = addElement(t, 'body1', {
    id: 'shape-circle',
    type: 'shape',
    x: 140,
    y: 10,
    width: 80,
    height: 80,
    properties: {
      shapeType: 'circle',
      fill: '#fef3c7',
      stroke: '#f59e0b',
      strokeWidth: 1,
    },
  });
  t = addElement(t, 'body1', {
    id: 'image-placeholder',
    type: 'image',
    x: 240,
    y: 10,
    width: 150,
    height: 80,
    properties: { src: 'logo.png' },
  });
  t = addElement(t, 'body1', {
    id: 'line-horizontal',
    type: 'line',
    x: 0,
    y: 110,
    width: 532,
    height: 1,
    properties: { color: '#cccccc', thickness: 1, dashPattern: [4, 4] },
  });

  // Container with children
  t = addElement(t, 'body1', {
    id: 'container1',
    type: 'container',
    x: 0,
    y: 130,
    width: 300,
    height: 60,
    properties: { layout: 'horizontal', gap: 10 },
    elements: [
      {
        id: 'child1',
        type: 'text',
        x: 0,
        y: 0,
        width: 140,
        height: 60,
        style: 'body',
        properties: { content: 'Left column text inside a container element.' },
      },
      {
        id: 'child2',
        type: 'text',
        x: 150,
        y: 0,
        width: 140,
        height: 60,
        style: 'body',
        properties: { content: 'Right column text inside the same container.' },
      },
    ],
  });

  // Page footer
  t = addBand(t, 'sec1', {
    id: 'pf1',
    type: 'pageFooter',
    height: 25,
    elements: [],
  });
  t = addElement(t, 'pf1', {
    id: 'footer-text',
    type: 'text',
    x: 0,
    y: 5,
    width: 532,
    height: 15,
    style: 'footer',
    properties: { content: 'Page 1 of 1' },
  });

  // --- Section 2: Landscape page ---
  t = addSection(t, {
    id: 'sec2',
    page: { width: 792, height: 612 },
    bands: [],
  });

  t = addBand(t, 'sec2', {
    id: 'title2',
    type: 'title',
    height: 50,
    elements: [],
  });
  t = addElement(t, 'title2', {
    id: 'title2-text',
    type: 'text',
    x: 0,
    y: 10,
    width: 500,
    height: 30,
    style: 'heading',
    properties: { content: 'Landscape Page' },
  });

  t = addBand(t, 'sec2', {
    id: 'body2',
    type: 'body',
    height: 150,
    elements: [],
  });
  t = addElement(t, 'body2', {
    id: 'chart-placeholder',
    type: 'chart',
    x: 0,
    y: 10,
    width: 350,
    height: 130,
    properties: { spec: {} },
  });
  t = addElement(t, 'body2', {
    id: 'barcode-placeholder',
    type: 'barcode',
    x: 380,
    y: 10,
    width: 120,
    height: 120,
    properties: { value: '12345', format: 'qrcode' },
  });

  return t;
}
