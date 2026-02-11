import type { JSONSchema } from '@jsonpdf/core';

export interface SampleDataOptions {
  /** Number of items to generate for arrays. Default: 3 */
  arrayLength?: number;
}

/**
 * Generate sample data conforming to a JSON Schema (draft 2020-12).
 * Walks the schema recursively, producing typed sample values.
 */
export function generateSampleData(schema: JSONSchema, options?: SampleDataOptions): unknown {
  const arrayLength = options?.arrayLength ?? 3;
  return generate(schema, 'value', arrayLength);
}

/**
 * Build a data object from a JSON Schema using `default` values where present
 * and `null` for properties that have no default. Useful for pre-populating
 * a data editor so that every key is visible.
 */
export function buildDefaultData(schema: JSONSchema): unknown {
  if ('const' in schema) return schema['const'];
  if ('default' in schema) return schema['default'];
  if (Array.isArray(schema['enum']) && schema['enum'].length > 0) return schema['enum'][0];

  const type = schema['type'] as string | undefined;

  if (type === 'object') {
    const result: Record<string, unknown> = {};
    const properties = schema['properties'] as Record<string, JSONSchema> | undefined;
    if (properties) {
      for (const [key, propSchema] of Object.entries(properties)) {
        result[key] = buildDefaultData(propSchema);
      }
    }
    return result;
  }

  if (type === 'array') {
    return [];
  }

  return null;
}

function generate(schema: JSONSchema, pathHint: string, arrayLength: number): unknown {
  // const takes precedence
  if ('const' in schema) {
    return schema['const'];
  }

  // enum — pick first value
  if (Array.isArray(schema['enum']) && schema['enum'].length > 0) {
    return schema['enum'][0];
  }

  // default — use the declared default value
  if ('default' in schema) {
    return schema['default'];
  }

  // oneOf / anyOf — generate from first option
  for (const key of ['oneOf', 'anyOf'] as const) {
    const variants = schema[key];
    if (Array.isArray(variants) && variants.length > 0) {
      return generate(variants[0] as JSONSchema, pathHint, arrayLength);
    }
  }

  const type = schema['type'] as string | undefined;

  if (type === 'object') {
    return generateObject(schema, arrayLength);
  }

  if (type === 'array') {
    return generateArray(schema, pathHint, arrayLength);
  }

  if (type === 'string') {
    return generateString(schema, pathHint);
  }

  if (type === 'number' || type === 'integer') {
    return generateNumber(schema, type === 'integer');
  }

  if (type === 'boolean') {
    return true;
  }

  if (type === 'null') {
    return null;
  }

  // No type specified — return null
  return null;
}

function generateObject(schema: JSONSchema, arrayLength: number): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const properties = schema['properties'] as Record<string, JSONSchema> | undefined;
  if (!properties) return result;

  for (const [key, propSchema] of Object.entries(properties)) {
    result[key] = generate(propSchema, key, arrayLength);
  }
  return result;
}

function generateArray(schema: JSONSchema, pathHint: string, arrayLength: number): unknown[] {
  const items = schema['items'] as JSONSchema | undefined;
  if (!items) return [];

  const result: unknown[] = [];
  for (let i = 0; i < arrayLength; i++) {
    result.push(generate(items, pathHint, arrayLength));
  }
  return result;
}

function generateString(schema: JSONSchema, pathHint: string): string {
  const format = schema['format'] as string | undefined;
  if (format) {
    switch (format) {
      case 'date':
        return '2024-01-15';
      case 'date-time':
        return '2024-01-15T10:30:00Z';
      case 'email':
        return 'user@example.com';
      case 'uri':
      case 'url':
        return 'https://example.com';
      case 'uuid':
        return '550e8400-e29b-41d4-a716-446655440000';
    }
  }

  const minLength = schema['minLength'] as number | undefined;
  let value = `sample_${pathHint}`;
  if (minLength && value.length < minLength) {
    value = value.padEnd(minLength, '_');
  }
  return value;
}

function generateNumber(schema: JSONSchema, isInteger: boolean): number {
  const minimum = schema['minimum'] as number | undefined;
  const maximum = schema['maximum'] as number | undefined;
  const exclusiveMinimum = schema['exclusiveMinimum'] as number | undefined;
  const exclusiveMaximum = schema['exclusiveMaximum'] as number | undefined;

  const effectiveMin = minimum ?? (exclusiveMinimum != null ? exclusiveMinimum + 1 : undefined);
  const effectiveMax = maximum ?? (exclusiveMaximum != null ? exclusiveMaximum - 1 : undefined);

  let value: number;
  if (effectiveMin != null && effectiveMax != null) {
    value = (effectiveMin + effectiveMax) / 2;
  } else if (effectiveMin != null) {
    value = effectiveMin + 1;
  } else if (effectiveMax != null) {
    value = effectiveMax - 1;
  } else {
    value = 0;
  }

  return isInteger ? Math.round(value) : value;
}
