import { describe, it, expect } from 'vitest';
import { renderPdf } from '../src/renderer.js';
import { createTemplate, addSection, addBand, addElement } from '@jsonpdf/template';

describe('container integration with renderer', () => {
  it('renders container element to valid PDF', async () => {
    let t = createTemplate({ name: 'Container Test' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'band1', {
      id: 'container1',
      type: 'container',
      x: 0,
      y: 0,
      width: 400,
      height: 60,
      properties: { layout: 'horizontal', gap: 10 },
      elements: [
        {
          id: 'child-text1',
          type: 'text',
          x: 0,
          y: 0,
          width: 150,
          height: 20,
          properties: { content: 'Left' },
        },
        {
          id: 'child-text2',
          type: 'text',
          x: 0,
          y: 0,
          width: 150,
          height: 20,
          properties: { content: 'Right' },
        },
      ],
    });

    const result = await renderPdf(t);
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.pageCount).toBe(1);
    const header = new TextDecoder().decode(result.bytes.slice(0, 5));
    expect(header).toBe('%PDF-');
  });

  it('renders nested containers to valid PDF', async () => {
    let t = createTemplate({ name: 'Nested Container Test' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 200, elements: [] });
    t = addElement(t, 'band1', {
      id: 'outer',
      type: 'container',
      x: 0,
      y: 0,
      width: 400,
      height: 100,
      properties: { layout: 'vertical', gap: 5 },
      elements: [
        {
          id: 'inner',
          type: 'container',
          x: 0,
          y: 0,
          width: 400,
          height: 40,
          properties: { layout: 'horizontal', gap: 10 },
          elements: [
            {
              id: 'deep-child',
              type: 'text',
              x: 0,
              y: 0,
              width: 100,
              height: 20,
              properties: { content: 'Deep' },
            },
          ],
        },
        {
          id: 'sibling',
          type: 'text',
          x: 0,
          y: 0,
          width: 200,
          height: 20,
          properties: { content: 'Sibling' },
        },
      ],
    });

    const result = await renderPdf(t);
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.pageCount).toBe(1);
  });

  it('renders container with data-bound children', async () => {
    let t = createTemplate({ name: 'Data Container Test' });
    t = {
      ...t,
      dataSchema: {
        type: 'object',
        properties: { title: { type: 'string' } },
      },
    };
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'band1', {
      id: 'container1',
      type: 'container',
      x: 0,
      y: 0,
      width: 400,
      height: 40,
      properties: { layout: 'horizontal' },
      elements: [
        {
          id: 'bound-text',
          type: 'text',
          x: 0,
          y: 0,
          width: 200,
          height: 20,
          properties: { content: '{{ title }}' },
        },
      ],
    });

    const result = await renderPdf(t, { data: { title: 'Resolved Title' } });
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.pageCount).toBe(1);
  });

  it('renders container with conditional child', async () => {
    let t = createTemplate({ name: 'Conditional Container' });
    t = {
      ...t,
      dataSchema: {
        type: 'object',
        properties: { showLabel: { type: 'boolean' } },
      },
    };
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'band1', {
      id: 'container1',
      type: 'container',
      x: 0,
      y: 0,
      width: 400,
      height: 40,
      properties: { layout: 'horizontal' },
      elements: [
        {
          id: 'always-visible',
          type: 'text',
          x: 0,
          y: 0,
          width: 200,
          height: 20,
          properties: { content: 'Always' },
        },
        {
          id: 'maybe-visible',
          type: 'text',
          x: 0,
          y: 0,
          width: 200,
          height: 20,
          condition: 'showLabel',
          properties: { content: 'Conditional' },
        },
      ],
    });

    // With showLabel = false, should not throw (conditional child is skipped)
    const result = await renderPdf(t, { data: { showLabel: false } });
    expect(result.pageCount).toBe(1);
  });
});
