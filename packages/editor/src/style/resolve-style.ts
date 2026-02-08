import type { Element, Style } from '@jsonpdf/core';

const DEFAULT_STYLE: Style = {
  fontFamily: 'Helvetica',
  fontSize: 12,
  fontWeight: 'normal',
  fontStyle: 'normal',
  color: '#000000',
  textAlign: 'left',
  lineHeight: 1.2,
};

/** Resolve the effective style for an element: defaults -> named -> overrides. */
export function resolveElementStyle(element: Element, styles: Record<string, Style>): Style {
  const namedStyle = element.style ? styles[element.style] : undefined;
  return {
    ...DEFAULT_STYLE,
    ...(namedStyle ?? {}),
    ...(element.styleOverrides ?? {}),
  };
}
