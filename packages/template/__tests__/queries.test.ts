import { describe, it, expect } from 'vitest';
import { createTemplate } from '../src/factory.js';
import { addSection, addBand, addElement, addFont } from '../src/operations.js';
import {
  findSection,
  findBand,
  findElement,
  findFont,
  getElementsByType,
  getAllBandIds,
  getAllElementIds,
} from '../src/queries.js';
import type { Element, Band } from '@jsonpdf/core';

function makeElement(overrides: Partial<Element> = {}): Element {
  return {
    id: 'el1',
    type: 'text',
    x: 0,
    y: 0,
    width: 100,
    height: 20,
    properties: { content: 'test' },
    ...overrides,
  };
}

function makeBand(overrides: Partial<Band> = {}): Band {
  return {
    id: 'b1',
    type: 'body',
    height: 50,
    elements: [],
    ...overrides,
  };
}

function buildTemplate() {
  let t = createTemplate();
  t = addSection(t, { id: 'sec1', bands: [] });
  t = addSection(t, { id: 'sec2', bands: [] });
  t = addBand(t, 'sec1', makeBand({ id: 'band1' }));
  t = addBand(t, 'sec1', makeBand({ id: 'band2' }));
  t = addBand(t, 'sec2', makeBand({ id: 'band3' }));
  t = addElement(t, 'band1', makeElement({ id: 'el1', type: 'text' }));
  t = addElement(t, 'band1', makeElement({ id: 'el2', type: 'image' }));
  t = addElement(t, 'band2', makeElement({ id: 'el3', type: 'text' }));
  t = addElement(t, 'band3', makeElement({ id: 'el4', type: 'line' }));
  return t;
}

describe('findSection', () => {
  it('finds a section by ID', () => {
    const t = buildTemplate();
    const result = findSection(t, 'sec1');
    expect(result).toBeDefined();
    expect(result!.id).toBe('sec1');
  });

  it('returns undefined for missing section', () => {
    const t = buildTemplate();
    expect(findSection(t, 'nope')).toBeUndefined();
  });
});

describe('findBand', () => {
  it('finds a band by ID with parent context', () => {
    const t = buildTemplate();
    const result = findBand(t, 'band2');
    expect(result).toBeDefined();
    expect(result!.band.id).toBe('band2');
    expect(result!.section.id).toBe('sec1');
    expect(result!.sectionIndex).toBe(0);
    expect(result!.bandIndex).toBe(1);
  });

  it('finds a band in a later section', () => {
    const t = buildTemplate();
    const result = findBand(t, 'band3');
    expect(result).toBeDefined();
    expect(result!.section.id).toBe('sec2');
    expect(result!.sectionIndex).toBe(1);
    expect(result!.bandIndex).toBe(0);
  });

  it('returns undefined for missing band', () => {
    const t = buildTemplate();
    expect(findBand(t, 'nope')).toBeUndefined();
  });
});

describe('findElement', () => {
  it('finds an element by ID with parent context', () => {
    const t = buildTemplate();
    const result = findElement(t, 'el3');
    expect(result).toBeDefined();
    expect(result!.element.id).toBe('el3');
    expect(result!.band.id).toBe('band2');
    expect(result!.section.id).toBe('sec1');
    expect(result!.elementIndex).toBe(0);
  });

  it('returns correct elementIndex for non-first element', () => {
    const t = buildTemplate();
    const result = findElement(t, 'el2');
    expect(result).toBeDefined();
    expect(result!.element.id).toBe('el2');
    expect(result!.elementIndex).toBe(1);
  });

  it('finds a nested container child with index within parent', () => {
    let t = buildTemplate();
    const container = makeElement({
      id: 'container1',
      type: 'container',
      elements: [makeElement({ id: 'child1' }), makeElement({ id: 'child2' })],
    });
    t = addElement(t, 'band1', container);
    const result = findElement(t, 'child2');
    expect(result).toBeDefined();
    expect(result!.element.id).toBe('child2');
    expect(result!.band.id).toBe('band1');
    expect(result!.section.id).toBe('sec1');
    expect(result!.elementIndex).toBe(1);
  });

  it('finds deeply nested elements', () => {
    let t = buildTemplate();
    const nested = makeElement({
      id: 'outer',
      type: 'container',
      elements: [
        makeElement({
          id: 'inner',
          type: 'container',
          elements: [makeElement({ id: 'deep' })],
        }),
      ],
    });
    t = addElement(t, 'band1', nested);
    const result = findElement(t, 'deep');
    expect(result).toBeDefined();
    expect(result!.element.id).toBe('deep');
    expect(result!.elementIndex).toBe(0);
  });

  it('returns undefined for missing element', () => {
    const t = buildTemplate();
    expect(findElement(t, 'nope')).toBeUndefined();
  });
});

