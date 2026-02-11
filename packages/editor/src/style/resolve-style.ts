import type { Element, Style } from '@jsonpdf/core';

const STYLE_DEFAULTS: Style = {
  fontSize: 12,
  fontWeight: 'normal',
  fontStyle: 'normal',
  color: '#000000',
  textAlign: 'left',
  lineHeight: 1.2,
};

/** Resolve the effective style for an element: STYLE_DEFAULTS -> defaultStyle -> named -> overrides. */
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
