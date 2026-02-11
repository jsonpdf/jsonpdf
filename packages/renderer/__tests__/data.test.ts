import { describe, it, expect } from 'vitest';
import { validateData, applySchemaDefaults, resolveDotPath, buildScope } from '../src/data.js';

describe('validateData', () => {
  it('passes for valid data against schema', () => {
    const schema = {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    };
    expect(() => validateData({ name: 'Test' }, schema)).not.toThrow();
  });

  it('throws for invalid data', () => {
    const schema = {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    };
    expect(() => validateData({}, schema)).toThrow('Data validation failed');
  });

  it('skips validation for empty schema', () => {
    expect(() => validateData({ anything: true }, {})).not.toThrow();
  });

  it('skips validation for bare { type: "object" } schema', () => {
    expect(() => validateData({ anything: true }, { type: 'object' })).not.toThrow();
  });

  it('validates nested properties', () => {
    const schema = {
      type: 'object',
      properties: {
        invoice: {
          type: 'object',
          properties: { total: { type: 'number' } },
          required: ['total'],
        },
      },
      required: ['invoice'],
    };
    expect(() => validateData({ invoice: { total: 100 } }, schema)).not.toThrow();
    expect(() => validateData({ invoice: {} }, schema)).toThrow('Data validation failed');
  });
});

describe('applySchemaDefaults', () => {
  it('fills in missing properties with default values', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        status: { type: 'string', default: 'active' },
      },
    };
    const result = applySchemaDefaults({ name: 'Test' }, schema);
    expect(result.name).toBe('Test');
    expect(result.status).toBe('active');
  });

  it('does not override provided values', () => {
    const schema = {
      type: 'object',
      properties: {
        status: { type: 'string', default: 'active' },
      },
    };
    const result = applySchemaDefaults({ status: 'inactive' }, schema);
    expect(result.status).toBe('inactive');
  });

  it('fills nested object defaults', () => {
    const schema = {
      type: 'object',
      properties: {
        config: {
          type: 'object',
          properties: {
            color: { type: 'string', default: 'blue' },
          },
          default: {},
        },
      },
    };
    const result = applySchemaDefaults({}, schema);
    expect(result.config).toEqual({ color: 'blue' });
  });

  it('does not mutate the original data', () => {
    const schema = {
      type: 'object',
      properties: {
        status: { type: 'string', default: 'active' },
      },
    };
    const original = { name: 'Test' };
    applySchemaDefaults(original, schema);
    expect(original).toEqual({ name: 'Test' });
  });

  it('returns data unchanged for empty schema', () => {
    const data = { foo: 'bar' };
    expect(applySchemaDefaults(data, {})).toEqual(data);
  });

  it('returns data unchanged for bare { type: "object" } schema', () => {
    const data = { foo: 'bar' };
    expect(applySchemaDefaults(data, { type: 'object' })).toEqual(data);
  });
});

describe('resolveDotPath', () => {
  it('resolves a shallow path', () => {
    expect(resolveDotPath({ name: 'Alice' }, 'name')).toBe('Alice');
  });

  it('resolves a deep path', () => {
    expect(resolveDotPath({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42);
  });

  it('returns undefined for missing path', () => {
    expect(resolveDotPath({ a: 1 }, 'b')).toBeUndefined();
  });

  it('returns undefined for empty path', () => {
    expect(resolveDotPath({ a: 1 }, '')).toBeUndefined();
  });

  it('returns undefined when traversing through null', () => {
    expect(resolveDotPath({ a: null }, 'a.b')).toBeUndefined();
  });

  it('resolves array by index', () => {
    expect(resolveDotPath({ items: ['a', 'b', 'c'] }, 'items.1')).toBe('b');
  });

  it('returns arrays as-is', () => {
    const items = [{ name: 'A' }, { name: 'B' }];
    expect(resolveDotPath({ items }, 'items')).toEqual(items);
  });
});

describe('buildScope', () => {
  it('includes data properties', () => {
    const scope = buildScope({ name: 'Test', count: 5 }, 1, 3);
    expect(scope['name']).toBe('Test');
    expect(scope['count']).toBe(5);
  });

  it('includes _pageNumber and _totalPages', () => {
    const scope = buildScope({}, 2, 10);
    expect(scope['_pageNumber']).toBe(2);
    expect(scope['_totalPages']).toBe(10);
  });

  it('includes item context when provided', () => {
    const item = { name: 'Widget', price: 9.99 };
    const scope = buildScope({}, 1, 1, { item, itemName: 'product', index: 3 });
    expect(scope['product']).toBe(item);
    expect(scope['_index']).toBe(3);
  });

  it('does not include item context when not provided', () => {
    const scope = buildScope({}, 1, 1);
    expect(scope['_index']).toBeUndefined();
  });

  it('page variables override data properties with same name', () => {
    const scope = buildScope({ _pageNumber: 99 }, 1, 5);
    // Built-in variables take precedence
    expect(scope['_pageNumber']).toBe(1);
  });
});
