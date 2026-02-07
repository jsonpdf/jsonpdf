import { describe, it, expect } from 'vitest';
import { validateWithSchema } from '../src/validation.js';

describe('validateWithSchema', () => {
  it('validates data against a simple schema', () => {
    const schema = {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' } },
    };
    expect(validateWithSchema(schema, { name: 'test' }).valid).toBe(true);
    expect(validateWithSchema(schema, {}).valid).toBe(false);
    expect(validateWithSchema(schema, { name: 123 }).valid).toBe(false);
  });

  it('returns error paths', () => {
    const schema = {
      type: 'object',
      properties: { age: { type: 'number', minimum: 0 } },
    };
    const result = validateWithSchema(schema, { age: -1 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]!.path).toBe('/age');
  });

  it('reports all errors with allErrors mode', () => {
    const schema = {
      type: 'object',
      required: ['a', 'b', 'c'],
      properties: {
        a: { type: 'string' },
        b: { type: 'string' },
        c: { type: 'string' },
      },
    };
    const result = validateWithSchema(schema, {});
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('caching: validates with same schema twice successfully', () => {
    const schema = {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' } },
    };
    // First call
    const result1 = validateWithSchema(schema, { name: 'test' });
    expect(result1.valid).toBe(true);
    // Second call with same schema should also work
    const result2 = validateWithSchema(schema, { name: 'another' });
    expect(result2.valid).toBe(true);
  });

  it('caching: validates with different schemas', () => {
    const schema1 = {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' } },
    };
    const schema2 = {
      type: 'object',
      required: ['age'],
      properties: { age: { type: 'number' } },
    };
    // Validate with first schema
    const result1 = validateWithSchema(schema1, { name: 'test' });
    expect(result1.valid).toBe(true);
    // Validate with different schema
    const result2 = validateWithSchema(schema2, { age: 25 });
    expect(result2.valid).toBe(true);
    // Original schema should still work
    const result3 = validateWithSchema(schema1, { name: 'again' });
    expect(result3.valid).toBe(true);
  });
});
