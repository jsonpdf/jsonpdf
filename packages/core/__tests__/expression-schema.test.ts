import { describe, it, expect } from 'vitest';
import {
  makeExpressionAware,
  buildPluginAwareTemplateSchema,
  validateWithSchema,
} from '../src/index.js';
import type { JSONSchema, PluginSchemaEntry } from '../src/index.js';

describe('makeExpressionAware', () => {
  it('wraps scalar properties with anyOf including expression pattern', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        color: { type: 'string' },
        thickness: { type: 'number', exclusiveMinimum: 0 },
        visible: { type: 'boolean' },
      },
    };
    const result = makeExpressionAware(schema);

    // Each property should be wrapped in anyOf
    const props = result.properties as Record<string, JSONSchema>;
    expect(props.color).toEqual({
      anyOf: [{ type: 'string' }, { type: 'string', pattern: '\\{\\{|\\{%' }],
    });
    expect(props.thickness).toEqual({
      anyOf: [
        { type: 'number', exclusiveMinimum: 0 },
        { type: 'string', pattern: '\\{\\{|\\{%' },
      ],
    });
    expect(props.visible).toEqual({
      anyOf: [{ type: 'boolean' }, { type: 'string', pattern: '\\{\\{|\\{%' }],
    });
  });

  it('preserves required and additionalProperties', () => {
    const schema: JSONSchema = {
      type: 'object',
      required: ['content'],
      additionalProperties: false,
      properties: {
        content: { type: 'string' },
      },
    };
    const result = makeExpressionAware(schema);
    expect(result.required).toEqual(['content']);
    expect(result.additionalProperties).toBe(false);
    expect(result.type).toBe('object');
  });

  it('wraps existing oneOf in outer anyOf', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        content: {
          oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'object' } }],
        },
      },
    };
    const result = makeExpressionAware(schema);
    const content = (result.properties as Record<string, JSONSchema>).content;
    // Should be anyOf: [original-with-oneOf, expressionString]
    expect(content.anyOf).toHaveLength(2);
    const original = (content.anyOf as JSONSchema[])[0];
    expect(original.oneOf).toHaveLength(2);
  });

  it('wraps existing anyOf in outer anyOf', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        value: {
          anyOf: [{ type: 'number' }, { type: 'integer' }],
        },
      },
    };
    const result = makeExpressionAware(schema);
    const value = (result.properties as Record<string, JSONSchema>).value;
    // Should be anyOf: [original-with-anyOf, expressionString]
    expect(value.anyOf).toHaveLength(2);
    const original = (value.anyOf as JSONSchema[])[0];
    expect(original.anyOf).toHaveLength(2);
  });

  it('handles schema with no properties', () => {
    const schema: JSONSchema = { type: 'object' };
    const result = makeExpressionAware(schema);
    expect(result.type).toBe('object');
    expect(result.properties).toBeUndefined();
  });

  it('expression strings pass validation for wrapped properties', () => {
    const schema: JSONSchema = {
      type: 'object',
      required: ['src'],
      properties: {
        src: { type: 'string', pattern: '^data:' },
      },
    };
    const aware = makeExpressionAware(schema);
    const expressionResult = validateWithSchema(aware, { src: '{{ data.imageSrc }}' });
    expect(expressionResult.valid).toBe(true);
  });

  it('concrete invalid values still fail validation', () => {
    const schema: JSONSchema = {
      type: 'object',
      required: ['src'],
      properties: {
        src: { type: 'string', pattern: '^data:' },
      },
    };
    const aware = makeExpressionAware(schema);
    const result = validateWithSchema(aware, { src: 'http://example.com/image.png' });
    expect(result.valid).toBe(false);
  });

  it('concrete valid values pass validation', () => {
    const schema: JSONSchema = {
      type: 'object',
      required: ['src'],
      properties: {
        src: { type: 'string', pattern: '^data:' },
      },
    };
    const aware = makeExpressionAware(schema);
    const result = validateWithSchema(aware, { src: 'data:image/png;base64,abc' });
    expect(result.valid).toBe(true);
  });
});

