import { describe, it, expect } from 'vitest';
import { resolveElementStyle } from '../../src/style/resolve-style';
import type { Element, Style } from '@jsonpdf/core';

function makeElement(overrides: Partial<Element> = {}): Element {
  return {
    id: 'el1',
    type: 'text',
    x: 0,
    y: 0,
    width: 100,
    height: 20,
    properties: {},
    ...overrides,
  };
}

describe('resolveElementStyle', () => {
  it('returns default style for element with no style', () => {
    const style = resolveElementStyle(makeElement(), {});
    expect(style.fontFamily).toBe('Helvetica');
    expect(style.fontSize).toBe(12);
    expect(style.fontWeight).toBe('normal');
    expect(style.color).toBe('#000000');
    expect(style.textAlign).toBe('left');
    expect(style.lineHeight).toBe(1.2);
  });

  it('applies named style', () => {
    const styles: Record<string, Style> = {
      heading: { fontSize: 24, fontWeight: 'bold' },
    };
    const style = resolveElementStyle(makeElement({ style: 'heading' }), styles);
    expect(style.fontSize).toBe(24);
    expect(style.fontWeight).toBe('bold');
    expect(style.fontFamily).toBe('Helvetica'); // default preserved
  });

  it('applies style overrides on top of named style', () => {
    const styles: Record<string, Style> = {
      heading: { fontSize: 24, fontWeight: 'bold', color: '#333333' },
    };
    const el = makeElement({
      style: 'heading',
      styleOverrides: { color: '#ff0000' },
    });
    const style = resolveElementStyle(el, styles);
    expect(style.fontSize).toBe(24);
    expect(style.fontWeight).toBe('bold');
    expect(style.color).toBe('#ff0000'); // overridden
  });

  it('applies overrides without named style', () => {
    const el = makeElement({ styleOverrides: { fontSize: 18 } });
    const style = resolveElementStyle(el, {});
    expect(style.fontSize).toBe(18);
    expect(style.fontFamily).toBe('Helvetica'); // default
  });

  it('handles missing named style gracefully', () => {
    const el = makeElement({ style: 'nonexistent' });
    const style = resolveElementStyle(el, {});
    expect(style.fontFamily).toBe('Helvetica');
    expect(style.fontSize).toBe(12);
  });
});
