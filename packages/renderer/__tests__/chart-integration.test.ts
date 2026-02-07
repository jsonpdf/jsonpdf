import { describe, it, expect } from 'vitest';
import { renderPdf } from '../src/renderer.js';
import { createTemplate, addSection, addBand, addElement } from '@jsonpdf/template';

const SIMPLE_BAR_SPEC = {
  $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
  data: {
    values: [
      { a: 'A', b: 28 },
      { a: 'B', b: 55 },
      { a: 'C', b: 43 },
    ],
  },
  mark: 'bar',
  encoding: {
    x: { field: 'a', type: 'nominal' },
    y: { field: 'b', type: 'quantitative' },
  },
};

describe('chart integration with renderer', () => {
  it('renders a bar chart to valid PDF', async () => {
    let t = createTemplate({ name: 'Chart Test' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 300, elements: [] });
    t = addElement(t, 'band1', {
      id: 'chart1',
      type: 'chart',
      x: 0,
      y: 0,
      width: 400,
      height: 250,
      properties: { spec: SIMPLE_BAR_SPEC, scale: 1 },
    });

    const result = await renderPdf(t);
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.pageCount).toBe(1);
    const header = new TextDecoder().decode(result.bytes.slice(0, 5));
    expect(header).toBe('%PDF-');
  });

  it('renders chart with dataSource override', async () => {
    const specWithoutData = {
      $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
      mark: 'bar',
      encoding: {
        x: { field: 'category', type: 'nominal' },
        y: { field: 'value', type: 'quantitative' },
      },
    };

    let t = createTemplate({ name: 'DataSource Chart' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 300, elements: [] });
    t = addElement(t, 'band1', {
      id: 'chart1',
      type: 'chart',
      x: 0,
      y: 0,
      width: 400,
      height: 250,
      properties: {
        spec: specWithoutData,
        dataSource: [
          { category: 'X', value: 10 },
          { category: 'Y', value: 30 },
        ],
        scale: 1,
      },
    });

    const result = await renderPdf(t);
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.pageCount).toBe(1);
  });

  it('renders chart with data binding in spec title', async () => {
    let t = createTemplate({ name: 'Bound Chart' });
    t = {
      ...t,
      dataSchema: {
        type: 'object',
        properties: {
          chartTitle: { type: 'string' },
        },
      },
    };
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 300, elements: [] });
    t = addElement(t, 'band1', {
      id: 'chart1',
      type: 'chart',
      x: 0,
      y: 0,
      width: 400,
      height: 250,
      properties: {
        spec: {
          $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
          title: '{{ chartTitle }}',
          data: {
            values: [
              { x: 1, y: 2 },
              { x: 3, y: 4 },
            ],
          },
          mark: 'point',
          encoding: {
            x: { field: 'x', type: 'quantitative' },
            y: { field: 'y', type: 'quantitative' },
          },
        },
        scale: 1,
      },
    });

    const result = await renderPdf(t, { data: { chartTitle: 'Sales Report' } });
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.pageCount).toBe(1);
  });

  it('renders chart alongside text on same page', async () => {
    let t = createTemplate({ name: 'Chart + Text' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 400, elements: [] });
    t = addElement(t, 'band1', {
      id: 'chart1',
      type: 'chart',
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      properties: { spec: SIMPLE_BAR_SPEC, scale: 1 },
    });
    t = addElement(t, 'band1', {
      id: 'text1',
      type: 'text',
      x: 0,
      y: 220,
      width: 300,
      height: 30,
      properties: { content: 'Chart caption' },
    });

    const result = await renderPdf(t);
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.pageCount).toBe(1);
  });
});
