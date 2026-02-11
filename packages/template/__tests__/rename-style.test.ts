import { describe, it, expect } from 'vitest';
import { createTemplate } from '../src/factory.js';
import { addSection, addBand, addElement, addStyle, renameStyle } from '../src/operations.js';
import type { Element, Band, StyledRun } from '@jsonpdf/core';

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
  t = addStyle(t, 'heading', { fontSize: 24, fontWeight: 'bold' });
  t = addStyle(t, 'body', { fontSize: 12 });
  t = addSection(t, { id: 'sec1', bands: [] });
  t = addBand(t, 'sec1', makeBand({ id: 'band1' }));
  return t;
}

describe('renameStyle', () => {
  it('renames the key in styles record', () => {
    const t = buildTemplate();
    const result = renameStyle(t, 'heading', 'title');
    expect(result.styles['title']).toEqual({ fontSize: 24, fontWeight: 'bold' });
    expect(result.styles['heading']).toBeUndefined();
    expect(result.styles['body']).toBeDefined();
  });

  it('returns the same template when oldName === newName', () => {
    const t = buildTemplate();
    const result = renameStyle(t, 'heading', 'heading');
    expect(result).toBe(t);
  });

  it('updates element.style references', () => {
    let t = buildTemplate();
    t = addElement(t, 'band1', makeElement({ id: 'el1', style: 'heading' }));
    t = addElement(t, 'band1', makeElement({ id: 'el2', style: 'body' }));
    const result = renameStyle(t, 'heading', 'title');
    expect(result.sections[0]!.bands[0]!.elements[0]!.style).toBe('title');
    expect(result.sections[0]!.bands[0]!.elements[1]!.style).toBe('body');
  });

  it('updates conditionalStyles[].style references', () => {
    let t = buildTemplate();
    t = addElement(
      t,
      'band1',
      makeElement({
        id: 'el1',
        conditionalStyles: [
          { condition: 'item.active', style: 'heading' },
          { condition: 'item.inactive', style: 'body' },
        ],
      }),
    );
    const result = renameStyle(t, 'heading', 'title');
    const el = result.sections[0]!.bands[0]!.elements[0]!;
    expect(el.conditionalStyles![0]!.style).toBe('title');
    expect(el.conditionalStyles![1]!.style).toBe('body');
  });

  it('updates StyledRun.style references in text element content', () => {
    const runs: StyledRun[] = [
      { text: 'Hello ', style: 'heading' },
      { text: 'world', style: 'body' },
    ];
    let t = buildTemplate();
    t = addElement(t, 'band1', makeElement({ id: 'el1', properties: { content: runs } }));
    const result = renameStyle(t, 'heading', 'title');
    const content = result.sections[0]!.bands[0]!.elements[0]!.properties.content as StyledRun[];
    expect(content[0]!.style).toBe('title');
    expect(content[1]!.style).toBe('body');
  });

  it('recursively updates container children', () => {
    let t = buildTemplate();
    const container = makeElement({
      id: 'container1',
      type: 'container',
      elements: [
        makeElement({ id: 'child1', style: 'heading' }),
        makeElement({ id: 'child2', style: 'body' }),
      ],
    });
    t = addElement(t, 'band1', container);
    const result = renameStyle(t, 'heading', 'title');
    const c = result.sections[0]!.bands[0]!.elements[0]!;
    expect(c.elements![0]!.style).toBe('title');
    expect(c.elements![1]!.style).toBe('body');
  });

  it('recursively updates frame band elements', () => {
    let t = buildTemplate();
    const frameBands: Band[] = [
      makeBand({
        id: 'fb1',
        elements: [makeElement({ id: 'fel1', style: 'heading' })],
      }),
    ];
    const frame = makeElement({
      id: 'frame1',
      type: 'frame',
      properties: { bands: frameBands },
    });
    t = addElement(t, 'band1', frame);
    const result = renameStyle(t, 'heading', 'title');
    const frameProp = result.sections[0]!.bands[0]!.elements[0]!.properties.bands as Band[];
    expect(frameProp[0]!.elements[0]!.style).toBe('title');
  });

  it('throws on non-existent style name', () => {
    const t = buildTemplate();
    expect(() => renameStyle(t, 'nonexistent', 'title')).toThrow('Style "nonexistent" not found');
  });

  it('throws on duplicate target name', () => {
    const t = buildTemplate();
    expect(() => renameStyle(t, 'heading', 'body')).toThrow('Style "body" already exists');
  });

  it('does not mutate the original', () => {
    let t = buildTemplate();
    t = addElement(t, 'band1', makeElement({ id: 'el1', style: 'heading' }));
    const original = t;
    renameStyle(t, 'heading', 'title');
    expect(original.styles['heading']).toBeDefined();
    expect(original.sections[0]!.bands[0]!.elements[0]!.style).toBe('heading');
  });

  it('updates references across multiple sections and bands', () => {
    let t = buildTemplate();
    t = addElement(t, 'band1', makeElement({ id: 'el1', style: 'heading' }));
    t = addSection(t, { id: 'sec2', bands: [] });
    t = addBand(t, 'sec2', makeBand({ id: 'band2' }));
    t = addElement(t, 'band2', makeElement({ id: 'el2', style: 'heading' }));
    const result = renameStyle(t, 'heading', 'title');
    expect(result.sections[0]!.bands[0]!.elements[0]!.style).toBe('title');
    expect(result.sections[1]!.bands[0]!.elements[0]!.style).toBe('title');
  });
});
