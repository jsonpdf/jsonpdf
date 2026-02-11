import { describe, it, expect } from 'vitest';
import type { JSONSchema } from '@jsonpdf/core';
import {
  listSchemaProperties,
  getSchemaAtPath,
  addSchemaProperty,
  updateSchemaProperty,
  removeSchemaProperty,
  renameSchemaProperty,
  toggleSchemaRequired,
  createDefaultPropertySchema,
} from '../src/schema-ops.js';

const baseSchema: JSONSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'integer' },
    address: {
      type: 'object',
      properties: {
        street: { type: 'string' },
        city: { type: 'string' },
      },
      required: ['street'],
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['name'],
};

describe('listSchemaProperties', () => {
  it('lists root properties', () => {
    const props = listSchemaProperties(baseSchema);
    expect(props).toHaveLength(4);
    expect(props.map((p) => p.name)).toEqual(['name', 'age', 'address', 'tags']);
  });

  it('returns correct type and required info', () => {
    const props = listSchemaProperties(baseSchema);
    const nameInfo = props.find((p) => p.name === 'name')!;
    expect(nameInfo.type).toBe('string');
    expect(nameInfo.required).toBe(true);
    expect(nameInfo.path).toBe('name');

    const ageInfo = props.find((p) => p.name === 'age')!;
    expect(ageInfo.required).toBe(false);
  });

  it('reports childCount for object properties', () => {
    const props = listSchemaProperties(baseSchema);
    const addrInfo = props.find((p) => p.name === 'address')!;
    expect(addrInfo.childCount).toBe(2);
  });

  it('reports childCount=1 for array properties with items', () => {
    const props = listSchemaProperties(baseSchema);
    const tagsInfo = props.find((p) => p.name === 'tags')!;
    expect(tagsInfo.childCount).toBe(1);
  });

  it('lists nested properties via parentPath', () => {
    const props = listSchemaProperties(baseSchema, 'address');
    expect(props).toHaveLength(2);
    expect(props.map((p) => p.name)).toEqual(['street', 'city']);
    expect(props[0].path).toBe('address.street');
    expect(props[0].required).toBe(true);
  });

  it('lists $items for array parent', () => {
    const props = listSchemaProperties(baseSchema, 'tags');
    expect(props).toHaveLength(1);
    expect(props[0].name).toBe('$items');
    expect(props[0].type).toBe('string');
    expect(props[0].path).toBe('tags.$items');
  });

  it('returns empty for non-existent path', () => {
    const props = listSchemaProperties(baseSchema, 'nonexistent');
    expect(props).toHaveLength(0);
  });

  it('lists properties of array items when items is an object', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        orders: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              product: { type: 'string' },
            },
          },
        },
      },
    };
    const itemsProps = listSchemaProperties(schema, 'orders');
    expect(itemsProps).toHaveLength(1);
    expect(itemsProps[0].name).toBe('$items');
    expect(itemsProps[0].childCount).toBe(2);

    const childProps = listSchemaProperties(schema, 'orders.$items');
    expect(childProps).toHaveLength(2);
    expect(childProps.map((p) => p.name)).toEqual(['id', 'product']);
  });
});

describe('getSchemaAtPath', () => {
  it('gets root-level property', () => {
    const result = getSchemaAtPath(baseSchema, 'name');
    expect(result).toEqual({ type: 'string' });
  });

  it('gets nested property', () => {
    const result = getSchemaAtPath(baseSchema, 'address.street');
    expect(result).toEqual({ type: 'string' });
  });

  it('gets $items path', () => {
    const result = getSchemaAtPath(baseSchema, 'tags.$items');
    expect(result).toEqual({ type: 'string' });
  });

  it('returns undefined for non-existent path', () => {
    const result = getSchemaAtPath(baseSchema, 'nonexistent');
    expect(result).toBeUndefined();
  });

  it('returns undefined for non-existent nested path', () => {
    const result = getSchemaAtPath(baseSchema, 'address.zip');
    expect(result).toBeUndefined();
  });
});

