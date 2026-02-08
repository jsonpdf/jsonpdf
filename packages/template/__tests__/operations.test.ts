import { describe, it, expect } from 'vitest';
import { createTemplate } from '../src/factory.js';
import {
  addSection,
  addBand,
  addElement,
  addStyle,
  addFont,
  updateSection,
  updateBand,
  updateElement,
  updateStyle,
  updateTemplate,
  removeSection,
  removeBand,
  removeElement,
  removeStyle,
  removeFont,
  moveSection,
  moveBand,
  moveElement,
  reorderElement,
  cloneSection,
  cloneBand,
  cloneElement,
} from '../src/operations.js';
import type { Element, Band } from '@jsonpdf/core';

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

// ---- Helper factories ----

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
  t = addBand(t, 'sec1', makeBand({ id: 'band1' }));
  t = addElement(t, 'band1', makeElement({ id: 'el1' }));
  t = addElement(t, 'band1', makeElement({ id: 'el2', x: 50 }));
  return t;
}

// ---- UPDATE operations ----

describe('updateSection', () => {
  it('updates section properties', () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    const result = updateSection(t, 'sec1', { name: 'Cover Page', columns: 2 });
    expect(result.sections[0]!.name).toBe('Cover Page');
    expect(result.sections[0]!.columns).toBe(2);
  });

  it('throws for missing section', () => {
    const t = createTemplate();
    expect(() => updateSection(t, 'nope', { name: 'x' })).toThrow('Section "nope" not found');
  });

  it('does not mutate the original', () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    const original = t;
    updateSection(t, 'sec1', { name: 'Updated' });
    expect(original.sections[0]!.name).toBeUndefined();
  });

  it('preserves id and bands', () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', makeBand({ id: 'b1' }));
    const result = updateSection(t, 'sec1', { name: 'Updated' });
    expect(result.sections[0]!.id).toBe('sec1');
    expect(result.sections[0]!.bands).toHaveLength(1);
  });
});

describe('updateBand', () => {
  it('updates band properties', () => {
    const t = buildTemplate();
    const result = updateBand(t, 'band1', { height: 200, type: 'title' });
    expect(result.sections[0]!.bands[0]!.height).toBe(200);
    expect(result.sections[0]!.bands[0]!.type).toBe('title');
  });

  it('throws for missing band', () => {
    const t = createTemplate();
    expect(() => updateBand(t, 'nope', { height: 10 })).toThrow('Band "nope" not found');
  });

  it('does not mutate the original', () => {
    const t = buildTemplate();
    updateBand(t, 'band1', { height: 999 });
    expect(t.sections[0]!.bands[0]!.height).toBe(50);
  });

  it('preserves id and elements', () => {
    const t = buildTemplate();
    const result = updateBand(t, 'band1', { height: 200 });
    expect(result.sections[0]!.bands[0]!.id).toBe('band1');
    expect(result.sections[0]!.bands[0]!.elements).toHaveLength(2);
  });
});

describe('updateElement', () => {
  it('updates element properties', () => {
    const t = buildTemplate();
    const result = updateElement(t, 'el1', { x: 10, y: 20, width: 200 });
    const el = result.sections[0]!.bands[0]!.elements[0]!;
    expect(el.x).toBe(10);
    expect(el.y).toBe(20);
    expect(el.width).toBe(200);
  });

  it('updates element properties object', () => {
    const t = buildTemplate();
    const result = updateElement(t, 'el1', { properties: { content: 'updated' } });
    expect(result.sections[0]!.bands[0]!.elements[0]!.properties).toEqual({
      content: 'updated',
    });
  });

  it('throws for missing element', () => {
    const t = createTemplate();
    expect(() => updateElement(t, 'nope', { x: 5 })).toThrow('Element "nope" not found');
  });

  it('does not mutate the original', () => {
    const t = buildTemplate();
    updateElement(t, 'el1', { x: 999 });
    expect(t.sections[0]!.bands[0]!.elements[0]!.x).toBe(0);
  });

  it('updates nested container child', () => {
    let t = buildTemplate();
    const container = makeElement({
      id: 'container1',
      type: 'container',
      elements: [makeElement({ id: 'child1', x: 5 })],
    });
    t = addElement(t, 'band1', container);
    const result = updateElement(t, 'child1', { x: 50 });
    const c = result.sections[0]!.bands[0]!.elements[2]!;
    expect(c.elements![0]!.x).toBe(50);
  });

  it('preserves id', () => {
    const t = buildTemplate();
    const result = updateElement(t, 'el1', { x: 42 });
    expect(result.sections[0]!.bands[0]!.elements[0]!.id).toBe('el1');
  });
});

