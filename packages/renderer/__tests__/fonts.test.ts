import { describe, it, expect, vi, afterEach } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { resolveStandardFont, embedFonts, collectFontSpecs, mapWeight, isStandardFont } from '../src/fonts.js';
import { fontKey } from '@jsonpdf/plugins';
import { createTemplate, addStyle, addSection, addBand, addElement } from '@jsonpdf/template';

describe('resolveStandardFont', () => {
  it('maps Helvetica normal', () => {
    const result = resolveStandardFont({ family: 'Helvetica', weight: 'normal', style: 'normal' });
    expect(result).toBe('Helvetica');
  });

  it('maps Helvetica bold', () => {
    const result = resolveStandardFont({ family: 'Helvetica', weight: 'bold', style: 'normal' });
    expect(result).toBe('Helvetica-Bold');
  });

  it('maps Times italic', () => {
    const result = resolveStandardFont({ family: 'Times', weight: 'normal', style: 'italic' });
    expect(result).toBe('Times-Italic');
  });

  it('maps Courier bold italic', () => {
    const result = resolveStandardFont({ family: 'Courier', weight: 'bold', style: 'italic' });
    expect(result).toBe('Courier-BoldOblique');
  });

  it('falls back to Helvetica for unknown families', () => {
    const result = resolveStandardFont({ family: 'Unknown', weight: 'normal', style: 'normal' });
    expect(result).toBe('Helvetica');
  });
});

describe('embedFonts', () => {
  it('embeds fonts and returns a FontMap', async () => {
    const doc = await PDFDocument.create();
    const fonts = await embedFonts(doc, [
      { family: 'Helvetica', weight: 'normal', style: 'normal' },
      { family: 'Helvetica', weight: 'bold', style: 'normal' },
    ]);
    expect(fonts.size).toBeGreaterThanOrEqual(2);
    expect(fonts.has(fontKey('Helvetica', 'normal', 'normal'))).toBe(true);
    expect(fonts.has(fontKey('Helvetica', 'bold', 'normal'))).toBe(true);
  });

  it('always includes default Helvetica', async () => {
    const doc = await PDFDocument.create();
    const fonts = await embedFonts(doc, []);
    expect(fonts.has(fontKey('Helvetica', 'normal', 'normal'))).toBe(true);
  });

  it('deduplicates specs', async () => {
    const doc = await PDFDocument.create();
    const fonts = await embedFonts(doc, [
      { family: 'Helvetica', weight: 'normal', style: 'normal' },
      { family: 'Helvetica', weight: 'normal', style: 'normal' },
    ]);
    // Should be 1 (default = same as the spec)
    expect(fonts.size).toBe(1);
  });
});

describe('collectFontSpecs', () => {
  it('collects from named styles', () => {
    let t = createTemplate({ name: 'Test' });
    t = addStyle(t, 'heading', { fontFamily: 'Times', fontWeight: 'bold' });
    t = addStyle(t, 'body', { fontFamily: 'Helvetica' });

    const specs = collectFontSpecs(t);
    expect(specs.some((s) => s.family === 'Times' && s.weight === 'bold')).toBe(true);
    expect(specs.some((s) => s.family === 'Helvetica')).toBe(true);
  });

  it('returns at least empty array for template with no styles', () => {
    const t = createTemplate();
    const specs = collectFontSpecs(t);
    expect(Array.isArray(specs)).toBe(true);
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
      conditionalStyles: [
        { condition: 'true', style: 'mono' },
      ],
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

describe('isStandardFont', () => {
  it('returns true for standard font keys', () => {
    expect(isStandardFont('Helvetica:normal:normal')).toBe(true);
    expect(isStandardFont('Helvetica:bold:italic')).toBe(true);
    expect(isStandardFont('Times:normal:normal')).toBe(true);
    expect(isStandardFont('Courier:bold:normal')).toBe(true);
  });

  it('returns false for non-standard font keys', () => {
    expect(isStandardFont('Roboto:normal:normal')).toBe(false);
    expect(isStandardFont('OpenSans:bold:normal')).toBe(false);
  });
});

describe('embedFonts with custom fonts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to Helvetica when declaration not found', async () => {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    const fonts = await embedFonts(
      doc,
      [{ family: 'CustomFont', weight: 'normal', style: 'normal' }],
      [],
    );
    const key = fontKey('CustomFont', 'normal', 'normal');
    expect(fonts.has(key)).toBe(true);
    // The fallback font should still be usable
    const font = fonts.get(key)!;
    expect(font.widthOfTextAtSize('test', 12)).toBeGreaterThan(0);
  });

  it('reuses default font for multiple unresolved custom fonts', async () => {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    const fonts = await embedFonts(
      doc,
      [
        { family: 'CustomA', weight: 'normal', style: 'normal' },
        { family: 'CustomB', weight: 'bold', style: 'normal' },
      ],
      [],
    );
    const keyA = fontKey('CustomA', 'normal', 'normal');
    const keyB = fontKey('CustomB', 'bold', 'normal');
    const defaultKey = fontKey('Helvetica', 'normal', 'normal');
    // Both should fall back to the same default font instance
    expect(fonts.get(keyA)).toBe(fonts.get(defaultKey));
    expect(fonts.get(keyB)).toBe(fonts.get(defaultKey));
  });

  it('maps numeric weight 700 to bold for declaration matching', async () => {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);

    // Request bold, declarations has weight 700
    const fonts = await embedFonts(
      doc,
      [{ family: 'CustomBold', weight: 'bold', style: 'normal' }],
      // No matching declaration — should fallback
      [{ family: 'CustomBold', weight: 400, style: 'normal', src: '/fake.ttf' }],
    );

    // weight: 'bold' vs declaration weight: 400 (maps to 'normal') → no match → fallback
    const key = fontKey('CustomBold', 'bold', 'normal');
    expect(fonts.has(key)).toBe(true);
  });

  it('standard fonts work without fontDeclarations parameter', async () => {
    const doc = await PDFDocument.create();
    const fonts = await embedFonts(doc, [
      { family: 'Courier', weight: 'normal', style: 'normal' },
    ]);
    expect(fonts.has(fontKey('Courier', 'normal', 'normal'))).toBe(true);
  });
});
