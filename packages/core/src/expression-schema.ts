import type { JSONSchema } from './types.js';
import { templateSchema } from './schema.js';

/** Pattern that matches Liquid expression strings: {{ ... }} or {% ... %}. */
const EXPRESSION_PATTERN = '\\{\\{|\\{%';

/** A schema alternative that accepts Liquid expression strings. */
const expressionString: JSONSchema = { type: 'string', pattern: EXPRESSION_PATTERN };

/**
 * Wrap a single property schema so it also accepts a Liquid expression string.
 * Always wraps in `anyOf: [original, expressionString]`. This avoids issues with
 * `oneOf` semantics where an expression string could match both the original
 * string branch and the expression pattern branch.
 */
function wrapProperty(schema: JSONSchema): JSONSchema {
  // If schema already has the expression pattern, skip wrapping
  if (schema.pattern === EXPRESSION_PATTERN) {
    return schema;
  }

  return { anyOf: [schema, expressionString] };
}

/**
 * Return a copy of a plugin `propsSchema` where each property also accepts
 * Liquid expression strings (`{{ ... }}` or `{% ... %}`).
 *
 * Schema-level keywords like `required`, `additionalProperties`, and `type`
 * are preserved. Only entries in `properties` are wrapped.
 */
export function makeExpressionAware(schema: JSONSchema): JSONSchema {
  const result = { ...schema };

  if (schema.properties && typeof schema.properties === 'object') {
    const wrappedProps: Record<string, JSONSchema> = {};
    for (const [key, value] of Object.entries(schema.properties as Record<string, JSONSchema>)) {
      wrappedProps[key] = wrapProperty(value);
    }
    result.properties = wrappedProps;
  }

  return result;
}

/** Plugin schema descriptor used to build the augmented template schema. */
export interface PluginSchemaEntry {
  type: string;
  propsSchema: JSONSchema;
}

/**
 * Cache: one augmented schema per unique plugin set (by reference identity of the array).
 * Uses WeakMap so garbage collection works when the array is discarded.
 * The `validateWithSchema` function also caches compiled validators by schema object identity,
 * so returning the same schema object avoids re-compilation.
 */
const augmentedSchemaCache = new WeakMap<readonly PluginSchemaEntry[], JSONSchema>();

/**
 * Deep-clone the base template schema and add `if`/`then` branches
 * (keyed on `element.type`) so that each element's `properties` are
 * validated against the corresponding plugin's `propsSchema` (expression-aware).
 *
 * The result is cached per plugin array reference for `validateWithSchema` WeakMap reuse.
 */
export function buildPluginAwareTemplateSchema(plugins: readonly PluginSchemaEntry[]): JSONSchema {
  const cached = augmentedSchemaCache.get(plugins);
  if (cached) return cached;

  // Deep-clone the base schema
  const schema = JSON.parse(JSON.stringify(templateSchema)) as JSONSchema;

  const defs = schema.$defs as Record<string, JSONSchema> | undefined;
  if (!defs?.Element) {
    return schema; // Defensive — should never happen
  }

  // Build if/then branches for each plugin
  const branches: JSONSchema[] = plugins.map((plugin) => ({
    if: {
      properties: { type: { const: plugin.type } },
      required: ['type'],
    },
    then: {
      properties: { properties: makeExpressionAware(plugin.propsSchema) },
    },
  }));

  // Attach branches via allOf on the Element $def
  const elementDef = defs.Element;
  const existingAllOf = Array.isArray(elementDef.allOf) ? (elementDef.allOf as JSONSchema[]) : [];
  elementDef.allOf = [...existingAllOf, ...branches];

  augmentedSchemaCache.set(plugins, schema);
  return schema;
}