describe('updateStyle', () => {
  it('updates a named style', () => {
    let t = createTemplate();
    t = addStyle(t, 'heading', { fontSize: 24 });
    const result = updateStyle(t, 'heading', { fontSize: 18, fontWeight: 'bold' });
    expect(result.styles['heading']).toEqual({ fontSize: 18, fontWeight: 'bold' });
  });

  it('throws for missing style', () => {
    const t = createTemplate();
    expect(() => updateStyle(t, 'nope', { fontSize: 12 })).toThrow('Style "nope" not found');
  });

  it('merges with existing style properties', () => {
    let t = createTemplate();
    t = addStyle(t, 'heading', { fontSize: 24, fontWeight: 'bold' });
    const result = updateStyle(t, 'heading', { fontSize: 18 });
    expect(result.styles['heading']).toEqual({ fontSize: 18, fontWeight: 'bold' });
  });

  it('does not mutate the original', () => {
    let t = createTemplate();
    t = addStyle(t, 'heading', { fontSize: 24 });
    updateStyle(t, 'heading', { fontSize: 18 });
    expect(t.styles['heading']!.fontSize).toBe(24);
  });
});

describe('updateTemplate', () => {
  it('updates top-level properties', () => {
    const t = createTemplate();
    const result = updateTemplate(t, { name: 'My Template', description: 'A desc' });
    expect(result.name).toBe('My Template');
    expect(result.description).toBe('A desc');
  });

  it('deep-merges page margins', () => {
    const t = createTemplate();
    const result = updateTemplate(t, { page: { width: 800, margins: { top: 10 } } });
    expect(result.page.width).toBe(800);
    expect(result.page.margins.top).toBe(10);
    expect(result.page.margins.right).toBe(40); // preserved from default
  });

  it('preserves version', () => {
    const t = createTemplate();
    const result = updateTemplate(t, { name: 'Updated' });
    expect(result.version).toBe('1.0');
  });

  it('does not mutate the original', () => {
    const t = createTemplate();
    updateTemplate(t, { name: 'Updated' });
    expect(t.name).toBe('Untitled Template');
  });
});

// ---- REMOVE operations ----

describe('removeSection', () => {
  it('removes a section', () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addSection(t, { id: 'sec2', bands: [] });
    const result = removeSection(t, 'sec1');
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0]!.id).toBe('sec2');
  });

  it('throws for missing section', () => {
    const t = createTemplate();
    expect(() => removeSection(t, 'nope')).toThrow('Section "nope" not found');
  });

  it('does not mutate the original', () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    removeSection(t, 'sec1');
    expect(t.sections).toHaveLength(1);
  });
});

describe('removeBand', () => {
  it('removes a band', () => {
    const t = buildTemplate();
    const result = removeBand(t, 'band1');
    expect(result.sections[0]!.bands).toHaveLength(0);
  });

  it('throws for missing band', () => {
    const t = createTemplate();
    expect(() => removeBand(t, 'nope')).toThrow('Band "nope" not found');
  });

  it('does not mutate the original', () => {
    const t = buildTemplate();
    removeBand(t, 'band1');
    expect(t.sections[0]!.bands).toHaveLength(1);
  });
});

describe('removeElement', () => {
  it('removes a top-level element', () => {
    const t = buildTemplate();
    const result = removeElement(t, 'el1');
    expect(result.sections[0]!.bands[0]!.elements).toHaveLength(1);
    expect(result.sections[0]!.bands[0]!.elements[0]!.id).toBe('el2');
  });

  it('removes a nested container child', () => {
    let t = buildTemplate();
    const container = makeElement({
      id: 'container1',
      type: 'container',
      elements: [makeElement({ id: 'child1' }), makeElement({ id: 'child2' })],
    });
    t = addElement(t, 'band1', container);
    const result = removeElement(t, 'child1');
    const c = result.sections[0]!.bands[0]!.elements[2]!;
    expect(c.elements).toHaveLength(1);
    expect(c.elements![0]!.id).toBe('child2');
  });

  it('throws for missing element', () => {
    const t = createTemplate();
    expect(() => removeElement(t, 'nope')).toThrow('Element "nope" not found');
  });

  it('does not mutate the original', () => {
    const t = buildTemplate();
    removeElement(t, 'el1');
    expect(t.sections[0]!.bands[0]!.elements).toHaveLength(2);
  });
});

