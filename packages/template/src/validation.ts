import { validateTemplateSchema } from '@jsonpdf/core';
import type { Template, ValidationResult, ValidationError, PluginSchemaEntry } from '@jsonpdf/core';

/** Validate a template against the schema and semantic rules. */
export function validateTemplate(
  template: Template,
  pluginSchemas?: readonly PluginSchemaEntry[],
): ValidationResult {
  const schemaResult = validateTemplateSchema(template, pluginSchemas);
  if (!schemaResult.valid) {
    return schemaResult;
  }

  const errors: ValidationError[] = [];

  // Check for duplicate IDs
  const seenIds = new Map<string, string>();

  for (const section of template.sections) {
    checkDuplicateId(seenIds, section.id, 'section', errors);

    for (const band of section.bands) {
      checkDuplicateId(seenIds, band.id, 'band', errors);

      for (const element of band.elements) {
        checkDuplicateId(seenIds, element.id, 'element', errors);

        // Check style references
        if (element.style && !(element.style in template.styles)) {
          errors.push({
            path: `/sections/${section.id}/bands/${band.id}/elements/${element.id}`,
            message: `Style "${element.style}" is not defined`,
          });
        }
      }
    }
  }

  return errors.length > 0 ? { valid: false, errors } : { valid: true, errors: [] };
}

function checkDuplicateId(
  seenIds: Map<string, string>,
  id: string,
  kind: string,
  errors: ValidationError[],
): void {
  const existing = seenIds.get(id);
  if (existing) {
    errors.push({
      path: `/${kind}/${id}`,
      message: `Duplicate ID "${id}" (also used by ${existing})`,
    });
  } else {
    seenIds.set(id, kind);
  }
}
