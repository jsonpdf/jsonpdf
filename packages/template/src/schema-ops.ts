import type { JSONSchema } from '@jsonpdf/core';

export type SchemaPropertyType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array';

export interface SchemaPropertyInfo {
  name: string;
  type: SchemaPropertyType | undefined;
  path: string;
  required: boolean;
  schema: JSONSchema;
  childCount: number;
}

/**
 * List the immediate child properties of a schema at the given parent path.
 * For array schemas, an `$items` child is included if the items sub-schema is
 * an object with properties.
 */
export function listSchemaProperties(
  schema: JSONSchema,
  parentPath?: string,
): SchemaPropertyInfo[] {
  const target = parentPath ? getSchemaAtPath(schema, parentPath) : schema;
  if (!target) return [];

  const type = target['type'] as string | undefined;
  const results: SchemaPropertyInfo[] = [];

  if (type === 'array') {
    const items = target['items'] as JSONSchema | undefined;
    if (items && typeof items === 'object') {
      const itemType = items['type'] as SchemaPropertyType | undefined;
      const childCount =
        itemType === 'object'
          ? Object.keys((items['properties'] as Record<string, unknown> | undefined) ?? {}).length
          : 0;
      const path = parentPath ? `${parentPath}.$items` : '$items';
      results.push({
        name: '$items',
        type: itemType,
        path,
        required: false,
        schema: items,
        childCount,
      });
    }
    return results;
  }

  const properties = target['properties'] as Record<string, JSONSchema> | undefined;
  if (!properties) return results;

  const requiredArr = (target['required'] as string[] | undefined) ?? [];

  for (const [name, propSchema] of Object.entries(properties)) {
    const propType = propSchema['type'] as SchemaPropertyType | undefined;
    let childCount = 0;
    if (propType === 'object') {
      childCount = Object.keys(
        (propSchema['properties'] as Record<string, unknown> | undefined) ?? {},
      ).length;
    } else if (propType === 'array') {
      const items = propSchema['items'] as JSONSchema | undefined;
      if (items && typeof items === 'object') {
        childCount = 1;
      }
    }

    const path = parentPath ? `${parentPath}.${name}` : name;
    results.push({
      name,
      type: propType,
      path,
      required: requiredArr.includes(name),
      schema: propSchema,
      childCount,
    });
  }

  return results;
}

/**
 * Resolve a dot-path to the sub-schema at that location.
 * Segments named `$items` navigate into `items`.
 */
export function getSchemaAtPath(schema: JSONSchema, path: string): JSONSchema | undefined {
  const segments = path.split('.');
  let current: JSONSchema = schema;

  for (const seg of segments) {
    if (seg === '$items') {
      const items = current['items'] as JSONSchema | undefined;
      if (!items || typeof items !== 'object') return undefined;
      current = items;
    } else {
      const properties = current['properties'] as Record<string, JSONSchema> | undefined;
      if (!properties || !(seg in properties)) return undefined;
      current = properties[seg];
    }
  }

  return current;
}

/**
 * Add a new property under the parent path.
 * If parentPath is empty string, adds to the root schema.
 */
export function addSchemaProperty(
  schema: JSONSchema,
  parentPath: string,
  name: string,
  propertySchema: JSONSchema,
): JSONSchema {
  validatePropertyName(name);
  return updateAtPath(schema, parentPath, (parent) => {
    const properties = (parent['properties'] as Record<string, JSONSchema> | undefined) ?? {};
    if (name in properties) {
      throw new Error(`Property "${name}" already exists at path "${parentPath}"`);
    }
    const result: JSONSchema = {
      ...parent,
      properties: { ...properties, [name]: propertySchema },
    };
    // Ensure parent has type: 'object' so generateSampleData works
    if (!result['type']) {
      result['type'] = 'object';
    }
    return result;
  });
}

/**
 * Replace the sub-schema at the given path with a new schema.
 */
export function updateSchemaProperty(
  schema: JSONSchema,
  path: string,
  newPropertySchema: JSONSchema,
): JSONSchema {
  const { parentPath, key } = splitPath(path);
  return updateAtPath(schema, parentPath, (parent) => {
    if (key === '$items') {
      return { ...parent, items: newPropertySchema };
    }
    const properties = parent['properties'] as Record<string, JSONSchema> | undefined;
    if (!properties || !(key in properties)) {
      throw new Error(`Property "${key}" not found at path "${parentPath}"`);
    }
    return {
      ...parent,
      properties: { ...properties, [key]: newPropertySchema },
    };
  });
}

/**
 * Remove a property from the schema.
 */
