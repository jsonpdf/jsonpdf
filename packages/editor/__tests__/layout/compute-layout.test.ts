import { describe, it, expect } from 'vitest';
import { computeDesignLayout } from '../../src/layout/compute-layout';
import { createTemplate, addSection, addBand } from '@jsonpdf/template';
import type { Band } from '@jsonpdf/core';

function makeBand(overrides: Partial<Band> = {}): Band {
  return {
    id: 'b1',
    type: 'body',
    height: 50,
    elements: [],
    ...overrides,
  };
}

describe('computeDesignLayout', () => {
  it('returns empty array for template with no sections', () => {
    const t = createTemplate();
    expect(computeDesignLayout(t)).toEqual([]);
  });

  it('returns one page per section', () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addSection(t, { id: 'sec2', bands: [] });
    const pages = computeDesignLayout(t);
    expect(pages).toHaveLength(2);
    expect(pages[0].sectionId).toBe('sec1');
    expect(pages[0].sectionIndex).toBe(0);
    expect(pages[1].sectionId).toBe('sec2');
    expect(pages[1].sectionIndex).toBe(1);
  });

  it('merges section page config with template defaults', () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', page: { width: 800 }, bands: [] });
    const pages = computeDesignLayout(t);
    expect(pages[0].pageConfig.width).toBe(800);
    expect(pages[0].pageConfig.height).toBe(792); // default preserved
    expect(pages[0].pageConfig.margins.top).toBe(40); // default preserved
  });

  it('computes band offsetY values cumulatively', () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', makeBand({ id: 'b1', type: 'body', height: 100 }));
    t = addBand(t, 'sec1', makeBand({ id: 'b2', type: 'body', height: 50 }));
    const pages = computeDesignLayout(t);
    expect(pages[0].bands[0].offsetY).toBe(0);
    expect(pages[0].bands[0].height).toBe(100);
    expect(pages[0].bands[1].offsetY).toBe(100);
    expect(pages[0].bands[1].height).toBe(50);
  });

  it('computes totalHeight as sum of band heights', () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', makeBand({ id: 'b1', height: 100 }));
    t = addBand(t, 'sec1', makeBand({ id: 'b2', height: 60 }));
    const pages = computeDesignLayout(t);
    expect(pages[0].totalHeight).toBe(160);
  });

  it('sorts bands by display order', () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', makeBand({ id: 'b1', type: 'pageFooter', height: 30 }));
    t = addBand(t, 'sec1', makeBand({ id: 'b2', type: 'title', height: 50 }));
    t = addBand(t, 'sec1', makeBand({ id: 'b3', type: 'pageHeader', height: 20 }));
    t = addBand(t, 'sec1', makeBand({ id: 'b4', type: 'detail', height: 40 }));
    const pages = computeDesignLayout(t);
    const types = pages[0].bands.map((db) => db.band.type);
    expect(types).toEqual(['pageHeader', 'title', 'detail', 'pageFooter']);
  });

  it('preserves relative order within same band type', () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', makeBand({ id: 'b1', type: 'detail', height: 30 }));
    t = addBand(t, 'sec1', makeBand({ id: 'b2', type: 'detail', height: 40 }));
    t = addBand(t, 'sec1', makeBand({ id: 'b3', type: 'detail', height: 50 }));
    const pages = computeDesignLayout(t);
    const ids = pages[0].bands.map((db) => db.band.id);
    expect(ids).toEqual(['b1', 'b2', 'b3']);
  });

  it('returns zero totalHeight for section with no bands', () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    const pages = computeDesignLayout(t);
    expect(pages[0].totalHeight).toBe(0);
    expect(pages[0].bands).toEqual([]);
  });

  it('uses template defaults when section has no page override', () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    const pages = computeDesignLayout(t);
    expect(pages[0].pageConfig).toEqual(t.page);
  });
});
