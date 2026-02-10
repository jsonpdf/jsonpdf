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
    designHeight: 80,
    ...overrides,
  };
}

describe('useSelectionGeometry', () => {
  it('returns null when no selection', () => {
    const { result } = renderHook(() => useSelectionGeometry([], [], [], []));
    expect(result.current).toBeNull();
  });

  it('returns null when element not found', () => {
    const pages = [makePage({ bands: [] })];
    const { result } = renderHook(() =>
      useSelectionGeometry(['missing'], pages, [PADDING], [PADDING]),
    );
    expect(result.current).toBeNull();
  });

  it('returns correct geometry for element in first section', () => {
    const band = makeBand({
      id: 'b1',
      type: 'body',
      elements: [{ id: 'el1', type: 'text', x: 10, y: 20, width: 100, height: 50, properties: {} }],
    });
    const pages = [makePage({ bands: [{ band, offsetY: 0, height: 100 }] })];

    const { result } = renderHook(() => useSelectionGeometry(['el1'], pages, [PADDING], [PADDING]));

    expect(result.current).toEqual({
      x: PADDING + 40 + 10, // pageX + margin.left + el.x
      y: PADDING + 40 + 0 + 20, // pageY + margin.top + band.offsetY + el.y
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

    const { result } = renderHook(() =>
      useSelectionGeometry(['el2'], pages, [PADDING, PADDING], [PADDING, 872]),
    );

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

    const { result } = renderHook(() =>
      useSelectionGeometry(['child1'], pages, [PADDING], [PADDING]),
    );

    expect(result.current).toEqual({
      x: PADDING + 40 + 30 + 5, // pageX + margin + container.x + child.x
      y: PADDING + 40 + 50 + 40 + 10, // pageY + margin + bandOffset + container.y + child.y
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

    const { result } = renderHook(() => useSelectionGeometry(['el1'], pages, [PADDING], [PADDING]));

    expect(result.current?.rotation).toBe(45);
  });

  it('returns bounding box for multiple elements', () => {
    const band = makeBand({
      id: 'b1',
      type: 'body',
      elements: [
        { id: 'el1', type: 'text', x: 10, y: 20, width: 100, height: 50, properties: {} },
        { id: 'el2', type: 'text', x: 50, y: 80, width: 80, height: 30, properties: {} },
      ],
    });
    const pages = [makePage({ bands: [{ band, offsetY: 0, height: 200 }] })];

    const { result } = renderHook(() =>
      useSelectionGeometry(['el1', 'el2'], pages, [PADDING], [PADDING]),
    );

    // el1: [90, 100] to [190, 150]  (pageX+margin+el.x = 40+40+10=90)
    // el2: [130, 160] to [210, 190]
    // bbox: [90, 100] to [210, 190]
    expect(result.current).toEqual({
      x: PADDING + 40 + 10,
      y: PADDING + 40 + 20,
      width: 120, // 210 - 90 = (50+80) - 10 = 120
      height: 90, // 190 - 100 = (80+30) - 20 = 90
      rotation: 0,
    });
  });

  it('multi-select ignores individual rotations', () => {
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
        { id: 'el2', type: 'text', x: 50, y: 50, width: 80, height: 30, properties: {} },
      ],
    });
    const pages = [makePage({ bands: [{ band, offsetY: 0, height: 200 }] })];

    const { result } = renderHook(() =>
      useSelectionGeometry(['el1', 'el2'], pages, [PADDING], [PADDING]),
    );

    expect(result.current?.rotation).toBe(0);
  });
});
