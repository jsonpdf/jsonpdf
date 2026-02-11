import { describe, it, expect } from 'vitest';
import {
  resolveElementStyle,
  resolveNamedStyle,
  normalizePadding,
  STYLE_DEFAULTS,
} from '../src/style-resolver.js';
import type { Element, Style } from '@jsonpdf/core';

const defaultStyle: Style = { fontFamily: 'TestFont' };

function makeElement(overrides?: Partial<Element>): Element {
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

const styles: Record<string, Style> = {
  heading: { fontSize: 24, fontWeight: 'bold', color: '#333333' },
  body: { fontSize: 12 },
};

describe('STYLE_DEFAULTS', () => {
  it('does not contain fontFamily', () => {
    expect(STYLE_DEFAULTS).not.toHaveProperty('fontFamily');
  });

  it('contains base style properties', () => {
    expect(STYLE_DEFAULTS.fontSize).toBe(12);
    expect(STYLE_DEFAULTS.fontWeight).toBe('normal');
    expect(STYLE_DEFAULTS.color).toBe('#000000');
    expect(STYLE_DEFAULTS.textAlign).toBe('left');
    expect(STYLE_DEFAULTS.lineHeight).toBe(1.2);
  });
});

describe('resolveElementStyle', () => {
  it('returns defaults when no style or overrides', () => {
    const result = resolveElementStyle(makeElement(), {}, defaultStyle);
    expect(result.fontFamily).toBe('TestFont');
    expect(result.fontSize).toBe(12);
    expect(result.fontWeight).toBe('normal');
    expect(result.color).toBe('#000000');
    expect(result.textAlign).toBe('left');
    expect(result.lineHeight).toBe(1.2);
  });

  it('applies named style', () => {
    const el = makeElement({ style: 'heading' });
    const result = resolveElementStyle(el, styles, defaultStyle);
    expect(result.fontSize).toBe(24);
    expect(result.fontWeight).toBe('bold');
    expect(result.color).toBe('#333333');
    // fontFamily comes from defaultStyle when not set by named style
    expect(result.fontFamily).toBe('TestFont');
  });

  it('applies style overrides on top of named style', () => {
    const el = makeElement({
      style: 'heading',
      styleOverrides: { color: '#ff0000', fontSize: 18 },
    });
    const result = resolveElementStyle(el, styles, defaultStyle);
    expect(result.color).toBe('#ff0000');
    expect(result.fontSize).toBe(18);
    // Named style property still applied when not overridden
    expect(result.fontWeight).toBe('bold');
  });

  it('applies overrides without named style', () => {
    const el = makeElement({ styleOverrides: { fontSize: 16 } });
    const result = resolveElementStyle(el, {}, defaultStyle);
    expect(result.fontSize).toBe(16);
    expect(result.fontFamily).toBe('TestFont');
  });

  it('defaultStyle overrides STYLE_DEFAULTS', () => {
    const customDefault: Style = { fontFamily: 'CustomFont', fontSize: 14 };
    const result = resolveElementStyle(makeElement(), {}, customDefault);
    expect(result.fontFamily).toBe('CustomFont');
    expect(result.fontSize).toBe(14);
    // STYLE_DEFAULTS still apply for properties not in defaultStyle
    expect(result.color).toBe('#000000');
  });

  it('named style overrides defaultStyle', () => {
    const customDefault: Style = { fontFamily: 'CustomFont', fontSize: 14 };
    const el = makeElement({ style: 'heading' });
    const result = resolveElementStyle(el, styles, customDefault);
    // Named style fontSize (24) overrides defaultStyle fontSize (14)
    expect(result.fontSize).toBe(24);
    // defaultStyle fontFamily still applies since heading doesn't set it
    expect(result.fontFamily).toBe('CustomFont');
  });
});

describe('resolveNamedStyle', () => {
  it('resolves existing style with defaults', () => {
    const result = resolveNamedStyle('heading', styles, defaultStyle);
    expect(result.fontSize).toBe(24);
    expect(result.fontFamily).toBe('TestFont');
  });

  it('returns defaults for missing style', () => {
    const result = resolveNamedStyle('nonexistent', styles, defaultStyle);
    expect(result.fontSize).toBe(12);
    expect(result.fontFamily).toBe('TestFont');
  });
});

describe('normalizePadding', () => {
  it('returns zero padding for undefined', () => {
    expect(normalizePadding(undefined)).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it('expands number to all sides', () => {
    expect(normalizePadding(10)).toEqual({ top: 10, right: 10, bottom: 10, left: 10 });
  });

  it('passes through object form', () => {
    const padding = { top: 5, right: 10, bottom: 15, left: 20 };
    expect(normalizePadding(padding)).toEqual(padding);
  });

  it('clamps negative number to zero', () => {
    expect(normalizePadding(-10)).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it('clamps negative sides to zero in object form', () => {
    const padding = { top: -5, right: 10, bottom: -15, left: 20 };
    expect(normalizePadding(padding)).toEqual({ top: 0, right: 10, bottom: 0, left: 20 });
  });
});
