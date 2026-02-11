import type { PDFDocument } from 'pdf-lib';
import type { FontMap } from '@jsonpdf/plugins';
import { fontKey } from '@jsonpdf/plugins';
import type { Template, Style, StyledRun, FontDeclaration, Element } from '@jsonpdf/core';
import { resolveElementStyle } from './style-resolver.js';

export interface FontSpec {
  family: string;
  weight: 'normal' | 'bold';
  style: 'normal' | 'italic';
}

/** Map a numeric font weight to 'normal' or 'bold'. */
export function mapWeight(weight?: number): 'normal' | 'bold' {
  if (weight === undefined) return 'normal';
  return weight > 500 ? 'bold' : 'normal';
}

/**
 * Find a FontDeclaration that matches a given font spec.
 * Tries exact match (family + weight + style) first, then falls back
 * to any declaration with the same family name.
 */
function findDeclaration(
  spec: FontSpec,
  declarations: FontDeclaration[],
): FontDeclaration | undefined {
  const familyLower = spec.family.toLowerCase();
  let familyFallback: FontDeclaration | undefined;
  for (const d of declarations) {
    if (d.family.toLowerCase() !== familyLower) continue;
    const weightMatch = mapWeight(d.weight) === spec.weight;
    const styleMatch = (d.style ?? 'normal') === spec.style;
    if (weightMatch && styleMatch) return d;
    familyFallback ??= d;
  }
  return familyFallback;
}

/**
 * Embed all required fonts. Each font spec must have a matching
 * FontDeclaration with base64-encoded data. Fontkit must be registered
 * on the doc before calling this function.
 */
export async function embedFonts(
  doc: PDFDocument,
  specs: FontSpec[],
  fontDeclarations: FontDeclaration[],
): Promise<FontMap> {
  const fonts: FontMap = new Map();
  const uniqueKeys = new Set<string>();

  for (const spec of specs) {
    uniqueKeys.add(fontKey(spec.family, spec.weight, spec.style));
  }

  for (const key of uniqueKeys) {
    if (fonts.has(key)) continue;

    const [family, weight, style] = key.split(':') as [
      string,
      'normal' | 'bold',
      'normal' | 'italic',
    ];
    const spec: FontSpec = { family, weight, style };
    const decl = findDeclaration(spec, fontDeclarations);
    if (!decl) {
      throw new Error(
        `No font declaration found for "${key}". Declare the font in template.fonts.`,
      );
    }
    const binary = atob(decl.data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const embedded = await doc.embedFont(bytes, { subset: true });
    fonts.set(key, embedded);
  }

  return fonts;
}

/** Collect all unique font specs referenced in a template's styles. */
export function collectFontSpecs(template: Template): FontSpec[] {
  const specs = new Map<string, FontSpec>();
  const defaultFamily = template.defaultStyle.fontFamily;

  function addFromStyle(style: Partial<Style>): void {
    const family = style.fontFamily ?? defaultFamily;
    const weight = style.fontWeight ?? 'normal';
    const fontStyle = style.fontStyle ?? 'normal';
    const key = fontKey(family, weight, fontStyle);
    if (!specs.has(key)) {
      specs.set(key, { family, weight, style: fontStyle });
    }
  }

  // Always include the default font so the font map is never empty
  addFromStyle(template.defaultStyle);

  // Named styles
  for (const style of Object.values(template.styles)) {
    addFromStyle(style);
  }

  // Walk elements recursively, computing the RESOLVED style for each
  // so that cross-source font combinations (e.g. fontFamily from override +
  // fontWeight from named style) are properly collected.
  function walkElement(element: Element): void {
    // Resolved style captures the full merge of defaults + named + overrides
    addFromStyle(resolveElementStyle(element, template.styles, template.defaultStyle));

    // Conditional style variations
    if (element.conditionalStyles) {
      for (const cs of element.conditionalStyles) {
        const effective: Element = {
          ...element,
          style: cs.style ?? element.style,
          styleOverrides: { ...(element.styleOverrides ?? {}), ...(cs.styleOverrides ?? {}) },
        };
        addFromStyle(resolveElementStyle(effective, template.styles, template.defaultStyle));
      }
    }

    // Rich text StyledRun variations
    const content = element.properties.content;
    if (Array.isArray(content)) {
      for (const run of content as StyledRun[]) {
        if (run.styleOverrides || run.style) {
          const effective: Element = {
            ...element,
            style: run.style ?? element.style,
            styleOverrides: { ...(element.styleOverrides ?? {}), ...(run.styleOverrides ?? {}) },
          };
          addFromStyle(resolveElementStyle(effective, template.styles, template.defaultStyle));
        }
      }
    }

    // Recurse into nested elements (containers, frames)
    if (element.elements) {
      for (const child of element.elements) {
        walkElement(child);
      }
    }
  }

  for (const section of template.sections) {
    for (const band of section.bands) {
      for (const element of band.elements) {
        walkElement(element);
      }
    }
  }

  return [...specs.values()];
}
