import { describe, it, expect } from 'vitest';
import { generateSampleData, buildDefaultData } from '../src/sample-data.js';

describe('generateSampleData', () => {
  it('generates an empty object from empty schema', () => {
    expect(generateSampleData({ type: 'object', properties: {} })).toEqual({});
  });

  it('generates an empty object from schema with no type', () => {
    expect(generateSampleData({})).toBeNull();
  });

  it('generates string properties', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    };
    const result = generateSampleData(schema) as Record<string, unknown>;
    expect(result.name).toBe('sample_name');
  });

  it('generates number and integer properties', () => {
    const schema = {
      type: 'object',
      properties: {
        price: { type: 'number' },
        count: { type: 'integer' },
      },
    };
    const result = generateSampleData(schema) as Record<string, unknown>;
    expect(result.price).toBe(0);
    expect(result.count).toBe(0);
  });

  it('generates boolean properties', () => {
    const schema = {
      type: 'object',
      properties: {
        active: { type: 'boolean' },
      },
    };
    const result = generateSampleData(schema) as Record<string, unknown>;
    expect(result.active).toBe(true);
  });

  it('picks first enum value', () => {
    const schema = {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'inactive', 'pending'] },
      },
    };
    const result = generateSampleData(schema) as Record<string, unknown>;
    expect(result.status).toBe('active');
  });

  it('respects number constraints', () => {
    const schema = {
      type: 'object',
      properties: {
        age: { type: 'integer', minimum: 18, maximum: 100 },
        score: { type: 'number', exclusiveMinimum: 0 },
      },
    };
    const result = generateSampleData(schema) as Record<string, unknown>;
    expect(result.age).toBe(59); // (18+100)/2 rounded
    expect(result.score).toBe(2); // exclusiveMinimum+1 then +1
  });

  it('generates format-aware strings', () => {
    const schema = {
      type: 'object',
      properties: {
        birthday: { type: 'string', format: 'date' },
        created: { type: 'string', format: 'date-time' },
        email: { type: 'string', format: 'email' },
        website: { type: 'string', format: 'uri' },
      },
    };
    const result = generateSampleData(schema) as Record<string, unknown>;
    expect(result.birthday).toBe('2024-01-15');
    expect(result.created).toBe('2024-01-15T10:30:00Z');
    expect(result.email).toBe('user@example.com');
    expect(result.website).toBe('https://example.com');
  });

  it('generates arrays with configurable length', () => {
    const schema = {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    };
    const result3 = generateSampleData(schema) as Record<string, unknown>;
    expect(result3.items).toEqual(['sample_items', 'sample_items', 'sample_items']);

    const result1 = generateSampleData(schema, { arrayLength: 1 }) as Record<string, unknown>;
    expect(result1.items).toEqual(['sample_items']);
  });

  it('generates nested objects', () => {
    const schema = {
      type: 'object',
      properties: {
        address: {
          type: 'object',
          properties: {
            street: { type: 'string' },
            zip: { type: 'string' },
          },
        },
      },
    };
    const result = generateSampleData(schema) as Record<string, unknown>;
    expect(result.address).toEqual({
      street: 'sample_street',
      zip: 'sample_zip',
    });
  });

  it('generates arrays of objects', () => {
    const schema = {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              price: { type: 'number', minimum: 0 },
            },
          },
        },
      },
    };
    const result = generateSampleData(schema, { arrayLength: 2 }) as Record<string, unknown>;
    expect(result.items).toEqual([
      { name: 'sample_name', price: 1 },
      { name: 'sample_name', price: 1 },
    ]);
  });

  it('uses default value when present', () => {
    const schema = {
      type: 'object',
      properties: {
        status: { type: 'string', default: 'pending' },
        count: { type: 'integer', default: 42 },
        active: { type: 'boolean', default: false },
      },
    };
    const result = generateSampleData(schema) as Record<string, unknown>;
    expect(result.status).toBe('pending');
    expect(result.count).toBe(42);
    expect(result.active).toBe(false);
  });

  it('prefers const over default', () => {
    const schema = { const: 'fixed', default: 'fallback' };
    expect(generateSampleData(schema)).toBe('fixed');
  });

  it('prefers enum over default', () => {
    const schema = { type: 'string', enum: ['a', 'b'], default: 'c' };
    expect(generateSampleData(schema)).toBe('a');
  });

  it('prefers default over oneOf', () => {
    const schema = {
      default: 'my-default',
      oneOf: [{ type: 'string' }, { type: 'number' }],
    };
    expect(generateSampleData(schema)).toBe('my-default');
  });

  it('handles const values', () => {
    const schema = {
      type: 'object',
      properties: {
        version: { const: '1.0' },
      },
    };
    const result = generateSampleData(schema) as Record<string, unknown>;
    expect(result.version).toBe('1.0');
  });

  it('picks first oneOf option', () => {
    const schema = {
      oneOf: [{ type: 'string' }, { type: 'number' }],
    };
    expect(generateSampleData(schema)).toBe('sample_value');
  });

  it('respects string minLength', () => {
    const schema = {
      type: 'object',
      properties: {
        code: { type: 'string', minLength: 20 },
      },
    };
    const result = generateSampleData(schema) as Record<string, unknown>;
    expect((result.code as string).length).toBeGreaterThanOrEqual(20);
  });

  it('returns empty array for array without items schema', () => {
    const schema = { type: 'array' };
    expect(generateSampleData(schema)).toEqual([]);
  });

  it('generates invoice-like data', () => {
    const schema = {
      type: 'object',
      properties: {
        invoiceNumber: { type: 'string' },
        date: { type: 'string', format: 'date' },
        customer: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
          },
        },
        lineItems: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              quantity: { type: 'integer', minimum: 1 },
              unitPrice: { type: 'number', minimum: 0 },
            },
          },
        },
        total: { type: 'number', minimum: 0 },
      },
    };
    const result = generateSampleData(schema, { arrayLength: 2 }) as Record<string, unknown>;
    expect(result).toEqual({
      invoiceNumber: 'sample_invoiceNumber',
      date: '2024-01-15',
      customer: {
        name: 'sample_name',
        email: 'user@example.com',
      },
      lineItems: [
        { description: 'sample_description', quantity: 2, unitPrice: 1 },
        { description: 'sample_description', quantity: 2, unitPrice: 1 },
      ],
      total: 1,
    });
  });
});

