import { describe, it, expect } from 'vitest';
import { validateTemplateSchema } from '../src/validation.js';
import type { Template } from '../src/types.js';

function validTemplate(): Template {
  return {
    version: '1.0',
    name: 'Test Template',
    page: {
      width: 612,
      height: 792,
      margins: { top: 40, right: 40, bottom: 40, left: 40 },
    },
    dataSchema: { type: 'object' },
    styles: {},
    fonts: [],
    sections: [
      {
        id: 'section-1',
        bands: [
          {
            id: 'band-1',
            type: 'body',
            height: 100,
            elements: [
              {
                id: 'el-1',
                type: 'text',
                x: 0,
                y: 0,
                width: 200,
                height: 20,
                properties: { content: 'Hello' },
              },
            ],
          },
        ],
      },
    ],
  };
}

describe('template schema validation', () => {
  it('accepts a valid template', () => {
    const result = validateTemplateSchema(validTemplate());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects non-object input', () => {
    const result = validateTemplateSchema('not an object');
    expect(result.valid).toBe(false);
  });

  it('rejects missing required fields', () => {
    const result = validateTemplateSchema({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects invalid version', () => {
    const t = { ...validTemplate(), version: '2.0' as const };
    const result = validateTemplateSchema(t);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes('version'))).toBe(true);
  });

  it('rejects empty name', () => {
    const t = { ...validTemplate(), name: '' };
    const result = validateTemplateSchema(t);
    expect(result.valid).toBe(false);
  });

  it('rejects empty sections array', () => {
    const t = { ...validTemplate(), sections: [] };
    const result = validateTemplateSchema(t);
    expect(result.valid).toBe(false);
  });

  it('rejects invalid band type', () => {
    const t = validTemplate();
    t.sections[0]!.bands[0]!.type = 'invalid' as never;
    const result = validateTemplateSchema(t);
    expect(result.valid).toBe(false);
  });

  it('rejects page with zero width', () => {
    const t = validTemplate();
    t.page.width = 0;
    const result = validateTemplateSchema(t);
    expect(result.valid).toBe(false);
  });

  it('rejects negative margins', () => {
    const t = validTemplate();
    t.page.margins.top = -1;
    const result = validateTemplateSchema(t);
    expect(result.valid).toBe(false);
  });

  it('accepts template with styles', () => {
    const t = validTemplate();
    t.styles = {
      heading: { fontSize: 24, fontWeight: 'bold' },
      body: { fontSize: 12, color: '#333333' },
    };
    const result = validateTemplateSchema(t);
    expect(result.valid).toBe(true);
  });

  it('rejects invalid style properties', () => {
    const t = validTemplate();
    t.styles = { heading: { fontWeight: 'extra-bold' as never } };
    const result = validateTemplateSchema(t);
    expect(result.valid).toBe(false);
  });

  it('accepts template with fonts', () => {
    const t = validTemplate();
    t.fonts = [{ family: 'Inter', weight: 400, src: '@fontsource/inter/400.css' }];
    const result = validateTemplateSchema(t);
    expect(result.valid).toBe(true);
  });

  it('rejects font missing required fields', () => {
    const t = validTemplate();
    t.fonts = [{ family: 'Inter' } as never];
    const result = validateTemplateSchema(t);
    expect(result.valid).toBe(false);
  });

  it('accepts element with styleOverrides', () => {
    const t = validTemplate();
    t.sections[0]!.bands[0]!.elements[0]!.styleOverrides = { fontSize: 14 };
    const result = validateTemplateSchema(t);
    expect(result.valid).toBe(true);
  });

  it('accepts band with all optional fields', () => {
    const t = validTemplate();
    t.sections[0]!.bands[0] = {
      ...t.sections[0]!.bands[0]!,
      autoHeight: true,
      condition: '{{ show }}',
      backgroundColor: '#f0f0f0',
      pageBreakBefore: false,
      anchor: 'my-band',
    };
    const result = validateTemplateSchema(t);
    expect(result.valid).toBe(true);
  });

  it('accepts section with page override', () => {
    const t = validTemplate();
    t.sections[0]!.page = { width: 595, height: 842 };
    const result = validateTemplateSchema(t);
    expect(result.valid).toBe(true);
  });

  it('accepts padding as number', () => {
    const t = validTemplate();
    t.styles = { padded: { padding: 10 } };
    const result = validateTemplateSchema(t);
    expect(result.valid).toBe(true);
  });

  it('accepts padding as object', () => {
    const t = validTemplate();
    t.styles = { padded: { padding: { top: 5, right: 10, bottom: 5, left: 10 } } };
    const result = validateTemplateSchema(t);
    expect(result.valid).toBe(true);
  });

  it('accepts element with conditionalStyles', () => {
    const t = validTemplate();
    t.sections[0]!.bands[0]!.elements[0]!.conditionalStyles = [
      { condition: '{{ highlighted }}', styleOverrides: { backgroundColor: '#ffff00' } },
    ];
    const result = validateTemplateSchema(t);
    expect(result.valid).toBe(true);
  });

  it('accepts style with linear gradient backgroundColor', () => {
    const t = validTemplate();
    t.styles = {
      gradient: {
        backgroundColor: {
          type: 'linear',
          angle: 90,
          stops: [
            { color: '#ff0000', position: 0 },
            { color: '#0000ff', position: 1 },
          ],
        },
      },
    };
    const result = validateTemplateSchema(t);
    expect(result.valid).toBe(true);
  });

  it('accepts style with radial gradient backgroundColor', () => {
    const t = validTemplate();
    t.styles = {
      gradient: {
        backgroundColor: {
          type: 'radial',
          cx: 0.5,
          cy: 0.5,
          radius: 0.7,
          stops: [
            { color: '#ffffff', position: 0 },
            { color: '#000000', position: 1 },
          ],
        },
      },
    };
    const result = validateTemplateSchema(t);
    expect(result.valid).toBe(true);
  });

  it('accepts band with gradient backgroundColor', () => {
    const t = validTemplate();
    t.sections[0]!.bands[0]!.backgroundColor = {
      type: 'linear',
      angle: 45,
      stops: [
        { color: '#ff6600', position: 0 },
        { color: '#00cc66', position: 1 },
      ],
    };
    const result = validateTemplateSchema(t);
    expect(result.valid).toBe(true);
  });

  it('rejects gradient with fewer than 2 stops', () => {
    const t = validTemplate();
    t.styles = {
      gradient: {
        backgroundColor: {
          type: 'linear',
          angle: 0,
          stops: [{ color: '#ff0000', position: 0 }],
        } as never,
      },
    };
    const result = validateTemplateSchema(t);
    expect(result.valid).toBe(false);
  });

  it('rejects gradient stop with position > 1', () => {
    const t = validTemplate();
    t.styles = {
      gradient: {
        backgroundColor: {
          type: 'linear',
          angle: 0,
          stops: [
            { color: '#ff0000', position: 0 },
            { color: '#0000ff', position: 1.5 },
          ],
        } as never,
      },
    };
    const result = validateTemplateSchema(t);
    expect(result.valid).toBe(false);
  });
});
