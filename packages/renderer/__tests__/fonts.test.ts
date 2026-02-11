import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { embedFonts, collectFontSpecs, mapWeight } from '../src/fonts.js';
import { fontKey } from '@jsonpdf/plugins';
import {
  createTemplate,
  addStyle,
  addSection,
  addBand,
  addElement,
  DEFAULT_FONTS,
} from '@jsonpdf/template';

describe('embedFonts', () => {
  it('embeds fonts from declarations and returns a FontMap', async () => {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    const fonts = await embedFonts(
      doc,
      [
        { family: 'Inter', weight: 'normal', style: 'normal' },
        { family: 'Inter', weight: 'bold', style: 'normal' },
      ],
      DEFAULT_FONTS,
    );
    expect(fonts.size).toBe(2);
    expect(fonts.has(fontKey('Inter', 'normal', 'normal'))).toBe(true);
    expect(fonts.has(fontKey('Inter', 'bold', 'normal'))).toBe(true);
  });

  it('returns empty map for empty specs', async () => {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    const fonts = await embedFonts(doc, [], DEFAULT_FONTS);
    expect(fonts.size).toBe(0);
  });

  it('deduplicates specs', async () => {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    const fonts = await embedFonts(
      doc,
      [
        { family: 'Inter', weight: 'normal', style: 'normal' },
        { family: 'Inter', weight: 'normal', style: 'normal' },
      ],
      DEFAULT_FONTS,
    );
    expect(fonts.size).toBe(1);
  });

  it('throws when declaration not found', async () => {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    await expect(
      embedFonts(doc, [{ family: 'CustomFont', weight: 'normal', style: 'normal' }], []),
    ).rejects.toThrow('No font declaration found for "CustomFont:normal:normal"');
  });

  it('throws for each missing declaration', async () => {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    await expect(
      embedFonts(doc, [{ family: 'CustomA', weight: 'normal', style: 'normal' }], []),
    ).rejects.toThrow('No font declaration found');
  });

  it('falls back to same-family declaration when weight does not match', async () => {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    // Request bold Inter, only regular (weight 400) declared → same-family fallback
    const fonts = await embedFonts(
      doc,
      [{ family: 'Inter', weight: 'bold', style: 'normal' }],
      DEFAULT_FONTS,
    );
    expect(fonts.size).toBe(1);
    expect(fonts.has(fontKey('Inter', 'bold', 'normal'))).toBe(true);
  });
});

describe('collectFontSpecs', () => {
  it('collects from named styles', () => {
    let t = createTemplate({ name: 'Test' });
    t = addStyle(t, 'heading', { fontFamily: 'Times', fontWeight: 'bold' });
    t = addStyle(t, 'body', { fontFamily: 'Inter' });

    const specs = collectFontSpecs(t);
    expect(specs.some((s) => s.family === 'Times' && s.weight === 'bold')).toBe(true);
    expect(specs.some((s) => s.family === 'Inter')).toBe(true);
  });

  it('always includes default font from template.defaultStyle even with no styles', () => {
    const t = createTemplate();
    const specs = collectFontSpecs(t);
    expect(specs).toHaveLength(1);
    expect(specs[0]).toEqual({
      family: t.defaultStyle.fontFamily,
      weight: 'normal',
      style: 'normal',
    });
  });

  it('collects fonts from StyledRun styleOverrides in element properties', () => {
    let t = createTemplate({ name: 'Rich Text Fonts' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'b1', {
      id: 'el1',
      type: 'text',
      x: 0,
      y: 0,
      width: 200,
      height: 30,
      properties: {
        content: [
          { text: 'Normal text' },
          { text: 'Bold Courier', styleOverrides: { fontFamily: 'Courier', fontWeight: 'bold' } },
        ],
      },
    });

    const specs = collectFontSpecs(t);
    expect(specs.some((s) => s.family === 'Courier' && s.weight === 'bold')).toBe(true);
  });

  it('collects fonts from element conditionalStyles overrides', () => {
    let t = createTemplate({ name: 'Conditional Font' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'b1', {
      id: 'el1',
      type: 'text',
      x: 0,
      y: 0,
      width: 200,
      height: 30,
      properties: { content: 'test' },
      conditionalStyles: [
        { condition: 'true', styleOverrides: { fontFamily: 'Times', fontWeight: 'bold' } },
      ],
    });

    const specs = collectFontSpecs(t);
    expect(specs.some((s) => s.family === 'Times' && s.weight === 'bold')).toBe(true);
  });

  it('collects fonts from conditionalStyles named style reference', () => {
    let t = createTemplate({ name: 'Conditional Named Style Font' });
    t = addStyle(t, 'mono', { fontFamily: 'Courier', fontStyle: 'italic' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'b1', {
      id: 'el1',
      type: 'text',
      x: 0,
      y: 0,
      width: 200,
      height: 30,
      properties: { content: 'test' },
      conditionalStyles: [{ condition: 'true', style: 'mono' }],
    });

    const specs = collectFontSpecs(t);
    expect(specs.some((s) => s.family === 'Courier' && s.style === 'italic')).toBe(true);
  });

  it('collects fonts from StyledRun named style references', () => {
    let t = createTemplate({ name: 'Rich Text Named Style' });
    t = addStyle(t, 'mono', { fontFamily: 'Courier', fontStyle: 'italic' });
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 100, elements: [] });
    t = addElement(t, 'b1', {
      id: 'el1',
      type: 'text',
      x: 0,
      y: 0,
      width: 200,
      height: 30,
      properties: {
        content: [{ text: 'Code text', style: 'mono' }],
      },
    });

    const specs = collectFontSpecs(t);
    expect(specs.some((s) => s.family === 'Courier' && s.style === 'italic')).toBe(true);
  });

  it('defaults to template.defaultStyle.fontFamily when no fontFamily specified', () => {
    let t = createTemplate({ name: 'Default Font' });
    t = addStyle(t, 'plain', { fontSize: 12 });

    const specs = collectFontSpecs(t);
    expect(specs.some((s) => s.family === t.defaultStyle.fontFamily)).toBe(true);
  });
});

describe('mapWeight', () => {
  it('returns normal for undefined', () => {
    expect(mapWeight(undefined)).toBe('normal');
  });

  it('returns normal for weight <= 500', () => {
    expect(mapWeight(400)).toBe('normal');
    expect(mapWeight(500)).toBe('normal');
    expect(mapWeight(100)).toBe('normal');
  });

  it('returns bold for weight > 500', () => {
    expect(mapWeight(501)).toBe('bold');
    expect(mapWeight(700)).toBe('bold');
    expect(mapWeight(900)).toBe('bold');
  });
});
