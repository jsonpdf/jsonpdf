import type { Style, Element, PaddingValue } from '@jsonpdf/core';

/** Non-font style defaults. fontFamily comes from template.defaultStyle. */
export const STYLE_DEFAULTS: Style = {
  fontSize: 12,
  fontWeight: 'normal',
  fontStyle: 'normal',
  color: '#000000',
  textAlign: 'left',
  lineHeight: 1.2,
};

/** Resolve the effective style for an element: STYLE_DEFAULTS → defaultStyle → named → overrides. */
export function resolveElementStyle(
  element: Element,
  styles: Record<string, Style>,
  defaultStyle: Style,
): Style {
  const namedStyle = element.style ? styles[element.style] : undefined;
  return {
    ...STYLE_DEFAULTS,
    ...defaultStyle,
    ...(namedStyle ?? {}),
    ...(element.styleOverrides ?? {}),
  };
}

/** Resolve a named style with defaults applied. */
export function resolveNamedStyle(
  name: string,
  styles: Record<string, Style>,
  defaultStyle: Style,
): Style {
  return { ...STYLE_DEFAULTS, ...defaultStyle, ...(styles[name] ?? {}) };
}

/** Normalize padding to four-sided object form. Negative values are clamped to 0. */
export function normalizePadding(padding: PaddingValue | undefined): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  if (padding === undefined) return { top: 0, right: 0, bottom: 0, left: 0 };
  if (typeof padding === 'number') {
    const v = Math.max(0, padding);
    return { top: v, right: v, bottom: v, left: v };
  }
  return {
    top: Math.max(0, padding.top),
    right: Math.max(0, padding.right),
    bottom: Math.max(0, padding.bottom),
    left: Math.max(0, padding.left),
  };
}
