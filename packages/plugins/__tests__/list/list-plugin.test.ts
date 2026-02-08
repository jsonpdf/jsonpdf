import { describe, it, expect, beforeAll } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import type { PDFFont, PDFPage } from 'pdf-lib';
import { listPlugin } from '../../src/list/list-plugin.js';
import { fontKey } from '../../src/types.js';
import type { MeasureContext, RenderContext, FontMap, ImageCache } from '../../src/types.js';
import type { Style } from '@jsonpdf/core';

let doc: PDFDocument;
let page: PDFPage;
let fonts: FontMap;
let helvetica: PDFFont;
const noopImageCache: ImageCache = {
  getOrEmbed: () => Promise.reject(new Error('no images in test')),
};

const defaultStyle: Style = {
  fontFamily: 'Helvetica',
  fontSize: 12,
  fontWeight: 'normal',
  fontStyle: 'normal',
  color: '#000000',
  lineHeight: 1.2,
};

beforeAll(async () => {
  doc = await PDFDocument.create();
  helvetica = await doc.embedFont(StandardFonts.Helvetica);
  page = doc.addPage([612, 792]);
  fonts = new Map();
  fonts.set(fontKey('Helvetica', 'normal', 'normal'), helvetica);
});

function makeMeasureCtx(overrides?: Partial<MeasureContext>): MeasureContext {
  return {
    fonts,
    availableWidth: 500,
    availableHeight: 1000,
    resolveStyle: () => defaultStyle,
    elementStyle: defaultStyle,
    pdfDoc: doc,
    imageCache: noopImageCache,
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
    height: 200,
    ...overrides,
  };
}

describe('listPlugin.measure', () => {
  it('returns zero height for empty items', async () => {
    const result = await listPlugin.measure({ items: [] }, makeMeasureCtx());
    expect(result.height).toBe(0);
  });

  it('measures bullet list with one item', async () => {
    const result = await listPlugin.measure(
      { listType: 'bullet', items: ['First item'] },
      makeMeasureCtx(),
    );
    expect(result.height).toBeGreaterThan(0);
    expect(result.height).toBeCloseTo(12 * 1.2, 1);
  });

  it('measures bullet list with multiple items', async () => {
    const result = await listPlugin.measure(
      { items: ['Item 1', 'Item 2', 'Item 3'] },
      makeMeasureCtx(),
    );
    // 3 items × lineHeight + 2 × itemSpacing
    const expected = 3 * 12 * 1.2 + 2 * 2;
    expect(result.height).toBeCloseTo(expected, 0);
  });

  it('measures numbered list', async () => {
    const result = await listPlugin.measure(
      { listType: 'numbered', items: ['A', 'B'] },
      makeMeasureCtx(),
    );
    expect(result.height).toBeGreaterThan(0);
  });

  it('measures lettered list', async () => {
    const result = await listPlugin.measure(
      { listType: 'lettered', items: ['A', 'B'] },
      makeMeasureCtx(),
    );
    expect(result.height).toBeGreaterThan(0);
  });

  it('measures nested list', async () => {
    const result = await listPlugin.measure(
      {
        items: [{ content: 'Parent', children: [{ content: 'Child 1' }, { content: 'Child 2' }] }],
      },
      makeMeasureCtx(),
    );
    // Parent + spacing + 2 children + spacing between children
    expect(result.height).toBeGreaterThan(12 * 1.2 * 2);
  });

  it('measures wrapping item text', async () => {
    const longText = 'This is a very long item that should wrap to multiple lines in a narrow list';
    const result = await listPlugin.measure(
      { items: [longText] },
      makeMeasureCtx({ availableWidth: 100 }),
    );
    expect(result.height).toBeGreaterThan(12 * 1.2);
  });

  it('measures deeply nested list (3 levels deep)', async () => {
    const result = await listPlugin.measure(
      {
        items: [
          {
            content: 'Level 1',
            children: [
              {
                content: 'Level 2',
                children: [{ content: 'Level 3 item 1' }, { content: 'Level 3 item 2' }],
              },
            ],
          },
        ],
      },
      makeMeasureCtx(),
    );
    // Should account for all 3 levels
    expect(result.height).toBeGreaterThan(12 * 1.2 * 3);
  });

  it('measures list with many items (20+)', async () => {
    const manyItems = Array.from({ length: 25 }, (_, i) => `Item ${i + 1}`);
    const result = await listPlugin.measure({ items: manyItems }, makeMeasureCtx());
    // 25 items × lineHeight + 24 × itemSpacing
    const expected = 25 * 12 * 1.2 + 24 * 2;
    expect(result.height).toBeCloseTo(expected, 0);
  });
});

