import { StandardFonts } from 'pdf-lib';
import type { PDFDocument } from 'pdf-lib';
import type { FontMap } from '@jsonpdf/plugins';
import { fontKey } from '@jsonpdf/plugins';
import type { Template, Style, StyledRun } from '@jsonpdf/core';

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

/** Embed all required standard fonts. Always includes default Helvetica. */
export async function embedFonts(doc: PDFDocument, specs: FontSpec[]): Promise<FontMap> {
  const fonts: FontMap = new Map();
  const uniqueKeys = new Set<string>();

  // Always include default
  uniqueKeys.add(DEFAULT_FONT_KEY);

  for (const spec of specs) {
    uniqueKeys.add(fontKey(spec.family, spec.weight, spec.style));
  }

  for (const key of uniqueKeys) {
    const stdFont = STANDARD_FONT_MAP[key] ?? StandardFonts.Helvetica;
    const embedded = await doc.embedFont(stdFont);
    fonts.set(key, embedded);
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
