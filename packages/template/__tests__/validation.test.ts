import { describe, it, expect } from 'vitest';
import { validateTemplate } from '../src/validation.js';
import { createTemplate } from '../src/factory.js';
import { addSection, addBand, addElement, addStyle } from '../src/operations.js';
import type { Template, PluginSchemaEntry } from '@jsonpdf/core';

function buildMinimalTemplate(): Template {
  let t = createTemplate({ name: 'Test' });
  t = addSection(t, { id: 'sec1', bands: [] });
  t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
  t = addElement(t, 'band1', {
    id: 'el1',
    type: 'text',
    x: 0,
    y: 0,
    width: 100,
    height: 20,
    properties: { content: 'test' },
  });
  return t;
}

describe('validateTemplate', () => {
  it('accepts a valid template', () => {
    const result = validateTemplate(buildMinimalTemplate());
    expect(result.valid).toBe(true);
  });

  it('detects duplicate IDs across sections and bands', () => {
    let t = createTemplate({ name: 'Test' });
    t = addSection(t, { id: 'dup', bands: [] });
    t = addBand(t, 'dup', { id: 'dup', type: 'body', height: 50, elements: [] });

    const result = validateTemplate(t);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('Duplicate ID'))).toBe(true);
  });

  it('detects duplicate element IDs', () => {
    let t = createTemplate({ name: 'Test' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'band1', {
      id: 'same-id',
      type: 'text',
      x: 0,
      y: 0,
      width: 100,
      height: 20,
      properties: {},
    });
    t = addElement(t, 'band1', {
      id: 'same-id',
      type: 'text',
      x: 0,
      y: 20,
      width: 100,
      height: 20,
      properties: {},
    });

    const result = validateTemplate(t);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('same-id'))).toBe(true);
  });

  it('detects dangling style references', () => {
    let t = buildMinimalTemplate();
    t = {
      ...t,
      sections: t.sections.map((s) => ({
        ...s,
        bands: s.bands.map((b) => ({
          ...b,
          elements: b.elements.map((el) => ({ ...el, style: 'nonexistent' })),
        })),
      })),
    };
    const result = validateTemplate(t);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('not defined'))).toBe(true);
  });

  it('accepts valid style references', () => {
    let t = buildMinimalTemplate();
    t = addStyle(t, 'heading', { fontSize: 24 });
    t = {
      ...t,
      sections: t.sections.map((s) => ({
        ...s,
        bands: s.bands.map((b) => ({
          ...b,
          elements: b.elements.map((el) => ({ ...el, style: 'heading' })),
        })),
      })),
    };
    const result = validateTemplate(t);
    expect(result.valid).toBe(true);
  });
});