describe('listPlugin.render', () => {
  it('renders bullet list', async () => {
    await expect(
      listPlugin.render(
        { listType: 'bullet', items: ['Item 1', 'Item 2', 'Item 3'] },
        makeRenderCtx(),
      ),
    ).resolves.toBeUndefined();
  });

  it('renders numbered list', async () => {
    await expect(
      listPlugin.render(
        { listType: 'numbered', items: ['First', 'Second', 'Third'] },
        makeRenderCtx(),
      ),
    ).resolves.toBeUndefined();
  });

  it('renders lettered list', async () => {
    await expect(
      listPlugin.render(
        { listType: 'lettered', items: ['Alpha', 'Beta', 'Gamma'] },
        makeRenderCtx(),
      ),
    ).resolves.toBeUndefined();
  });

  it('renders nested list', async () => {
    await expect(
      listPlugin.render(
        {
          items: [
            { content: 'Parent 1', children: [{ content: 'Child A' }, { content: 'Child B' }] },
            'Parent 2',
          ],
        },
        makeRenderCtx(),
      ),
    ).resolves.toBeUndefined();
  });

  it('renders empty list without error', async () => {
    await expect(listPlugin.render({ items: [] }, makeRenderCtx())).resolves.toBeUndefined();
  });

  it('renders with StyledRun content', async () => {
    await expect(
      listPlugin.render({ items: [[{ text: 'Bold item' }]] }, makeRenderCtx()),
    ).resolves.toBeUndefined();
  });

  it('renders deeply nested list (3 levels deep)', async () => {
    await expect(
      listPlugin.render(
        {
          items: [
            {
              content: 'Level 1',
              children: [
                {
                  content: 'Level 2',
                  children: [{ content: 'Level 3 item 1' }, { content: 'Level 3 item 2' }],
                },
              ],
            },
          ],
        },
        makeRenderCtx(),
      ),
    ).resolves.toBeUndefined();
  });

  it('renders list with many items (20+)', async () => {
    const manyItems = Array.from({ length: 25 }, (_, i) => `Item ${i + 1}`);
    await expect(listPlugin.render({ items: manyItems }, makeRenderCtx())).resolves.toBeUndefined();
  });
});

describe('listPlugin.render: text alignment', () => {
  it('renders justified list items', async () => {
    const justifyStyle: Style = { ...defaultStyle, textAlign: 'justify' };
    await expect(
      listPlugin.render(
        { items: ['This is a longer item that may wrap to multiple lines in the list'] },
        makeRenderCtx({ elementStyle: justifyStyle, availableWidth: 150, width: 150 }),
      ),
    ).resolves.toBeUndefined();
  });

  it('renders center-aligned list items', async () => {
    const centerStyle: Style = { ...defaultStyle, textAlign: 'center' };
    await expect(
      listPlugin.render(
        { items: ['Centered item', 'Another centered'] },
        makeRenderCtx({ elementStyle: centerStyle }),
      ),
    ).resolves.toBeUndefined();
  });

  it('renders right-aligned list items', async () => {
    const rightStyle: Style = { ...defaultStyle, textAlign: 'right' };
    await expect(
      listPlugin.render(
        { items: ['Right-aligned item', 'Another right'] },
        makeRenderCtx({ elementStyle: rightStyle }),
      ),
    ).resolves.toBeUndefined();
  });

  it('justified list with wrapping text renders without error', async () => {
    const justifyStyle: Style = { ...defaultStyle, textAlign: 'justify' };
    const longText =
      'This is a very long list item that should wrap to multiple lines and be justified';
    await expect(
      listPlugin.render(
        { items: [longText, 'Short'] },
        makeRenderCtx({ elementStyle: justifyStyle, availableWidth: 120, width: 120 }),
      ),
    ).resolves.toBeUndefined();
  });
});

describe('listPlugin.validate', () => {
  it('returns no errors for valid props', () => {
    expect(listPlugin.validate({ items: ['a'] })).toEqual([]);
  });

  it('returns error for non-array items', () => {
    const errors = listPlugin.validate({ items: 'not-array' as never });
    expect(errors.length).toBeGreaterThan(0);
  });
});
