import { Ajv2020 } from 'ajv/dist/2020.js';
import type { ErrorObject } from 'ajv/dist/2020.js';
import { templateSchema } from './schema.js';
import type { ValidationResult, JSONSchema } from './types.js';
import { buildPluginAwareTemplateSchema, type PluginSchemaEntry } from './expression-schema.js';

type ValidateFunction = ReturnType<Ajv2020['compile']>;

let cachedAjv: Ajv2020 | null = null;
let cachedValidate: ValidateFunction | null = null;

function getAjv(): Ajv2020 {
  if (!cachedAjv) {
    cachedAjv = new Ajv2020({ allErrors: true });
  }
  return cachedAjv;
}

function getTemplateValidator(): ValidateFunction {
  if (!cachedValidate) {
    cachedValidate = getAjv().compile(templateSchema);
  }
  return cachedValidate;
}

function mapErrors(errors: ErrorObject[] | null | undefined): ValidationResult['errors'] {
  return (errors ?? []).map((e) => ({
    path: e.instancePath || '/',
    message: e.message ?? 'Unknown validation error',
    keyword: e.keyword,
  }));
}

/** Validate data against the template JSON Schema. */
export function validateTemplateSchema(
  data: unknown,
  pluginSchemas?: readonly PluginSchemaEntry[],
): ValidationResult {
  if (pluginSchemas?.length) {
    const augmented = buildPluginAwareTemplateSchema(pluginSchemas);
    return validateWithSchema(augmented, data);
  }
  const validate = getTemplateValidator();
  const valid = validate(data);
  if (valid) {
    return { valid: true, errors: [] };
  }
  return { valid: false, errors: mapErrors(validate.errors) };
}

const schemaValidators = new WeakMap<object, ValidateFunction>();

/** Validate data against an arbitrary JSON Schema (draft 2020-12). */
export function validateWithSchema(schema: JSONSchema, data: unknown): ValidationResult {
  let validate = schemaValidators.get(schema);
  if (!validate) {
    const ajv = new Ajv2020({ allErrors: true });
    validate = ajv.compile(schema);
    schemaValidators.set(schema, validate);
  }
  const valid = validate(data);
  if (valid) {
    return { valid: true, errors: [] };
  }
  return { valid: false, errors: mapErrors(validate.errors) };
}