describe('addSchemaProperty', () => {
  it('adds root-level property', () => {
    const result = addSchemaProperty(baseSchema, '', 'email', { type: 'string', format: 'email' });
    const props = result['properties'] as Record<string, JSONSchema>;
    expect(props['email']).toEqual({ type: 'string', format: 'email' });
    // Original untouched
    expect((baseSchema['properties'] as Record<string, unknown>)['email']).toBeUndefined();
  });

  it('adds nested property', () => {
    const result = addSchemaProperty(baseSchema, 'address', 'zip', { type: 'string' });
    const addrProps = (result['properties'] as Record<string, JSONSchema>)['address'][
      'properties'
    ] as Record<string, JSONSchema>;
    expect(addrProps['zip']).toEqual({ type: 'string' });
  });

  it('throws on duplicate property name', () => {
    expect(() => addSchemaProperty(baseSchema, '', 'name', { type: 'string' })).toThrow(
      'already exists',
    );
  });

  it('adds property under $items path', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { type: 'object', properties: { id: { type: 'integer' } } },
        },
      },
    };
    const result = addSchemaProperty(schema, 'items.$items', 'label', { type: 'string' });
    const itemsSchema = getSchemaAtPath(result, 'items.$items')!;
    const itemProps = itemsSchema['properties'] as Record<string, JSONSchema>;
    expect(itemProps['label']).toEqual({ type: 'string' });
  });
});

describe('updateSchemaProperty', () => {
  it('replaces a property schema', () => {
    const result = updateSchemaProperty(baseSchema, 'name', {
      type: 'string',
      minLength: 1,
    });
    expect(getSchemaAtPath(result, 'name')).toEqual({ type: 'string', minLength: 1 });
  });

  it('replaces nested property schema', () => {
    const result = updateSchemaProperty(baseSchema, 'address.street', {
      type: 'string',
      maxLength: 200,
    });
    expect(getSchemaAtPath(result, 'address.street')).toEqual({
      type: 'string',
      maxLength: 200,
    });
  });

  it('replaces $items schema', () => {
    const result = updateSchemaProperty(baseSchema, 'tags.$items', { type: 'integer' });
    expect(getSchemaAtPath(result, 'tags.$items')).toEqual({ type: 'integer' });
  });

  it('throws for non-existent property', () => {
    expect(() => updateSchemaProperty(baseSchema, 'missing', { type: 'string' })).toThrow(
      'not found',
    );
  });
});

describe('removeSchemaProperty', () => {
  it('removes a root property', () => {
    const result = removeSchemaProperty(baseSchema, 'age');
    const props = result['properties'] as Record<string, JSONSchema>;
    expect('age' in props).toBe(false);
    expect(Object.keys(props)).toHaveLength(3);
  });

  it('removes from required when removing a required property', () => {
    const result = removeSchemaProperty(baseSchema, 'name');
    expect(result['required']).toBeUndefined();
  });

  it('removes nested property and cleans required', () => {
    const result = removeSchemaProperty(baseSchema, 'address.street');
    const addrSchema = getSchemaAtPath(result, 'address')!;
    const addrProps = addrSchema['properties'] as Record<string, JSONSchema>;
    expect('street' in addrProps).toBe(false);
    expect(addrSchema['required']).toBeUndefined();
  });

  it('throws for non-existent property', () => {
    expect(() => removeSchemaProperty(baseSchema, 'missing')).toThrow('not found');
  });
});

describe('renameSchemaProperty', () => {
  it('renames a root property', () => {
    const result = renameSchemaProperty(baseSchema, 'name', 'fullName');
    const props = result['properties'] as Record<string, JSONSchema>;
    expect('fullName' in props).toBe(true);
    expect('name' in props).toBe(false);
    expect(props['fullName']).toEqual({ type: 'string' });
  });

  it('updates required array on rename', () => {
    const result = renameSchemaProperty(baseSchema, 'name', 'fullName');
    expect(result['required']).toEqual(['fullName']);
  });

  it('preserves property order', () => {
    const result = renameSchemaProperty(baseSchema, 'age', 'yearsOld');
    const keys = Object.keys(result['properties'] as Record<string, unknown>);
    expect(keys).toEqual(['name', 'yearsOld', 'address', 'tags']);
  });

  it('throws when renaming to existing name', () => {
    expect(() => renameSchemaProperty(baseSchema, 'name', 'age')).toThrow('already exists');
  });

  it('throws when renaming $items', () => {
    expect(() => renameSchemaProperty(baseSchema, 'tags.$items', 'x')).toThrow(
      'Cannot rename $items',
    );
  });
});