describe('removeStyle', () => {
  it('removes a named style', () => {
    let t = createTemplate();
    t = addStyle(t, 'heading', { fontSize: 24 });
    t = addStyle(t, 'body', { fontSize: 12 });
    const result = removeStyle(t, 'heading');
    expect(result.styles['heading']).toBeUndefined();
    expect(result.styles['body']).toBeDefined();
  });

  it('throws for missing style', () => {
    const t = createTemplate();
    expect(() => removeStyle(t, 'nope')).toThrow('Style "nope" not found');
  });
});

describe('removeFont', () => {
  it('removes a font by family', () => {
    let t = createTemplate();
    t = addFont(t, { family: 'Inter', weight: 400, src: 'inter.woff2' });
    t = addFont(t, { family: 'Roboto', weight: 400, src: 'roboto.woff2' });
    const result = removeFont(t, 'Inter');
    expect(result.fonts).toHaveLength(1);
    expect(result.fonts[0]!.family).toBe('Roboto');
  });

  it('removes a font by family + weight', () => {
    let t = createTemplate();
    t = addFont(t, { family: 'Inter', weight: 400, src: 'inter-400.woff2' });
    t = addFont(t, { family: 'Inter', weight: 700, src: 'inter-700.woff2' });
    const result = removeFont(t, 'Inter', 700);
    expect(result.fonts).toHaveLength(1);
    expect(result.fonts[0]!.weight).toBe(400);
  });

  it('throws for missing font', () => {
    const t = createTemplate();
    expect(() => removeFont(t, 'Nope')).toThrow('Font "Nope" not found');
  });
});

// ---- MOVE operations ----

describe('moveSection', () => {
  it('moves a section to a new index', () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addSection(t, { id: 'sec2', bands: [] });
    t = addSection(t, { id: 'sec3', bands: [] });
    const result = moveSection(t, 'sec3', 0);
    expect(result.sections.map((s) => s.id)).toEqual(['sec3', 'sec1', 'sec2']);
  });

  it('clamps out-of-bounds index', () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addSection(t, { id: 'sec2', bands: [] });
    const result = moveSection(t, 'sec1', 100);
    expect(result.sections.map((s) => s.id)).toEqual(['sec2', 'sec1']);
  });

  it('throws for missing section', () => {
    const t = createTemplate();
    expect(() => moveSection(t, 'nope', 0)).toThrow('Section "nope" not found');
  });

  it('does not mutate the original', () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addSection(t, { id: 'sec2', bands: [] });
    const original = t;
    moveSection(t, 'sec2', 0);
    expect(original.sections[0]!.id).toBe('sec1');
  });
});

describe('moveBand', () => {
  it('moves a band to a different section', () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addSection(t, { id: 'sec2', bands: [] });
    t = addBand(t, 'sec1', makeBand({ id: 'b1' }));
    const result = moveBand(t, 'b1', 'sec2', 0);
    expect(result.sections[0]!.bands).toHaveLength(0);
    expect(result.sections[1]!.bands).toHaveLength(1);
    expect(result.sections[1]!.bands[0]!.id).toBe('b1');
  });

  it('moves a band within the same section', () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', makeBand({ id: 'b1' }));
    t = addBand(t, 'sec1', makeBand({ id: 'b2' }));
    const result = moveBand(t, 'b1', 'sec1', 1);
    expect(result.sections[0]!.bands.map((b) => b.id)).toEqual(['b2', 'b1']);
  });

  it('throws for missing band', () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    expect(() => moveBand(t, 'nope', 'sec1', 0)).toThrow('Band "nope" not found');
  });

  it('throws for missing target section', () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', makeBand({ id: 'b1' }));
    expect(() => moveBand(t, 'b1', 'nope', 0)).toThrow('Section "nope" not found');
  });
});

