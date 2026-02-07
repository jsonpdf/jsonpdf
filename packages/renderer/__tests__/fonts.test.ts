import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { resolveStandardFont, embedFonts, collectFontSpecs } from '../src/fonts.js';
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