describe('toggleSchemaRequired', () => {
  it('adds to required when not required', () => {
    const result = toggleSchemaRequired(baseSchema, 'age');
    expect(result['required']).toEqual(['name', 'age']);
  });

  it('removes from required when required', () => {
    const result = toggleSchemaRequired(baseSchema, 'name');
    expect(result['required']).toBeUndefined();
  });

  it('works for nested properties', () => {
    const result = toggleSchemaRequired(baseSchema, 'address.city');
    const addrSchema = getSchemaAtPath(result, 'address')!;
    expect(addrSchema['required']).toEqual(['street', 'city']);
  });

  it('throws for $items', () => {
    expect(() => toggleSchemaRequired(baseSchema, 'tags.$items')).toThrow(
      'Cannot toggle required on $items',
    );
  });
});

describe('createDefaultPropertySchema', () => {
  it('creates string schema', () => {
    expect(createDefaultPropertySchema('string')).toEqual({ type: 'string' });
  });

  it('creates number schema', () => {
    expect(createDefaultPropertySchema('number')).toEqual({ type: 'number' });
  });

  it('creates integer schema', () => {
    expect(createDefaultPropertySchema('integer')).toEqual({ type: 'integer' });
  });

  it('creates boolean schema', () => {
    expect(createDefaultPropertySchema('boolean')).toEqual({ type: 'boolean' });
  });

  it('creates object schema with empty properties', () => {
    expect(createDefaultPropertySchema('object')).toEqual({ type: 'object', properties: {} });
  });

  it('creates array schema with string items', () => {
    expect(createDefaultPropertySchema('array')).toEqual({
      type: 'array',
      items: { type: 'string' },
    });
  });
});

describe('property name validation', () => {
  it('rejects names containing dots on add', () => {
    expect(() => addSchemaProperty(baseSchema, '', 'a.b', { type: 'string' })).toThrow(
      'must not contain dots',
    );
  });

  it('rejects $items as a property name on add', () => {
    expect(() => addSchemaProperty(baseSchema, '', '$items', { type: 'string' })).toThrow(
      'reserved',
    );
  });

  it('rejects names containing dots on rename', () => {
    expect(() => renameSchemaProperty(baseSchema, 'name', 'a.b')).toThrow('must not contain dots');
  });

  it('rejects $items as a new name on rename', () => {
    expect(() => renameSchemaProperty(baseSchema, 'name', '$items')).toThrow('reserved');
  });
});

describe('addSchemaProperty sets type: object on untyped parent', () => {
  it('adds type: object to root {} schema when adding first property', () => {
    const empty: JSONSchema = {};
    const result = addSchemaProperty(empty, '', 'name', { type: 'string' });
    expect(result['type']).toBe('object');
    expect(result['properties']).toEqual({ name: { type: 'string' } });
  });

  it('does not overwrite existing type', () => {
    const result = addSchemaProperty(baseSchema, '', 'email', { type: 'string' });
    expect(result['type']).toBe('object');
  });
});

describe('immutability', () => {
  it('does not mutate original schema on add', () => {
    const original = structuredClone(baseSchema);
    addSchemaProperty(baseSchema, '', 'email', { type: 'string' });
    expect(baseSchema).toEqual(original);
  });

  it('does not mutate original schema on update', () => {
    const original = structuredClone(baseSchema);
    updateSchemaProperty(baseSchema, 'name', { type: 'string', minLength: 1 });
    expect(baseSchema).toEqual(original);
  });

  it('does not mutate original schema on remove', () => {
    const original = structuredClone(baseSchema);
    removeSchemaProperty(baseSchema, 'age');
    expect(baseSchema).toEqual(original);
  });

  it('does not mutate original schema on rename', () => {
    const original = structuredClone(baseSchema);
    renameSchemaProperty(baseSchema, 'name', 'fullName');
    expect(baseSchema).toEqual(original);
  });

  it('does not mutate original schema on toggleRequired', () => {
    const original = structuredClone(baseSchema);
    toggleSchemaRequired(baseSchema, 'age');
    expect(baseSchema).toEqual(original);
  });
});
