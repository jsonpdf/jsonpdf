import { StandardFonts } from 'pdf-lib';
import type { PDFDocument } from 'pdf-lib';
import type { FontMap } from '@jsonpdf/plugins';
import { fontKey } from '@jsonpdf/plugins';
import type { Template, Style, StyledRun, FontDeclaration } from '@jsonpdf/core';
import { loadFontBytes } from './font-loader.js';

export interface FontSpec {
  family: string;
  weight: 'normal' | 'bold';
  style: 'normal' | 'italic';
}

const STANDARD_FONT_MAP: Record<string, StandardFonts> = {
  'Helvetica:normal:normal': StandardFonts.Helvetica,
  'Helvetica:bold:normal': StandardFonts.HelveticaBold,
  'Helvetica:normal:italic': StandardFonts.HelveticaOblique,
  'Helvetica:bold:italic': StandardFonts.HelveticaBoldOblique,
  'Times:normal:normal': StandardFonts.TimesRoman,
  'Times:bold:normal': StandardFonts.TimesRomanBold,
  'Times:normal:italic': StandardFonts.TimesRomanItalic,
  'Times:bold:italic': StandardFonts.TimesRomanBoldItalic,
  'TimesRoman:normal:normal': StandardFonts.TimesRoman,
  'TimesRoman:bold:normal': StandardFonts.TimesRomanBold,
  'TimesRoman:normal:italic': StandardFonts.TimesRomanItalic,
  'TimesRoman:bold:italic': StandardFonts.TimesRomanBoldItalic,
  'Courier:normal:normal': StandardFonts.Courier,
  'Courier:bold:normal': StandardFonts.CourierBold,
  'Courier:normal:italic': StandardFonts.CourierOblique,
  'Courier:bold:italic': StandardFonts.CourierBoldOblique,
};

const DEFAULT_FONT_KEY = 'Helvetica:normal:normal';

/** Resolve a font spec to a pdf-lib StandardFont enum value. */
export function resolveStandardFont(spec: FontSpec): StandardFonts {
  const key = fontKey(spec.family, spec.weight, spec.style);
  return STANDARD_FONT_MAP[key] ?? StandardFonts.Helvetica;
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

/** Check whether a font key corresponds to a standard (built-in) font. */
export function isStandardFont(key: string): boolean {
  return key in STANDARD_FONT_MAP;
}

/**
 * Embed all required fonts. Standard fonts use pdf-lib built-ins.
 * Custom fonts are loaded from their FontDeclaration.src and embedded
 * with subsetting via fontkit (fontkit must be registered on the doc first).
 */
export async function embedFonts(
  doc: PDFDocument,
  specs: FontSpec[],
  fontDeclarations: FontDeclaration[] = [],
): Promise<FontMap> {
  const fonts: FontMap = new Map();
  const uniqueKeys = new Set<string>();

  // Always include default
  uniqueKeys.add(DEFAULT_FONT_KEY);

  for (const spec of specs) {
    uniqueKeys.add(fontKey(spec.family, spec.weight, spec.style));
  }

  // Embed default font first so we can reuse it for fallbacks
  const defaultFont = await doc.embedFont(STANDARD_FONT_MAP[DEFAULT_FONT_KEY]);
  fonts.set(DEFAULT_FONT_KEY, defaultFont);

  for (const key of uniqueKeys) {
    if (fonts.has(key)) continue; // Already embedded (e.g. default)
    if (key in STANDARD_FONT_MAP) {
      const embedded = await doc.embedFont(STANDARD_FONT_MAP[key]);
      fonts.set(key, embedded);
    } else {
      // Custom font: find matching declaration
      const [family, weight, style] = key.split(':') as [
        string,
        'normal' | 'bold',
        'normal' | 'italic',
      ];
      const spec: FontSpec = { family, weight, style };
      const decl = findDeclaration(spec, fontDeclarations);
      if (!decl) {
        console.warn(`[jsonpdf] No font declaration found for "${key}", falling back to Helvetica`);
        fonts.set(key, defaultFont);
      } else {
        const bytes = await loadFontBytes(decl.src);
        const embedded = await doc.embedFont(bytes, { subset: true });
        fonts.set(key, embedded);
      }
    }
  }

  return fonts;
}

/** Collect all unique font specs referenced in a template's styles. */
export function collectFontSpecs(template: Template): FontSpec[] {
  const specs = new Map<string, FontSpec>();

  function addFromStyle(style: Partial<Style>): void {
    const family = style.fontFamily ?? 'Helvetica';
    const weight = style.fontWeight ?? 'normal';
    const fontStyle = style.fontStyle ?? 'normal';
    const key = fontKey(family, weight, fontStyle);
    if (!specs.has(key)) {
      specs.set(key, { family, weight, style: fontStyle });
    }
  }

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
