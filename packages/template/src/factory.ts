import type { Template, PageConfig } from '@jsonpdf/core';
import { DEFAULT_FONTS } from './default-fonts.js';

const DEFAULT_PAGE: PageConfig = {
  width: 612,
  height: 792,
  margins: { top: 40, right: 40, bottom: 40, left: 40 },
};

/**
 * Create a new template with sensible defaults. Version is always '1.0'.
 * Note: The returned template has an empty sections array. Add at least one
 * section before passing to renderPdf() or validateTemplateSchema().
 */
export function createTemplate(overrides?: Omit<Partial<Template>, 'version'>): Template {
  const page = overrides?.page
    ? {
        ...DEFAULT_PAGE,
        ...overrides.page,
        margins: { ...DEFAULT_PAGE.margins, ...overrides.page.margins },
      }
    : { ...DEFAULT_PAGE };

  return {
    name: 'Untitled Template',
    page,
    dataSchema: { type: 'object', properties: {} },
    defaultStyle: { fontFamily: 'Inter' },
    styles: {},
    sections: [],
    fonts: [...DEFAULT_FONTS],
    ...overrides,
    // version is always locked and page uses the merged value
    version: '1.0',
    ...(overrides?.page ? { page } : {}),
  };
}