describe('moveElement', () => {
  it('moves an element to a different band', () => {
    let t = buildTemplate();
    t = addBand(t, 'sec1', makeBand({ id: 'band2' }));
    const result = moveElement(t, 'el1', 'band2');
    expect(result.sections[0]!.bands[0]!.elements).toHaveLength(1);
    expect(result.sections[0]!.bands[0]!.elements[0]!.id).toBe('el2');
    expect(result.sections[0]!.bands[1]!.elements).toHaveLength(1);
    expect(result.sections[0]!.bands[1]!.elements[0]!.id).toBe('el1');
  });

  it('moves element to a specific index', () => {
    let t = buildTemplate();
    t = addBand(t, 'sec1', makeBand({ id: 'band2' }));
    t = addElement(t, 'band2', makeElement({ id: 'el3' }));
    const result = moveElement(t, 'el1', 'band2', 0);
    expect(result.sections[0]!.bands[1]!.elements.map((e) => e.id)).toEqual(['el1', 'el3']);
  });

  it('throws for missing element', () => {
    const t = buildTemplate();
    expect(() => moveElement(t, 'nope', 'band1')).toThrow('Element "nope" not found');
  });

  it('throws for missing target band', () => {
    const t = buildTemplate();
    expect(() => moveElement(t, 'el1', 'nope')).toThrow('Band "nope" not found');
  });

  it('moves a nested container child to a different band', () => {
    let t = buildTemplate();
    const container = makeElement({
      id: 'container1',
      type: 'container',
      elements: [makeElement({ id: 'child1' }), makeElement({ id: 'child2' })],
    });
    t = addElement(t, 'band1', container);
    t = addBand(t, 'sec1', makeBand({ id: 'band2' }));
    const result = moveElement(t, 'child1', 'band2');
    // child1 removed from container
    const c = result.sections[0]!.bands[0]!.elements[2]!;
    expect(c.elements).toHaveLength(1);
    expect(c.elements![0]!.id).toBe('child2');
    // child1 added to band2
    expect(result.sections[0]!.bands[1]!.elements).toHaveLength(1);
    expect(result.sections[0]!.bands[1]!.elements[0]!.id).toBe('child1');
  });
});

describe('reorderElement', () => {
  it('moves element to a new position within its band', () => {
    const t = buildTemplate();
    const result = reorderElement(t, 'el1', 1);
    expect(result.sections[0]!.bands[0]!.elements.map((e) => e.id)).toEqual(['el2', 'el1']);
  });

  it('bring to front (large index)', () => {
    let t = buildTemplate();
    t = addElement(t, 'band1', makeElement({ id: 'el3' }));
    const result = reorderElement(t, 'el1', 100);
    expect(result.sections[0]!.bands[0]!.elements.map((e) => e.id)).toEqual(['el2', 'el3', 'el1']);
  });

  it('send to back (index 0)', () => {
    let t = buildTemplate();
    t = addElement(t, 'band1', makeElement({ id: 'el3' }));
    const result = reorderElement(t, 'el3', 0);
    expect(result.sections[0]!.bands[0]!.elements.map((e) => e.id)).toEqual(['el3', 'el1', 'el2']);
  });

  it('throws for missing element', () => {
    const t = buildTemplate();
    expect(() => reorderElement(t, 'nope', 0)).toThrow('Element "nope" not found');
  });

  it('reorders within a nested container', () => {
    let t = buildTemplate();
    const container = makeElement({
      id: 'container1',
      type: 'container',
      elements: [
        makeElement({ id: 'child1' }),
        makeElement({ id: 'child2' }),
        makeElement({ id: 'child3' }),
      ],
    });
    t = addElement(t, 'band1', container);
    const result = reorderElement(t, 'child1', 2);
    const c = result.sections[0]!.bands[0]!.elements[2]!;
    expect(c.elements!.map((e) => e.id)).toEqual(['child2', 'child3', 'child1']);
  });

  it('does not mutate the original', () => {
    const t = buildTemplate();
    reorderElement(t, 'el1', 1);
    expect(t.sections[0]!.bands[0]!.elements[0]!.id).toBe('el1');
  });
});

// ---- CLONE operations ----

describe('cloneSection', () => {
  it('clones a section with new IDs', () => {
    const t = buildTemplate();
    const result = cloneSection(t, 'sec1');
    expect(result.sections).toHaveLength(2);
    const cloned = result.sections[1]!;
    expect(cloned.id).not.toBe('sec1');
    expect(cloned.bands).toHaveLength(1);
    expect(cloned.bands[0]!.id).not.toBe('band1');
    expect(cloned.bands[0]!.elements).toHaveLength(2);
    expect(cloned.bands[0]!.elements[0]!.id).not.toBe('el1');
    expect(cloned.bands[0]!.elements[1]!.id).not.toBe('el2');
  });

  it('preserves non-ID properties', () => {
    const t = buildTemplate();
    const result = cloneSection(t, 'sec1');
    const cloned = result.sections[1]!;
    expect(cloned.bands[0]!.type).toBe('body');
    expect(cloned.bands[0]!.height).toBe(50);
    expect(cloned.bands[0]!.elements[0]!.type).toBe('text');
    expect(cloned.bands[0]!.elements[0]!.width).toBe(100);
  });

  it('inserts at custom index', () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addSection(t, { id: 'sec2', bands: [] });
    const result = cloneSection(t, 'sec2', 0);
    expect(result.sections).toHaveLength(3);
    expect(result.sections[0]!.id).not.toBe('sec2');
    expect(result.sections[1]!.id).toBe('sec1');
    expect(result.sections[2]!.id).toBe('sec2');
  });

  it('throws for missing section', () => {
    const t = createTemplate();
    expect(() => cloneSection(t, 'nope')).toThrow('Section "nope" not found');
  });

  it('does not mutate the original', () => {
    const t = buildTemplate();
    cloneSection(t, 'sec1');
    expect(t.sections).toHaveLength(1);
  });
});

