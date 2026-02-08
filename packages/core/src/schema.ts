import type { JSONSchema } from './types.js';

const bandTypes = [
  'title',
  'pageHeader',
  'pageFooter',
  'lastPageFooter',
  'columnHeader',
  'detail',
  'columnFooter',
  'summary',
  'body',
  'background',
  'noData',
  'groupHeader',
  'groupFooter',
] as const;

const fontWeightValues = ['normal', 'bold'] as const;
const fontStyleValues = ['normal', 'italic'] as const;
const textDecorationValues = [
  'none',
  'underline',
  'line-through',
  'underline line-through',
] as const;
const textAlignValues = ['left', 'center', 'right', 'justify'] as const;
const orientationValues = ['portrait', 'landscape'] as const;
const columnModeValues = ['tile', 'flow'] as const;

/** JSON Schema (draft 2020-12) that validates Template objects. */
export const templateSchema: JSONSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  required: ['version', 'name', 'page', 'dataSchema', 'styles', 'fonts', 'sections'],
  additionalProperties: false,
  properties: {
    version: { const: '1.0' },
    name: { type: 'string', minLength: 1 },
    description: { type: 'string' },
    author: { type: 'string' },
    license: { type: 'string' },
    page: { $ref: '#/$defs/PageConfig' },
    dataSchema: { type: 'object' },
    styles: {
      type: 'object',
      additionalProperties: { $ref: '#/$defs/Style' },
    },
    fonts: {
      type: 'array',
      items: { $ref: '#/$defs/FontDeclaration' },
    },
    sections: {
      type: 'array',
      minItems: 1,
      items: { $ref: '#/$defs/Section' },
    },
  },
  $defs: {
    PageConfig: {
      type: 'object',
      required: ['width', 'height', 'margins'],
      additionalProperties: false,
      properties: {
        width: { type: 'number', exclusiveMinimum: 0 },
        height: { type: 'number', exclusiveMinimum: 0 },
        autoHeight: { type: 'boolean' },
        orientation: { type: 'string', enum: [...orientationValues] },
        margins: { $ref: '#/$defs/Margins' },
      },
    },
    Margins: {
      type: 'object',
      required: ['top', 'right', 'bottom', 'left'],
      additionalProperties: false,
      properties: {
        top: { type: 'number', minimum: 0 },
        right: { type: 'number', minimum: 0 },
        bottom: { type: 'number', minimum: 0 },
        left: { type: 'number', minimum: 0 },
      },
    },
    PartialPageConfig: {
      type: 'object',
      additionalProperties: false,
      properties: {
        width: { type: 'number', exclusiveMinimum: 0 },
        height: { type: 'number', exclusiveMinimum: 0 },
        autoHeight: { type: 'boolean' },
        orientation: { type: 'string', enum: [...orientationValues] },
        margins: { $ref: '#/$defs/Margins' },
      },
    },
    Section: {
      type: 'object',
      required: ['id', 'bands'],
      additionalProperties: false,
      properties: {
        id: { type: 'string', minLength: 1 },
        name: { type: 'string' },
        page: { $ref: '#/$defs/PartialPageConfig' },
        columns: { type: 'integer', minimum: 1 },
        columnWidths: { type: 'array', items: { type: 'number', exclusiveMinimum: 0 } },
        columnGap: { type: 'number', minimum: 0 },
        columnMode: { type: 'string', enum: [...columnModeValues] },
        bookmark: { type: 'string' },
        bands: { type: 'array', items: { $ref: '#/$defs/Band' } },
      },
    },
    Band: {
      type: 'object',
      required: ['id', 'type', 'height', 'elements'],
      additionalProperties: false,
      properties: {
        id: { type: 'string', minLength: 1 },
        type: { type: 'string', enum: [...bandTypes] },
        height: { type: 'number', minimum: 0 },
        autoHeight: { type: 'boolean' },
        condition: { type: 'string' },
        dataSource: { type: 'string' },
        itemName: { type: 'string' },
        groupBy: { type: 'string' },
        float: { type: 'boolean' },
        pageBreakBefore: { type: 'boolean' },
        bookmark: { type: 'string' },
        anchor: { type: 'string' },
        backgroundColor: {
          oneOf: [{ type: 'string' }, { $ref: '#/$defs/Gradient' }],
        },
        elements: { type: 'array', items: { $ref: '#/$defs/Element' } },
      },
    },
    Element: {
      type: 'object',
      required: ['id', 'type', 'x', 'y', 'width', 'height', 'properties'],
      additionalProperties: false,
      properties: {
        id: { type: 'string', minLength: 1 },
        type: { type: 'string', minLength: 1 },
        x: { type: 'number' },
        y: { type: 'number' },
        width: { type: 'number', minimum: 0 },
        height: { type: 'number', minimum: 0 },
        rotation: { type: 'number' },
        anchor: { type: 'string' },
        style: { type: 'string' },
        styleOverrides: { $ref: '#/$defs/Style' },
        condition: { type: 'string' },
        conditionalStyles: {
          type: 'array',
          items: { $ref: '#/$defs/ConditionalStyle' },
        },
        properties: { type: 'object' },
        elements: { type: 'array', items: { $ref: '#/$defs/Element' } },
      },
    },
    ConditionalStyle: {
      type: 'object',
      required: ['condition'],
      additionalProperties: false,
      properties: {
        condition: { type: 'string' },
        style: { type: 'string' },
        styleOverrides: { $ref: '#/$defs/Style' },
      },
    },
    RichContent: {
      oneOf: [{ type: 'string' }, { type: 'array', items: { $ref: '#/$defs/StyledRun' } }],
    },
    StyledRun: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' },
        style: { type: 'string' },
        styleOverrides: { $ref: '#/$defs/Style' },
        link: { type: 'string' },
        footnote: { $ref: '#/$defs/RichContent' },
      },
    },
    Style: {
      type: 'object',
      additionalProperties: false,
      properties: {
        fontFamily: { type: 'string' },
        fontSize: { type: 'number', exclusiveMinimum: 0 },
        fontWeight: { type: 'string', enum: [...fontWeightValues] },
        fontStyle: { type: 'string', enum: [...fontStyleValues] },
        textDecoration: { type: 'string', enum: [...textDecorationValues] },
        color: { type: 'string' },
        backgroundColor: {
          oneOf: [{ type: 'string' }, { $ref: '#/$defs/Gradient' }],
        },
        textAlign: { type: 'string', enum: [...textAlignValues] },
        lineHeight: { type: 'number', exclusiveMinimum: 0 },
        letterSpacing: { type: 'number' },
        borderWidth: { type: 'number', minimum: 0 },
        borderColor: { type: 'string' },
        borderTop: { $ref: '#/$defs/BorderSide' },
        borderRight: { $ref: '#/$defs/BorderSide' },
        borderBottom: { $ref: '#/$defs/BorderSide' },
        borderLeft: { $ref: '#/$defs/BorderSide' },
        borderRadius: { type: 'number', minimum: 0 },
        padding: { $ref: '#/$defs/Padding' },
        opacity: { type: 'number', minimum: 0, maximum: 1 },
        widows: { type: 'integer', minimum: 1 },
        orphans: { type: 'integer', minimum: 1 },
      },
    },
    BorderSide: {
      type: 'object',
      required: ['width'],
      additionalProperties: false,
      properties: {
        width: { type: 'number', minimum: 0 },
        color: { type: 'string' },
      },
    },
    Padding: {
      oneOf: [
        { type: 'number', minimum: 0 },
        {
          type: 'object',
          required: ['top', 'right', 'bottom', 'left'],
          additionalProperties: false,
          properties: {
            top: { type: 'number', minimum: 0 },
            right: { type: 'number', minimum: 0 },
            bottom: { type: 'number', minimum: 0 },
            left: { type: 'number', minimum: 0 },
          },
        },
      ],
    },
    GradientStop: {
      type: 'object',
      required: ['color', 'position'],
      additionalProperties: false,
      properties: {
        color: { type: 'string' },
        position: { type: 'number', minimum: 0, maximum: 1 },
      },
    },
    Gradient: {
      oneOf: [
        {
          type: 'object',
          required: ['type', 'angle', 'stops'],
          additionalProperties: false,
          properties: {
            type: { const: 'linear' },
            angle: { type: 'number' },
            stops: { type: 'array', minItems: 2, items: { $ref: '#/$defs/GradientStop' } },
          },
        },
        {
          type: 'object',
          required: ['type', 'stops'],
          additionalProperties: false,
          properties: {
            type: { const: 'radial' },
            cx: { type: 'number', minimum: 0, maximum: 1 },
            cy: { type: 'number', minimum: 0, maximum: 1 },
            radius: { type: 'number', minimum: 0, maximum: 1 },
            stops: { type: 'array', minItems: 2, items: { $ref: '#/$defs/GradientStop' } },
          },
        },
      ],
    },
    FontDeclaration: {
      type: 'object',
      required: ['family', 'src'],
      additionalProperties: false,
      properties: {
        family: { type: 'string', minLength: 1 },
        weight: { type: 'number' },
        style: { type: 'string', enum: [...fontStyleValues] },
        src: { type: 'string', minLength: 1 },
      },
    },
  },
};
