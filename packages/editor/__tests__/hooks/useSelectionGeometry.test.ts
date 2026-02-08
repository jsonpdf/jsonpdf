// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSelectionGeometry } from '../../src/hooks/useSelectionGeometry';
import type { DesignPage } from '../../src/layout';
import type { Band } from '@jsonpdf/core';

const PADDING = 40;

function makeBand(overrides: Partial<Band> & { id: string; type: Band['type'] }): Band {
  return { height: 100, elements: [], ...overrides };
}

function makePage(overrides: Partial<DesignPage>): DesignPage {
  return {
    sectionIndex: 0,
    sectionId: 'sec1',
    pageConfig: {
      width: 612,
      height: 792,
      margins: { top: 40, right: 40, bottom: 40, left: 40 },
    },
    bands: [],
    totalHeight: 0,
    ...overrides,
  };
}

describe('useSelectionGeometry', () => {
  it('returns null when no selection', () => {
    const { result } = renderHook(() => useSelectionGeometry(null, [], [], PADDING));
    expect(result.current).toBeNull();
  });

  it('returns null when element not found', () => {
    const pages = [makePage({ bands: [] })];
    const { result } = renderHook(() => useSelectionGeometry('missing', pages, [PADDING], PADDING));
    expect(result.current).toBeNull();
  });

  it('returns correct geometry for element in first section', () => {
    const band = makeBand({
      id: 'b1',
      type: 'body',
      elements: [{ id: 'el1', type: 'text', x: 10, y: 20, width: 100, height: 50, properties: {} }],
    });
    const pages = [makePage({ bands: [{ band, offsetY: 0, height: 100 }] })];
    const offsets = [PADDING];

    const { result } = renderHook(() => useSelectionGeometry('el1', pages, offsets, PADDING));

    expect(result.current).toEqual({
      x: PADDING + 40 + 10, // padding + margin.left + el.x
      y: PADDING + 40 + 0 + 20, // pageOffset + margin.top + band.offsetY + el.y
      width: 100,
      height: 50,
      rotation: 0,
    });
  });

  it('returns correct geometry for element in second section', () => {
    const band1 = makeBand({ id: 'b1', type: 'body', elements: [] });
    const band2 = makeBand({
      id: 'b2',
      type: 'body',
      elements: [{ id: 'el2', type: 'text', x: 5, y: 15, width: 80, height: 30, properties: {} }],
    });
    const pages = [
      makePage({ sectionId: 'sec1', bands: [{ band: band1, offsetY: 0, height: 100 }] }),
      makePage({
        sectionIndex: 1,
        sectionId: 'sec2',
        bands: [{ band: band2, offsetY: 0, height: 100 }],
      }),
    ];
    const offsets = [PADDING, 872]; // second page further down

    const { result } = renderHook(() => useSelectionGeometry('el2', pages, offsets, PADDING));

    expect(result.current).toEqual({
      x: PADDING + 40 + 5,
      y: 872 + 40 + 0 + 15,
      width: 80,
      height: 30,
      rotation: 0,
    });
  });

  it('accumulates container parent offsets for nested elements', () => {
    const band = makeBand({
      id: 'b1',
      type: 'body',
      elements: [
        {
          id: 'container1',
          type: 'container',
          x: 30,
          y: 40,
          width: 200,
          height: 100,
          properties: {},
          elements: [
            { id: 'child1', type: 'text', x: 5, y: 10, width: 60, height: 20, properties: {} },
          ],
        },
      ],
    });
    const pages = [makePage({ bands: [{ band, offsetY: 50, height: 100 }] })];
    const offsets = [PADDING];

    const { result } = renderHook(() => useSelectionGeometry('child1', pages, offsets, PADDING));

    expect(result.current).toEqual({
      x: PADDING + 40 + 30 + 5, // padding + margin + container.x + child.x
      y: PADDING + 40 + 50 + 40 + 10, // pageOffset + margin + bandOffset + container.y + child.y
      width: 60,
      height: 20,
      rotation: 0,
    });
  });

  it('includes rotation from element', () => {
    const band = makeBand({
      id: 'b1',
      type: 'body',
      elements: [
        {
          id: 'el1',
          type: 'text',
          x: 0,
          y: 0,
          width: 100,
          height: 50,
          rotation: 45,
          properties: {},
        },
      ],
    });
    const pages = [makePage({ bands: [{ band, offsetY: 0, height: 100 }] })];

    const { result } = renderHook(() => useSelectionGeometry('el1', pages, [PADDING], PADDING));

    expect(result.current?.rotation).toBe(45);
  });
});
