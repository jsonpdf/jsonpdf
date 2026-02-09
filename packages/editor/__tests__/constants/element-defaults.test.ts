import { describe, it, expect } from 'vitest';
import { createDefaultElement, ELEMENT_TYPES } from '../../src/constants/element-defaults';

describe('createDefaultElement', () => {
  it('supports all 10 element types', () => {
    expect(ELEMENT_TYPES).toHaveLength(10);
    expect(ELEMENT_TYPES).toEqual([
      'text',
      'image',
      'line',
      'shape',
      'container',
      'table',
      'chart',
      'barcode',
      'list',
      'frame',
    ]);
  });

  it.each(ELEMENT_TYPES)('creates a valid %s element', (type) => {
    const el = createDefaultElement(type);
    expect(el.id).toMatch(/^el_/);
    expect(el.type).toBe(type);
    expect(el.x).toBe(10);
    expect(el.y).toBe(10);
    expect(el.width).toBeGreaterThan(0);
    expect(el.height).toBeGreaterThan(0);
    expect(el.properties).toBeDefined();
  });

  it('generates unique IDs', () => {
    const el1 = createDefaultElement('text');
    const el2 = createDefaultElement('text');
    expect(el1.id).not.toBe(el2.id);
  });

  it('text element has content property', () => {
    const el = createDefaultElement('text');
    expect(el.properties.content).toBe('Text');
  });

  it('image element has src and fit', () => {
    const el = createDefaultElement('image');
    expect(el.properties.src).toBe('');
    expect(el.properties.fit).toBe('contain');
  });

  it('line element has direction, color, thickness', () => {
    const el = createDefaultElement('line');
    expect(el.properties.direction).toBe('horizontal');
    expect(el.properties.color).toBe('#000000');
    expect(el.properties.thickness).toBe(1);
  });

  it('shape element has shapeType', () => {
    const el = createDefaultElement('shape');
    expect(el.properties.shapeType).toBe('rect');
  });

  it('container element has layout and gap', () => {
    const el = createDefaultElement('container');
    expect(el.properties.layout).toBe('vertical');
    expect(el.properties.gap).toBe(0);
  });

  it('table element has columns and rows', () => {
    const el = createDefaultElement('table');
    expect(el.properties.columns).toHaveLength(2);
    expect(el.properties.rows).toEqual([]);
  });

  it('chart element has spec, fit, scale', () => {
    const el = createDefaultElement('chart');
    expect(el.properties.spec).toEqual({});
    expect(el.properties.fit).toBe('contain');
    expect(el.properties.scale).toBe(2);
  });

  it('barcode element has value and format', () => {
    const el = createDefaultElement('barcode');
    expect(el.properties.value).toBe('12345');
    expect(el.properties.format).toBe('qrcode');
  });

  it('list element has items', () => {
    const el = createDefaultElement('list');
    expect(el.properties.items).toHaveLength(2);
  });

  it('frame element has bands', () => {
    const el = createDefaultElement('frame');
    expect(el.properties.bands).toEqual([]);
  });

  it('returns a fallback for unknown types', () => {
    const el = createDefaultElement('unknown-type');
    expect(el.id).toMatch(/^el_/);
    expect(el.type).toBe('unknown-type');
    expect(el.width).toBe(100);
    expect(el.height).toBe(50);
    expect(el.properties).toEqual({});
  });
});