describe('getElementsByType', () => {
  it('returns all elements of a type', () => {
    const t = buildTemplate();
    const texts = getElementsByType(t, 'text');
    expect(texts).toHaveLength(2);
    expect(texts.map((e) => e.id).sort()).toEqual(['el1', 'el3']);
  });

  it('returns empty array for no matches', () => {
    const t = buildTemplate();
    expect(getElementsByType(t, 'chart')).toHaveLength(0);
  });

  it('includes nested container children', () => {
    let t = buildTemplate();
    const container = makeElement({
      id: 'container1',
      type: 'container',
      elements: [makeElement({ id: 'nested-text', type: 'text' })],
    });
    t = addElement(t, 'band1', container);
    const texts = getElementsByType(t, 'text');
    expect(texts).toHaveLength(3);
  });
});

describe('getAllBandIds', () => {
  it('returns all band IDs in order', () => {
    const t = buildTemplate();
    expect(getAllBandIds(t)).toEqual(['band1', 'band2', 'band3']);
  });

  it('returns empty array for empty template', () => {
    const t = createTemplate();
    expect(getAllBandIds(t)).toEqual([]);
  });
});

describe('getAllElementIds', () => {
  it('returns all element IDs in order', () => {
    const t = buildTemplate();
    expect(getAllElementIds(t)).toEqual(['el1', 'el2', 'el3', 'el4']);
  });

  it('includes nested container children', () => {
    let t = buildTemplate();
    const container = makeElement({
      id: 'container1',
      type: 'container',
      elements: [makeElement({ id: 'child1' }), makeElement({ id: 'child2' })],
    });
    t = addElement(t, 'band1', container);
    expect(getAllElementIds(t)).toEqual([
      'el1',
      'el2',
      'container1',
      'child1',
      'child2',
      'el3',
      'el4',
    ]);
  });

  it('returns empty array for empty template', () => {
    const t = createTemplate();
    expect(getAllElementIds(t)).toEqual([]);
  });
});

describe('findFont', () => {
  it('finds a font by family', () => {
    let t = createTemplate({ fonts: [] });
    t = addFont(t, { family: 'Inter', weight: 400, data: 'AAAA' });
    t = addFont(t, { family: 'Roboto', weight: 400, data: 'BBBB' });
    const result = findFont(t, 'Inter');
    expect(result).toBeDefined();
    expect(result!.family).toBe('Inter');
  });

  it('finds a font by family and weight', () => {
    let t = createTemplate({ fonts: [] });
    t = addFont(t, { family: 'Inter', weight: 400, data: 'AAAA' });
    t = addFont(t, { family: 'Inter', weight: 700, data: 'CCCC' });
    const result = findFont(t, 'Inter', 700);
    expect(result).toBeDefined();
    expect(result!.weight).toBe(700);
  });

  it('finds a font by family, weight, and style', () => {
    let t = createTemplate({ fonts: [] });
    t = addFont(t, { family: 'Inter', weight: 400, data: 'AAAA' });
    t = addFont(t, { family: 'Inter', weight: 400, style: 'italic', data: 'DDDD' });
    const result = findFont(t, 'Inter', 400, 'italic');
    expect(result).toBeDefined();
    expect(result!.style).toBe('italic');
  });

  it('returns undefined for missing font', () => {
    const t = createTemplate({ fonts: [] });
    expect(findFont(t, 'Nope')).toBeUndefined();
  });

  it('returns undefined when weight does not match', () => {
    let t = createTemplate({ fonts: [] });
    t = addFont(t, { family: 'Inter', weight: 400, data: 'AAAA' });
    expect(findFont(t, 'Inter', 700)).toBeUndefined();
  });
});