export function removeSchemaProperty(schema: JSONSchema, path: string): JSONSchema {
  const { parentPath, key } = splitPath(path);
  return updateAtPath(schema, parentPath, (parent) => {
    if (key === '$items') {
      const result = { ...parent };
      delete result['items'];
      return result;
    }
    const properties = parent['properties'] as Record<string, JSONSchema> | undefined;
    if (!properties || !(key in properties)) {
      throw new Error(`Property "${key}" not found at path "${parentPath}"`);
    }
    const remaining = Object.fromEntries(Object.entries(properties).filter(([k]) => k !== key));
    const result: JSONSchema = { ...parent, properties: remaining };
    // Also remove from required array
    const required = result['required'] as string[] | undefined;
    if (required) {
      const filtered = required.filter((r) => r !== key);
      if (filtered.length > 0) {
        result['required'] = filtered;
      } else {
        delete result['required'];
      }
    }
    return result;
  });
}

/**
 * Rename a property at the given path.
 */
export function renameSchemaProperty(
  schema: JSONSchema,
  path: string,
  newName: string,
): JSONSchema {
  const { parentPath, key } = splitPath(path);
  if (key === '$items') {
    throw new Error('Cannot rename $items');
  }
  validatePropertyName(newName);
  return updateAtPath(schema, parentPath, (parent) => {
    const properties = parent['properties'] as Record<string, JSONSchema> | undefined;
    if (!properties || !(key in properties)) {
      throw new Error(`Property "${key}" not found at path "${parentPath}"`);
    }
    if (newName in properties && newName !== key) {
      throw new Error(`Property "${newName}" already exists`);
    }
    // Rebuild properties in the same order, substituting the key
    const newProperties: Record<string, JSONSchema> = {};
    for (const [k, v] of Object.entries(properties)) {
      newProperties[k === key ? newName : k] = v;
    }
    const result: JSONSchema = { ...parent, properties: newProperties };
    // Update required array
    const required = result['required'] as string[] | undefined;
    if (required) {
      result['required'] = required.map((r) => (r === key ? newName : r));
    }
    return result;
  });
}

/**
 * Toggle whether a property is in the parent's `required` array.
 */
export function toggleSchemaRequired(schema: JSONSchema, path: string): JSONSchema {
  const { parentPath, key } = splitPath(path);
  if (key === '$items') {
    throw new Error('Cannot toggle required on $items');
  }
  return updateAtPath(schema, parentPath, (parent) => {
    const required = (parent['required'] as string[] | undefined) ?? [];
    const isRequired = required.includes(key);
    const newRequired = isRequired ? required.filter((r) => r !== key) : [...required, key];
    const result: JSONSchema = { ...parent };
    if (newRequired.length > 0) {
      result['required'] = newRequired;
    } else {
      delete result['required'];
    }
    return result;
  });
}

/**
 * Create a default property schema for a given type.
 */
export function createDefaultPropertySchema(type: SchemaPropertyType): JSONSchema {
  switch (type) {
    case 'string':
      return { type: 'string' };
    case 'number':
      return { type: 'number' };
    case 'integer':
      return { type: 'integer' };
    case 'boolean':
      return { type: 'boolean' };
    case 'object':
      return { type: 'object', properties: {} };
    case 'array':
      return { type: 'array', items: { type: 'string' } };
  }
}

// ---- Internal helpers ----

function validatePropertyName(name: string): void {
  if (name.includes('.')) {
    throw new Error(`Property name "${name}" must not contain dots`);
  }
  if (name === '$items') {
    throw new Error(`Property name "$items" is reserved`);
  }
}

function splitPath(path: string): { parentPath: string; key: string } {
  const lastDot = path.lastIndexOf('.');
  if (lastDot === -1) {
    return { parentPath: '', key: path };
  }
  return { parentPath: path.substring(0, lastDot), key: path.substring(lastDot + 1) };
}

function updateAtPath(
  schema: JSONSchema,
  path: string,
  updater: (target: JSONSchema) => JSONSchema,
): JSONSchema {
  if (path === '') {
    return updater(schema);
  }

  const segments = path.split('.');
  return applyUpdate(schema, segments, 0, updater);
}

function applyUpdate(
  current: JSONSchema,
  segments: string[],
  index: number,
  updater: (target: JSONSchema) => JSONSchema,
): JSONSchema {
  if (index >= segments.length) {
    return updater(current);
  }

  const seg = segments[index];

  if (seg === '$items') {
    const items = current['items'] as JSONSchema | undefined;
    if (!items || typeof items !== 'object') {
      throw new Error(`No items schema found at segment "$items"`);
    }
    return { ...current, items: applyUpdate(items, segments, index + 1, updater) };
  }

  const properties = current['properties'] as Record<string, JSONSchema> | undefined;
  if (!properties || !(seg in properties)) {
    throw new Error(`Property "${seg}" not found`);
  }

  return {
    ...current,
    properties: {
      ...properties,
      [seg]: applyUpdate(properties[seg], segments, index + 1, updater),
    },
  };
}
