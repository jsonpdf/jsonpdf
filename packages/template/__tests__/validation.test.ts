import { describe, it, expect } from 'vitest';
import { validateTemplate } from '../src/validation.js';
import { createTemplate } from '../src/factory.js';
import { addSection, addBand, addElement, addStyle } from '../src/operations.js';
import type { Template } from '@jsonpdf/core';

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
