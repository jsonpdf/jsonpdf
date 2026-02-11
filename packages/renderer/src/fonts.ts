import type { PDFDocument } from 'pdf-lib';
import type { FontMap } from '@jsonpdf/plugins';
import { fontKey } from '@jsonpdf/plugins';
import type { Template, Style, StyledRun, FontDeclaration } from '@jsonpdf/core';

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
 * Matches by family (case-insensitive) and weight/style.
 */
function findDeclaration(
  spec: FontSpec,
  declarations: FontDeclaration[],
): FontDeclaration | undefined {
  return declarations.find((d) => {
    const familyMatch = d.family.toLowerCase() === spec.family.toLowerCase();
    const weightMatch = mapWeight(d.weight) === spec.weight;
    const styleMatch = (d.style ?? 'normal') === spec.style;
    return familyMatch && weightMatch && styleMatch;
  });
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

  // Element style overrides + rich text content
  for (const section of template.sections) {
    for (const band of section.bands) {
      for (const element of band.elements) {
        if (element.styleOverrides) {
          addFromStyle(element.styleOverrides);
        }

        // Scan conditional styles for font references
        if (element.conditionalStyles) {
          for (const cs of element.conditionalStyles) {
            if (cs.styleOverrides) {
              addFromStyle(cs.styleOverrides);
            }
            if (cs.style && cs.style in template.styles) {
              addFromStyle(template.styles[cs.style]);
            }
          }
        }

        // Scan rich text content for font references in StyledRuns
        const content = element.properties.content;
        if (Array.isArray(content)) {
          for (const run of content as StyledRun[]) {
            if (run.styleOverrides) {
              addFromStyle(run.styleOverrides);
            }
            if (run.style && run.style in template.styles) {
              addFromStyle(template.styles[run.style]);
            }
          }
        }
      }
    }
  }

  return [...specs.values()];
}
