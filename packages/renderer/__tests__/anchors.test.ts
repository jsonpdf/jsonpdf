import { describe, it, expect, vi } from 'vitest';
import { collectAnchors } from '../src/anchors.js';
import type { LayoutResult } from '../src/layout.js';
import type { Band, Element } from '@jsonpdf/core';

function makeBand(overrides: Partial<Band> = {}): Band {
  return {
    id: 'b1',
    type: 'body',
    height: 50,
    elements: [],
    ...overrides,
  };
}

function makeElement(overrides: Partial<Element> = {}): Element {
  return {
    id: 'el1',
    type: 'text',
    x: 0,
    y: 0,
    width: 100,
    height: 20,
    properties: { content: 'test' },
    ...overrides,
  };
}

function makeLayout(pages: LayoutResult['pages']): LayoutResult {
  return { pages, totalPages: pages.length };
}

describe('collectAnchors', () => {
  it('returns empty map for layout with no anchors', () => {
    const layout = makeLayout([
      {
        sectionIndex: 0,
        pageIndex: 0,
        bands: [
          {
            band: makeBand(),
            offsetY: 0,
            measuredHeight: 50,
            elementHeights: new Map(),
            scope: {},
          },
        ],
      },
    ]);

    const anchors = collectAnchors(layout);
    expect(anchors.size).toBe(0);
  });

  it('collects band-level anchors', () => {
    const layout = makeLayout([
      {
        sectionIndex: 0,
        pageIndex: 0,
        bands: [
          {
            band: makeBand({ anchor: 'chapter1' }),
            offsetY: 0,
            measuredHeight: 50,
            elementHeights: new Map(),
            scope: {},
          },
        ],
      },
    ]);

    const anchors = collectAnchors(layout);
    expect(anchors.get('chapter1')).toBe(1);
  });

  it('collects element-level anchors', () => {
    const layout = makeLayout([
      {
        sectionIndex: 0,
        pageIndex: 0,
        bands: [
          {
            band: makeBand({
              elements: [makeElement({ anchor: 'fig1' })],
            }),
            offsetY: 0,
            measuredHeight: 50,
            elementHeights: new Map(),
            scope: {},
          },
        ],
      },
    ]);

    const anchors = collectAnchors(layout);
    expect(anchors.get('fig1')).toBe(1);
  });

  it('maps anchors to correct page numbers (1-based)', () => {
    const layout = makeLayout([
      {
        sectionIndex: 0,
        pageIndex: 0,
        bands: [
          {
            band: makeBand({ anchor: 'page1-anchor' }),
            offsetY: 0,
            measuredHeight: 50,
            elementHeights: new Map(),
            scope: {},
          },
        ],
      },
      {
        sectionIndex: 0,
        pageIndex: 1,
        bands: [
          {
            band: makeBand({ anchor: 'page2-anchor' }),
            offsetY: 0,
            measuredHeight: 50,
            elementHeights: new Map(),
            scope: {},
          },
        ],
      },
      {
        sectionIndex: 1,
        pageIndex: 2,
        bands: [
          {
            band: makeBand({
              elements: [makeElement({ anchor: 'page3-element' })],
            }),
            offsetY: 0,
            measuredHeight: 50,
            elementHeights: new Map(),
            scope: {},
          },
        ],
      },
    ]);

    const anchors = collectAnchors(layout);
    expect(anchors.get('page1-anchor')).toBe(1);
    expect(anchors.get('page2-anchor')).toBe(2);
    expect(anchors.get('page3-element')).toBe(3);
  });

  it('first occurrence wins for duplicate anchor IDs', () => {
    const layout = makeLayout([
      {
        sectionIndex: 0,
        pageIndex: 0,
        bands: [
          {
            band: makeBand({ anchor: 'dup' }),
            offsetY: 0,
            measuredHeight: 50,
            elementHeights: new Map(),
            scope: {},
          },
        ],
      },
      {
        sectionIndex: 0,
        pageIndex: 1,
        bands: [
          {
            band: makeBand({ anchor: 'dup' }),
            offsetY: 0,
            measuredHeight: 50,
            elementHeights: new Map(),
            scope: {},
          },
        ],
      },
    ]);

    const anchors = collectAnchors(layout);
    expect(anchors.get('dup')).toBe(1);
  });

  it('warns on duplicate band anchor IDs', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const layout = makeLayout([
      {
        sectionIndex: 0,
        pageIndex: 0,
        bands: [
          {
            band: makeBand({ anchor: 'dup' }),
            offsetY: 0,
            measuredHeight: 50,
            elementHeights: new Map(),
            scope: {},
          },
        ],
      },
      {
        sectionIndex: 0,
        pageIndex: 1,
        bands: [
          {
            band: makeBand({ anchor: 'dup' }),
            offsetY: 0,
            measuredHeight: 50,
            elementHeights: new Map(),
            scope: {},
          },
        ],
      },
    ]);

    collectAnchors(layout, { warnOnDuplicates: true });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Duplicate anchor "dup"'));
    warnSpy.mockRestore();
  });

  it('does not warn on duplicates when warnOnDuplicates is false', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const layout = makeLayout([
      {
        sectionIndex: 0,
        pageIndex: 0,
        bands: [
          {
            band: makeBand({ anchor: 'dup' }),
            offsetY: 0,
            measuredHeight: 50,
            elementHeights: new Map(),
            scope: {},
          },
        ],
      },
      {
        sectionIndex: 0,
        pageIndex: 1,
        bands: [
          {
            band: makeBand({ anchor: 'dup' }),
            offsetY: 0,
            measuredHeight: 50,
            elementHeights: new Map(),
            scope: {},
          },
        ],
      },
    ]);

    collectAnchors(layout);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('warns on duplicate element anchor IDs', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const layout = makeLayout([
      {
        sectionIndex: 0,
        pageIndex: 0,
        bands: [
          {
            band: makeBand({ elements: [makeElement({ anchor: 'el-dup' })] }),
            offsetY: 0,
            measuredHeight: 50,
            elementHeights: new Map(),
            scope: {},
          },
        ],
      },
      {
        sectionIndex: 0,
        pageIndex: 1,
        bands: [
          {
            band: makeBand({ elements: [makeElement({ anchor: 'el-dup' })] }),
            offsetY: 0,
            measuredHeight: 50,
            elementHeights: new Map(),
            scope: {},
          },
        ],
      },
    ]);

    collectAnchors(layout, { warnOnDuplicates: true });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Duplicate anchor "el-dup"'));
    warnSpy.mockRestore();
  });

  it('collects both band and element anchors from same page', () => {
    const layout = makeLayout([
      {
        sectionIndex: 0,
        pageIndex: 0,
        bands: [
          {
            band: makeBand({
              anchor: 'band-anchor',
              elements: [makeElement({ anchor: 'element-anchor' })],
            }),
            offsetY: 0,
            measuredHeight: 50,
            elementHeights: new Map(),
            scope: {},
          },
        ],
      },
    ]);

    const anchors = collectAnchors(layout);
    expect(anchors.size).toBe(2);
    expect(anchors.get('band-anchor')).toBe(1);
    expect(anchors.get('element-anchor')).toBe(1);
  });

  it('returns empty map for empty layout', () => {
    const layout = makeLayout([]);
    const anchors = collectAnchors(layout);
    expect(anchors.size).toBe(0);
  });
});