describe('buildDefaultData', () => {
  it('returns null for scalar types without defaults', () => {
    expect(buildDefaultData({ type: 'string' })).toBeNull();
    expect(buildDefaultData({ type: 'number' })).toBeNull();
    expect(buildDefaultData({ type: 'boolean' })).toBeNull();
  });

  it('uses default value when present', () => {
    expect(buildDefaultData({ type: 'string', default: 'hello' })).toBe('hello');
    expect(buildDefaultData({ type: 'number', default: 42 })).toBe(42);
    expect(buildDefaultData({ type: 'boolean', default: false })).toBe(false);
  });

  it('uses const value', () => {
    expect(buildDefaultData({ const: 'fixed' })).toBe('fixed');
  });

  it('uses first enum value', () => {
    expect(buildDefaultData({ type: 'string', enum: ['a', 'b'] })).toBe('a');
  });

  it('builds object with null for properties without defaults', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'integer' },
      },
    };
    expect(buildDefaultData(schema)).toEqual({ name: null, age: null });
  });

  it('builds object mixing defaults and nulls', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        status: { type: 'string', default: 'active' },
        count: { type: 'integer', default: 0 },
      },
    };
    expect(buildDefaultData(schema)).toEqual({
      name: null,
      status: 'active',
      count: 0,
    });
  });

  it('builds nested objects', () => {
    const schema = {
      type: 'object',
      properties: {
        address: {
          type: 'object',
          properties: {
            city: { type: 'string', default: 'New York' },
            zip: { type: 'string' },
          },
        },
      },
    };
    expect(buildDefaultData(schema)).toEqual({
      address: { city: 'New York', zip: null },
    });
  });

  it('returns empty array for array types', () => {
    const schema = {
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' } },
      },
    };
    expect(buildDefaultData(schema)).toEqual({ tags: [] });
  });

  it('returns empty object for object without properties', () => {
    expect(buildDefaultData({ type: 'object' })).toEqual({});
  });
});
