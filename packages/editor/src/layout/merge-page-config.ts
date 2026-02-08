import type { PageConfig } from '@jsonpdf/core';

/** Merge section-level page config overrides with the template-level defaults. */
export function mergePageConfig(base: PageConfig, override?: Partial<PageConfig>): PageConfig {
  if (!override) return base;
  return {
    ...base,
    ...override,
    margins: { ...base.margins, ...(override.margins ?? {}) },
  };
}
