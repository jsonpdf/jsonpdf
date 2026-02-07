import type { Template } from '@jsonpdf/core';
import { validateTemplateSchema } from '@jsonpdf/core';

/** Migrate a template to the current version. Validates structure after migration. */
export function migrateTemplate(template: unknown): Template {
  if (template === null || typeof template !== 'object') {
    throw new Error('Template must be a non-null object');
  }
  const t = template as Record<string, unknown>;
  if (typeof t.version !== 'string') {
    throw new Error('Template must have a version string');
  }
  if (t.version === '1.0') {
    const result = validateTemplateSchema(template);
    if (!result.valid) {
      const messages = result.errors.map((e) => `${e.path}: ${e.message}`).join('; ');
      throw new Error(`Invalid template structure: ${messages}`);
    }
    return template as Template;
  }
  throw new Error(`Unknown template version: ${t.version}`);
}