describe('buildPluginAwareTemplateSchema', () => {
  const textPlugin: PluginSchemaEntry = {
    type: 'text',
    propsSchema: {
      type: 'object',
      required: ['content'],
      properties: {
        content: {
          oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'object' } }],
        },
        autoHeight: { type: 'boolean' },
      },
    },
  };

  const shapePlugin: PluginSchemaEntry = {
    type: 'shape',
    propsSchema: {
      type: 'object',
      required: ['shapeType'],
      properties: {
        shapeType: { type: 'string', enum: ['rect', 'circle', 'ellipse'] },
        fill: { type: 'string' },
      },
    },
  };

  const plugins = [textPlugin, shapePlugin] as const;

  function makeTemplate(elementType: string, properties: Record<string, unknown>) {
    return {
      version: '1.0',
      name: 'Test',
      page: {
        width: 612,
        height: 792,
        margins: { top: 36, right: 36, bottom: 36, left: 36 },
      },
      dataSchema: {},
      styles: {},
      fonts: [],
      sections: [
        {
          id: 'sec1',
          bands: [
            {
              id: 'band1',
              type: 'body',
              height: 100,
              elements: [
                {
                  id: 'el1',
                  type: elementType,
                  x: 0,
                  y: 0,
                  width: 200,
                  height: 20,
                  properties,
                },
              ],
            },
          ],
        },
      ],
    };
  }

  it('validates correct properties for text element', () => {
    const schema = buildPluginAwareTemplateSchema(plugins);
    const template = makeTemplate('text', { content: 'Hello' });
    const result = validateWithSchema(schema, template);
    expect(result.valid).toBe(true);
  });

  it('rejects text element missing required content', () => {
    const schema = buildPluginAwareTemplateSchema(plugins);
    const template = makeTemplate('text', {});
    const result = validateWithSchema(schema, template);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.keyword === 'required')).toBe(true);
  });

  it('validates correct properties for shape element', () => {
    const schema = buildPluginAwareTemplateSchema(plugins);
    const template = makeTemplate('shape', { shapeType: 'rect', fill: '#ff0000' });
    const result = validateWithSchema(schema, template);
    expect(result.valid).toBe(true);
  });

  it('rejects shape element with invalid shapeType', () => {
    const schema = buildPluginAwareTemplateSchema(plugins);
    const template = makeTemplate('shape', { shapeType: 'triangle' });
    const result = validateWithSchema(schema, template);
    expect(result.valid).toBe(false);
  });

  it('rejects shape element missing required shapeType', () => {
    const schema = buildPluginAwareTemplateSchema(plugins);
    const template = makeTemplate('shape', { fill: '#ff0000' });
    const result = validateWithSchema(schema, template);
    expect(result.valid).toBe(false);
  });

  it('unknown element types still pass (no if/then match)', () => {
    const schema = buildPluginAwareTemplateSchema(plugins);
    const template = makeTemplate('custom-widget', { anything: 'goes' });
    const result = validateWithSchema(schema, template);
    expect(result.valid).toBe(true);
  });

  it('accepts Liquid expressions for constrained properties', () => {
    const schema = buildPluginAwareTemplateSchema(plugins);
    const template = makeTemplate('shape', {
      shapeType: '{{ data.shape }}',
      fill: '{{ data.color }}',
    });
    const result = validateWithSchema(schema, template);
    expect(result.valid).toBe(true);
  });

  it('caches the schema for the same plugin array', () => {
    const first = buildPluginAwareTemplateSchema(plugins);
    const second = buildPluginAwareTemplateSchema(plugins);
    expect(first).toBe(second);
  });

  it('returns different schema for different plugin arrays', () => {
    const a = buildPluginAwareTemplateSchema([textPlugin]);
    const b = buildPluginAwareTemplateSchema([shapePlugin]);
    expect(a).not.toBe(b);
  });
});
