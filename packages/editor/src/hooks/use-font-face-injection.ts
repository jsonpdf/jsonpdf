import { useEffect } from 'react';
import type { FontDeclaration } from '@jsonpdf/core';
import { useEditorStore } from '../store';

const STYLE_ID = 'jsonpdf-fonts';

function buildFontFaceRules(fonts: FontDeclaration[]): string {
  return fonts
    .map(
      (f) =>
        `@font-face {\n` +
        `  font-family: "${f.family}";\n` +
        `  font-weight: ${String(f.weight ?? 400)};\n` +
        `  font-style: ${f.style ?? 'normal'};\n` +
        `  src: url(data:application/octet-stream;base64,${f.data});\n` +
        `}`,
    )
    .join('\n');
}

/**
 * Injects @font-face CSS rules into the document head for all fonts
 * declared in the current template. Updates when fonts change and
 * cleans up on unmount.
 */
export function useFontFaceInjection(): void {
  const fonts = useEditorStore((s) => s.template.fonts);

  useEffect(() => {
    if (fonts.length === 0) {
      const existing = document.getElementById(STYLE_ID);
      if (existing) existing.remove();
      return;
    }

    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = buildFontFaceRules(fonts);

    return () => {
      style.remove();
    };
  }, [fonts]);
}
