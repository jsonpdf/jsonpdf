import { describe, it, expect, beforeAll } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import type { PDFFont, PDFPage } from 'pdf-lib';
import { textPlugin } from '../../src/text/text-plugin.js';
import { fontKey } from '../../src/types.js';
import type { MeasureContext, RenderContext, FontMap } from '../../src/types.js';
import type { Style } from '@jsonpdf/core';

let doc: PDFDocument;
let helvetica: PDFFont;
let helveticaBold: PDFFont;
let fonts: FontMap;
let page: PDFPage;

const defaultStyle: Style = {
  fontFamily: 'Helvetica',
  fontSize: 12,
  fontWeight: 'normal',
  fontStyle: 'normal',
  color: '#000000',
  textAlign: 'left',
  lineHeight: 1.2,
};

beforeAll(async () => {
  doc = await PDFDocument.create();
  helvetica = await doc.embedFont(StandardFonts.Helvetica);
  helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  page = doc.addPage([612, 792]);

  fonts = new Map();
  fonts.set(fontKey('Helvetica', 'normal', 'normal'), helvetica);
  fonts.set(fontKey('Helvetica', 'bold', 'normal'), helveticaBold);
});

function makeMeasureCtx(overrides?: Partial<MeasureContext>): MeasureContext {
  return {
    fonts,
    availableWidth: 500,
    availableHeight: 1000,
    resolveStyle: () => defaultStyle,
    elementStyle: defaultStyle,
    ...overrides,
  };
}

function makeRenderCtx(overrides?: Partial<RenderContext>): RenderContext {
  return {
    ...makeMeasureCtx(),
    page,
    x: 40,
    y: 752,
    width: 500,
    height: 100,
    ...overrides,
  };
}

describe('textPlugin.measure', () => {
  it('measures single-line plain text', async () => {
    const result = await textPlugin.measure({ content: 'Hello World' }, makeMeasureCtx());
    expect(result.height).toBeCloseTo(12 * 1.2, 1);
    expect(result.width).toBe(500);
  });

  it('measures multi-line plain text', async () => {
    const longText =
      'This is a longer text that should wrap across multiple lines given a narrow width';
    const ctx = makeMeasureCtx({ availableWidth: 100 });
    const result = await textPlugin.measure({ content: longText }, ctx);
    expect(result.height).toBeGreaterThan(12 * 1.2);
  });

  it('measures empty string', async () => {
    const result = await textPlugin.measure({ content: '' }, makeMeasureCtx());
    expect(result.height).toBe(12 * 1.2);
  });

  it('measures StyledRun array', async () => {
    const result = await textPlugin.measure(
      { content: [{ text: 'Hello ' }, { text: 'World' }] },
      makeMeasureCtx(),
    );
    expect(result.height).toBeGreaterThan(0);
  });
});

describe('textPlugin.render', () => {
  it('renders plain text without throwing', async () => {
    await expect(
      textPlugin.render({ content: 'Hello World' }, makeRenderCtx()),
    ).resolves.toBeUndefined();
  });

  it('renders multi-line text', async () => {
    const longText = 'The quick brown fox jumps over the lazy dog. '.repeat(5);
    await expect(
      textPlugin.render({ content: longText }, makeRenderCtx({ width: 200 })),
    ).resolves.toBeUndefined();
  });

  it('renders centered text', async () => {
    const ctx = makeRenderCtx({
      elementStyle: { ...defaultStyle, textAlign: 'center' },
    });
    await expect(textPlugin.render({ content: 'Centered' }, ctx)).resolves.toBeUndefined();
  });

  it('renders right-aligned text', async () => {
    const ctx = makeRenderCtx({
      elementStyle: { ...defaultStyle, textAlign: 'right' },
    });
    await expect(textPlugin.render({ content: 'Right aligned' }, ctx)).resolves.toBeUndefined();
  });

  it('renders StyledRun array', async () => {
    await expect(
      textPlugin.render(
        {
          content: [{ text: 'Hello ' }, { text: 'World', styleOverrides: { fontWeight: 'bold' } }],
        },
        makeRenderCtx(),
      ),
    ).resolves.toBeUndefined();
  });

  it('produces valid PDF bytes after rendering', async () => {
    const testDoc = await PDFDocument.create();
    const testFont = await testDoc.embedFont(StandardFonts.Helvetica);
    const testPage = testDoc.addPage([612, 792]);
    const testFonts: FontMap = new Map();
    testFonts.set(fontKey('Helvetica', 'normal', 'normal'), testFont);

    await textPlugin.render(
      { content: 'PDF test' },
      makeRenderCtx({
        page: testPage,
        fonts: testFonts,
      }),
    );

    const bytes = await testDoc.save();
    const header = new TextDecoder().decode(new Uint8Array(bytes).slice(0, 5));
    expect(header).toBe('%PDF-');
  });
});

describe('textPlugin.validate', () => {
  it('returns no errors for valid props', () => {
    expect(textPlugin.validate({ content: 'Hello' })).toEqual([]);
  });

  it('returns no errors for StyledRun array', () => {
    expect(textPlugin.validate({ content: [{ text: 'Hello' }] })).toEqual([]);
  });

  it('returns error for invalid content', () => {
    const errors = textPlugin.validate({ content: 123 as never });
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('textPlugin.resolveProps', () => {
  it('resolveProps returns TextProps with content', () => {
    const result = textPlugin.resolveProps({ content: 'hello' });
    expect(result).toBeDefined();
    expect(result.content).toBe('hello');
  });

  it('resolveProps includes defaults for missing properties', () => {
    const result = textPlugin.resolveProps({});
    expect(result).toBeDefined();
    // Should have content property with default value
    expect(result.content).toBeDefined();
  });
});

describe('textPlugin rich text with nonexistent named style', () => {
  it('renders StyledRun with nonexistent named style without throwing', async () => {
    // resolveRunStyle calls ctx.resolveStyle(name) which returns defaults for missing styles
    await expect(
      textPlugin.render(
        {
          content: [{ text: 'Hello', style: 'nonexistent' }],
        },
        makeRenderCtx(),
      ),
    ).resolves.toBeUndefined();
  });

  it('measures StyledRun with nonexistent named style using defaults', async () => {
    const result = await textPlugin.measure(
      {
        content: [{ text: 'Hello', style: 'nonexistent' }],
      },
      makeMeasureCtx(),
    );
    // Should use default style (Helvetica 12pt) — same as plain text
    const plainResult = await textPlugin.measure({ content: 'Hello' }, makeMeasureCtx());
    expect(result.height).toBe(plainResult.height);
  });
});