describe('validateTemplate font-family checks', () => {
  it('rejects undeclared fontFamily in named style', () => {
    let t = createTemplate({ name: 'Test' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    t = addStyle(t, 'heading', { fontFamily: 'Times' });

    const result = validateTemplate(t);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('Times'))).toBe(true);
  });

  it('accepts fontFamily when declared in fonts', () => {
    const t = buildMinimalTemplate();
    const result = validateTemplate(t);
    expect(result.valid).toBe(true);
  });

  it('catches fontFamily in element styleOverrides', () => {
    let t = createTemplate({ name: 'Test' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'band1', {
      id: 'el1',
      type: 'text',
      x: 0,
      y: 0,
      width: 100,
      height: 20,
      properties: { content: 'test' },
      styleOverrides: { fontFamily: 'Courier' },
    });

    const result = validateTemplate(t);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('Courier'))).toBe(true);
  });

  it('catches fontFamily in conditionalStyles overrides', () => {
    let t = createTemplate({ name: 'Test' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'band1', {
      id: 'el1',
      type: 'text',
      x: 0,
      y: 0,
      width: 100,
      height: 20,
      properties: { content: 'test' },
      conditionalStyles: [{ condition: 'true', styleOverrides: { fontFamily: 'Courier' } }],
    });

    const result = validateTemplate(t);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('Courier'))).toBe(true);
  });

  it('catches fontFamily in StyledRun overrides', () => {
    let t = createTemplate({ name: 'Test' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'band1', {
      id: 'el1',
      type: 'text',
      x: 0,
      y: 0,
      width: 100,
      height: 20,
      properties: {
        content: [{ text: 'Normal' }, { text: 'Bold', styleOverrides: { fontFamily: 'Times' } }],
      },
    });

    const result = validateTemplate(t);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('Times'))).toBe(true);
  });

  it('catches fontFamily in nested child element styleOverrides', () => {
    let t = createTemplate({ name: 'Test' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'band1', {
      id: 'container1',
      type: 'container',
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      properties: {},
      elements: [
        {
          id: 'child1',
          type: 'text',
          x: 0,
          y: 0,
          width: 100,
          height: 20,
          properties: { content: 'nested' },
          styleOverrides: { fontFamily: 'MissingFont' },
        },
      ],
    });

    const result = validateTemplate(t);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('MissingFont'))).toBe(true);
  });

  it('detects duplicate IDs in nested child elements', () => {
    let t = createTemplate({ name: 'Test' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'band1', {
      id: 'container1',
      type: 'container',
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      properties: {},
      elements: [
        {
          id: 'band1',
          type: 'text',
          x: 0,
          y: 0,
          width: 100,
          height: 20,
          properties: { content: 'dup' },
        },
      ],
    });

    const result = validateTemplate(t);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('Duplicate ID'))).toBe(true);
  });

  it('detects dangling style references in nested child elements', () => {
    let t = createTemplate({ name: 'Test' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'band1', {
      id: 'container1',
      type: 'container',
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      properties: {},
      elements: [
        {
          id: 'child1',
          type: 'text',
          x: 0,
          y: 0,
          width: 100,
          height: 20,
          properties: { content: 'test' },
          style: 'ghost',
        },
      ],
    });

    const result = validateTemplate(t);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('not defined'))).toBe(true);
  });

  it('reports each undeclared family only once', () => {
    let t = createTemplate({ name: 'Test' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    t = addStyle(t, 'a', { fontFamily: 'Courier' });
    t = addStyle(t, 'b', { fontFamily: 'Courier' });

    const result = validateTemplate(t);
    expect(result.valid).toBe(false);
    const courierErrors = result.errors.filter((e) => e.message.includes('Courier'));
    expect(courierErrors).toHaveLength(1);
  });
});

describe('validateTemplate defaultStyle checks', () => {
  it('rejects undeclared fontFamily in defaultStyle', () => {
    let t = createTemplate({ defaultStyle: { fontFamily: 'Nope' } });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });

    const result = validateTemplate(t);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('Nope'))).toBe(true);
  });

  it('accepts defaultStyle when fontFamily is declared', () => {
    const t = buildMinimalTemplate();
    const result = validateTemplate(t);
    expect(result.valid).toBe(true);
  });
});

describe('validateTemplate with pluginSchemas', () => {
  const textPluginSchema: PluginSchemaEntry = {
    type: 'text',
    propsSchema: {
      type: 'object',
      required: ['content'],
      properties: {
        content: { oneOf: [{ type: 'string' }, { type: 'array' }] },
        autoHeight: { type: 'boolean' },
      },
    },
  };

  const linePluginSchema: PluginSchemaEntry = {
    type: 'line',
    propsSchema: {
      type: 'object',
      properties: {
        color: { type: 'string' },
        thickness: { type: 'number', exclusiveMinimum: 0 },
      },
    },
  };

  const plugins = [textPluginSchema, linePluginSchema];

  it('rejects invalid plugin properties when pluginSchemas provided', () => {
    let t = createTemplate({ name: 'Test' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'band1', {
      id: 'el1',
      type: 'line',
      x: 0,
      y: 0,
      width: 200,
      height: 1,
      properties: { thickness: -5 },
    });

    const result = validateTemplate(t, plugins);
    expect(result.valid).toBe(false);
  });

  it('works without pluginSchemas (backward compat)', () => {
    const result = validateTemplate(buildMinimalTemplate());
    expect(result.valid).toBe(true);
  });

  it('accepts valid properties when pluginSchemas provided', () => {
    const result = validateTemplate(buildMinimalTemplate(), plugins);
    expect(result.valid).toBe(true);
  });
});
