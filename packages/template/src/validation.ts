import { validateTemplateSchema } from '@jsonpdf/core';
import type {
  Template,
  ValidationResult,
  ValidationError,
  PluginSchemaEntry,
  Element,
  Style,
  StyledRun,
} from '@jsonpdf/core';

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

  function walkElement(element: Element, path: string): void {
    checkDuplicateId(seenIds, element.id, 'element', errors);

    if (element.style && !(element.style in template.styles)) {
      errors.push({ path, message: `Style "${element.style}" is not defined` });
    }

    if (element.elements) {
      for (const child of element.elements) {
        walkElement(child, `${path}/elements/${child.id}`);
      }
    }
  }

  for (const section of template.sections) {
    checkDuplicateId(seenIds, section.id, 'section', errors);

    for (const band of section.bands) {
      checkDuplicateId(seenIds, band.id, 'band', errors);
      const bandPath = `/sections/${section.id}/bands/${band.id}`;

      for (const element of band.elements) {
        walkElement(element, `${bandPath}/elements/${element.id}`);
      }
    }
  }

  // Check font-family references
  checkFontFamilies(template, errors);

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

function checkFontFamilies(template: Template, errors: ValidationError[]): void {
  const declaredFamilies = new Set(template.fonts.map((f) => f.family));
  const reported = new Set<string>();

  function checkFamily(family: string): void {
    if (!declaredFamilies.has(family) && !reported.has(family)) {
      reported.add(family);
      errors.push({
        path: '/fonts',
        message: `Font family "${family}" is referenced but not declared in template fonts`,
      });
    }
  }

  function checkStyle(style: Partial<Style>): void {
    if (style.fontFamily) {
      checkFamily(style.fontFamily);
    }
  }

  // Default style
  checkFamily(template.defaultStyle.fontFamily);

  // Named styles
  for (const style of Object.values(template.styles)) {
    checkStyle(style);
  }

  function walkElementFonts(element: Element): void {
    if (element.styleOverrides) {
      checkStyle(element.styleOverrides);
    }

    if (element.conditionalStyles) {
      for (const cs of element.conditionalStyles) {
        if (cs.styleOverrides) {
          checkStyle(cs.styleOverrides);
        }
      }
    }

    const content = element.properties.content;
    if (Array.isArray(content)) {
      for (const run of content as StyledRun[]) {
        if (run.styleOverrides) {
          checkStyle(run.styleOverrides);
        }
      }
    }

    if (element.elements) {
      for (const child of element.elements) {
        walkElementFonts(child);
      }
    }
  }

  // Element overrides, conditional styles, and rich text runs
  for (const section of template.sections) {
    for (const band of section.bands) {
      for (const element of band.elements) {
        walkElementFonts(element);
      }
    }
  }
}
