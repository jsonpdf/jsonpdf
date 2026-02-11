import type { JSONSchema } from '@jsonpdf/core';
import { validateWithSchema, applySchemaDefaults as coreApplyDefaults } from '@jsonpdf/core';

/** Validate user data against a template's dataSchema. Throws on failure. */
export function validateData(data: Record<string, unknown>, schema: JSONSchema): void {
  // Skip validation if schema is empty or just { type: 'object' }
  const keys = Object.keys(schema);
  if (keys.length === 0) return;
  if (keys.length === 1 && schema['type'] === 'object') return;

  const result = validateWithSchema(schema, data);
  if (!result.valid) {
    const messages = result.errors.map((e) => `${e.path}: ${e.message}`).join('; ');
    throw new Error(`Data validation failed: ${messages}`);
  }
}

/**
 * Return a copy of `data` with `default` values from the schema filled in
 * for any missing properties. Uses AJV's `useDefaults` option.
 */
export function applySchemaDefaults(
  data: Record<string, unknown>,
  schema: JSONSchema,
): Record<string, unknown> {
  const keys = Object.keys(schema);
  if (keys.length === 0) return data;
  if (keys.length === 1 && schema['type'] === 'object') return data;

  return coreApplyDefaults(schema, data);
}

/** Resolve a dot-separated path against a data object. */
export function resolveDotPath(data: Record<string, unknown>, path: string): unknown {
  if (!path) return undefined;
  const segments = path.split('.');
  let current: unknown = data;
  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

export interface ItemContext {
  item: unknown;
  itemName: string;
  index: number;
}

/** Build a Liquid scope from data, page info, and optional item context. */
export function buildScope(
  data: Record<string, unknown>,
  pageNumber: number,
  totalPages: number,
  itemContext?: ItemContext,
): Record<string, unknown> {
  const scope: Record<string, unknown> = {
    ...data,
    _pageNumber: pageNumber,
    _totalPages: totalPages,
  };
  if (itemContext) {
    scope[itemContext.itemName] = itemContext.item;
    scope['_index'] = itemContext.index;
  }
  return scope;
}