describe('cloneBand', () => {
  it('clones a band with new IDs', () => {
    const t = buildTemplate();
    const result = cloneBand(t, 'band1');
    expect(result.sections[0]!.bands).toHaveLength(2);
    const cloned = result.sections[0]!.bands[1]!;
    expect(cloned.id).not.toBe('band1');
    expect(cloned.elements).toHaveLength(2);
    expect(cloned.elements[0]!.id).not.toBe('el1');
  });

  it('preserves non-ID properties', () => {
    const t = buildTemplate();
    const result = cloneBand(t, 'band1');
    const cloned = result.sections[0]!.bands[1]!;
    expect(cloned.type).toBe('body');
    expect(cloned.height).toBe(50);
  });

  it('inserts at custom index', () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', makeBand({ id: 'b1' }));
    t = addBand(t, 'sec1', makeBand({ id: 'b2' }));
    const result = cloneBand(t, 'b2', 0);
    expect(result.sections[0]!.bands).toHaveLength(3);
    expect(result.sections[0]!.bands[0]!.id).not.toBe('b2');
    expect(result.sections[0]!.bands[1]!.id).toBe('b1');
  });

  it('throws for missing band', () => {
    const t = createTemplate();
    expect(() => cloneBand(t, 'nope')).toThrow('Band "nope" not found');
  });

  it('does not mutate the original', () => {
    const t = buildTemplate();
    cloneBand(t, 'band1');
    expect(t.sections[0]!.bands).toHaveLength(1);
  });
});

describe('cloneElement', () => {
  it('clones an element with a new ID', () => {
    const t = buildTemplate();
    const result = cloneElement(t, 'el1');
    const elements = result.sections[0]!.bands[0]!.elements;
    expect(elements).toHaveLength(3);
    expect(elements[1]!.id).not.toBe('el1');
    expect(elements[1]!.id).not.toBe('el2');
  });

  it('preserves non-ID properties', () => {
    const t = buildTemplate();
    const result = cloneElement(t, 'el1');
    const cloned = result.sections[0]!.bands[0]!.elements[1]!;
    expect(cloned.type).toBe('text');
    expect(cloned.x).toBe(0);
    expect(cloned.width).toBe(100);
    expect(cloned.properties).toEqual({ content: 'test' });
  });

  it('deep-clones nested children with new IDs', () => {
    let t = buildTemplate();
    const container = makeElement({
      id: 'container1',
      type: 'container',
      elements: [makeElement({ id: 'child1' })],
    });
    t = addElement(t, 'band1', container);
    const result = cloneElement(t, 'container1');
    const elements = result.sections[0]!.bands[0]!.elements;
    expect(elements).toHaveLength(4);
    const cloned = elements[3]!;
    expect(cloned.id).not.toBe('container1');
    expect(cloned.elements).toHaveLength(1);
    expect(cloned.elements![0]!.id).not.toBe('child1');
  });

  it('inserts at custom index', () => {
    const t = buildTemplate();
    const result = cloneElement(t, 'el2', 0);
    const elements = result.sections[0]!.bands[0]!.elements;
    expect(elements).toHaveLength(3);
    expect(elements[0]!.id).not.toBe('el2');
    expect(elements[0]!.type).toBe('text');
  });

  it('throws for missing element', () => {
    const t = createTemplate();
    expect(() => cloneElement(t, 'nope')).toThrow('Element "nope" not found');
  });

  it('clones a nested container child', () => {
    let t = buildTemplate();
    const container = makeElement({
      id: 'container1',
      type: 'container',
      elements: [makeElement({ id: 'child1' })],
    });
    t = addElement(t, 'band1', container);
    const result = cloneElement(t, 'child1');
    const c = result.sections[0]!.bands[0]!.elements[2]!;
    expect(c.elements).toHaveLength(2);
    expect(c.elements![0]!.id).toBe('child1');
    expect(c.elements![1]!.id).not.toBe('child1');
    expect(c.elements![1]!.type).toBe('text'); // preserves properties
  });

  it('does not mutate the original', () => {
    const t = buildTemplate();
    cloneElement(t, 'el1');
    expect(t.sections[0]!.bands[0]!.elements).toHaveLength(2);
  });
});
