import { describe, it, expect } from 'vitest';
import { createTemplate } from '../src/factory.js';
import { addSection, addBand, addElement, addStyle, addFont } from '../src/operations.js';

describe('addSection', () => {
  it('appends a section', () => {
    const t = createTemplate();
    const result = addSection(t, { id: 'sec1', bands: [] });
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0]!.id).toBe('sec1');
  });

  it('inserts at index', () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addSection(t, { id: 'sec2', bands: [] }, 0);
    expect(t.sections[0]!.id).toBe('sec2');
    expect(t.sections[1]!.id).toBe('sec1');
  });

  it('does not mutate the original', () => {
    const t = createTemplate();
    addSection(t, { id: 'sec1', bands: [] });
    expect(t.sections).toHaveLength(0);
  });
});

describe('addBand', () => {
  it('appends a band to the correct section', () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    expect(t.sections[0]!.bands).toHaveLength(1);
    expect(t.sections[0]!.bands[0]!.id).toBe('band1');
  });

  it('inserts at index', () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 50, elements: [] });
    t = addBand(t, 'sec1', { id: 'b2', type: 'body', height: 50, elements: [] }, 0);
    expect(t.sections[0]!.bands[0]!.id).toBe('b2');
  });

  it('throws for missing section', () => {
    const t = createTemplate();
    expect(() =>
      addBand(t, 'nonexistent', { id: 'b1', type: 'body', height: 50, elements: [] }),
    ).toThrow('Section "nonexistent" not found');
  });

  it('does not mutate the original', () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    const original = t;
    addBand(t, 'sec1', { id: 'b1', type: 'body', height: 50, elements: [] });
    expect(original.sections[0]!.bands).toHaveLength(0);
  });
});

describe('addElement', () => {
  it('appends an element to the correct band', () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'band1', {
      id: 'el1',
      type: 'text',
      x: 0,
      y: 0,
      width: 100,
      height: 20,
      properties: { content: 'Hello' },
    });
    expect(t.sections[0]!.bands[0]!.elements).toHaveLength(1);
    expect(t.sections[0]!.bands[0]!.elements[0]!.id).toBe('el1');
  });

  it('throws for missing band', () => {
    const t = createTemplate();
    expect(() =>
      addElement(t, 'nonexistent', {
        id: 'el1',
        type: 'text',
        x: 0,
        y: 0,
        width: 100,
        height: 20,
        properties: {},
      }),
    ).toThrow('Band "nonexistent" not found');
  });

  it('adds element only to first matching band when duplicate band IDs exist', () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addSection(t, { id: 'sec2', bands: [] });
    // Both sections have a band with the same ID (shouldn't happen, but addElement handles it)
    t = addBand(t, 'sec1', { id: 'dup-band', type: 'body', height: 100, elements: [] });
    t = addBand(t, 'sec2', { id: 'dup-band', type: 'body', height: 100, elements: [] });

    t = addElement(t, 'dup-band', {
      id: 'el1',
      type: 'text',
      x: 0,
      y: 0,
      width: 100,
      height: 20,
      properties: {},
    });

    // Only the first band should have the element
    expect(t.sections[0]!.bands[0]!.elements).toHaveLength(1);
    expect(t.sections[1]!.bands[0]!.elements).toHaveLength(0);
  });
});

describe('addStyle', () => {
  it('adds a named style', () => {
    const t = createTemplate();
    const result = addStyle(t, 'heading', { fontSize: 24, fontWeight: 'bold' });
    expect(result.styles['heading']).toEqual({ fontSize: 24, fontWeight: 'bold' });
  });

  it('throws for duplicate style name', () => {
    let t = createTemplate();
    t = addStyle(t, 'heading', { fontSize: 24 });
    expect(() => addStyle(t, 'heading', { fontSize: 18 })).toThrow('already exists');
  });

  it('does not mutate the original', () => {
    const t = createTemplate();
    addStyle(t, 'heading', { fontSize: 24 });
    expect(Object.keys(t.styles)).toHaveLength(0);
  });
});

describe('addFont', () => {
  it('appends a font declaration', () => {
    const t = createTemplate();
    const result = addFont(t, { family: 'Inter', weight: 400, src: 'inter-400.woff2' });
    expect(result.fonts).toHaveLength(1);
    expect(result.fonts[0]!.family).toBe('Inter');
  });

  it('does not mutate the original', () => {
    const t = createTemplate();
    addFont(t, { family: 'Inter', src: 'inter.woff2' });
    expect(t.fonts).toHaveLength(0);
  });
});
