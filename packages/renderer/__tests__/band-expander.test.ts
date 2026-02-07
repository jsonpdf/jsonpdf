import { describe, it, expect, beforeAll } from 'vitest';
import { expandBands } from '../src/band-expander.js';
import { createExpressionEngine } from '../src/expression.js';
import type { ExpressionEngine } from '../src/expression.js';
import type { Band, Section } from '@jsonpdf/core';

let engine: ExpressionEngine;

beforeAll(() => {
  engine = createExpressionEngine();
});

function makeBand(overrides: Partial<Band> & { id: string; type: Band['type'] }): Band {
  return {
    height: 30,
    elements: [],
    ...overrides,
  };
}

function makeSection(bands: Band[]): Section {
  return { id: 'sec1', bands };
}

describe('expandBands: band type separation', () => {
  it('separates pageHeader and pageFooter bands', async () => {
    const section = makeSection([
      makeBand({ id: 'ph', type: 'pageHeader' }),
      makeBand({ id: 'pf', type: 'pageFooter' }),
      makeBand({ id: 'body1', type: 'body' }),
    ]);
    const result = await expandBands(section, {}, engine, 1);
    expect(result.pageHeaderBands).toHaveLength(1);
    expect(result.pageHeaderBands[0]!.id).toBe('ph');
    expect(result.pageFooterBands).toHaveLength(1);
    expect(result.pageFooterBands[0]!.id).toBe('pf');
  });

  it('separates lastPageFooter bands', async () => {
    const section = makeSection([
      makeBand({ id: 'lpf', type: 'lastPageFooter' }),
      makeBand({ id: 'body1', type: 'body' }),
    ]);
    const result = await expandBands(section, {}, engine, 1);
    expect(result.lastPageFooterBands).toHaveLength(1);
    expect(result.lastPageFooterBands[0]!.id).toBe('lpf');
  });

  it('separates columnHeader and columnFooter bands', async () => {
    const section = makeSection([
      makeBand({ id: 'ch', type: 'columnHeader' }),
      makeBand({ id: 'cf', type: 'columnFooter' }),
    ]);
    const result = await expandBands(section, {}, engine, 1);
    expect(result.columnHeaderBands).toHaveLength(1);
    expect(result.columnFooterBands).toHaveLength(1);
  });

  it('separates background bands', async () => {
    const section = makeSection([makeBand({ id: 'bg', type: 'background' })]);
    const result = await expandBands(section, {}, engine, 1);
    expect(result.backgroundBands).toHaveLength(1);
  });
});

describe('expandBands: content band ordering', () => {
  it('orders title before body before summary', async () => {
    const section = makeSection([
      makeBand({ id: 'summary', type: 'summary' }),
      makeBand({ id: 'body1', type: 'body' }),
      makeBand({ id: 'title', type: 'title' }),
    ]);
    const result = await expandBands(section, {}, engine, 1);
    const ids = result.contentBands.map((b) => b.band.id);
    expect(ids).toEqual(['title', 'body1', 'summary']);
  });

  it('places detail bands between title and body', async () => {
    const section = makeSection([
      makeBand({ id: 'title', type: 'title' }),
      makeBand({ id: 'detail', type: 'detail', dataSource: 'items' }),
      makeBand({ id: 'body1', type: 'body' }),
    ]);
    const data = { items: [{ name: 'A' }, { name: 'B' }] };
    const result = await expandBands(section, data, engine, 1);
    const ids = result.contentBands.map((b) => b.band.id);
    expect(ids).toEqual(['title', 'detail', 'detail', 'body1']);
  });

  it('body bands with no other content still work', async () => {
    const section = makeSection([
      makeBand({ id: 'b1', type: 'body' }),
      makeBand({ id: 'b2', type: 'body' }),
    ]);
    const result = await expandBands(section, {}, engine, 1);
    expect(result.contentBands).toHaveLength(2);
    expect(result.contentBands[0]!.band.id).toBe('b1');
    expect(result.contentBands[1]!.band.id).toBe('b2');
  });
});

describe('expandBands: detail iteration', () => {
  it('creates one instance per data item', async () => {
    const section = makeSection([makeBand({ id: 'detail', type: 'detail', dataSource: 'items' })]);
    const data = { items: ['a', 'b', 'c'] };
    const result = await expandBands(section, data, engine, 1);
    expect(result.contentBands).toHaveLength(3);
  });

  it('binds item to default itemName "item"', async () => {
    const section = makeSection([makeBand({ id: 'detail', type: 'detail', dataSource: 'items' })]);
    const data = { items: [{ name: 'Widget' }] };
    const result = await expandBands(section, data, engine, 1);
    expect(result.contentBands[0]!.scope['item']).toEqual({ name: 'Widget' });
    expect(result.contentBands[0]!.scope['_index']).toBe(0);
  });

  it('binds item to custom itemName', async () => {
    const section = makeSection([
      makeBand({
        id: 'detail',
        type: 'detail',
        dataSource: 'products',
        itemName: 'product',
      }),
    ]);
    const data = { products: [{ sku: 'X' }] };
    const result = await expandBands(section, data, engine, 1);
    expect(result.contentBands[0]!.scope['product']).toEqual({ sku: 'X' });
  });

  it('produces no instances for empty array', async () => {
    const section = makeSection([makeBand({ id: 'detail', type: 'detail', dataSource: 'items' })]);
    const result = await expandBands(section, { items: [] }, engine, 1);
    expect(result.contentBands).toHaveLength(0);
  });

  it('throws for detail band without dataSource', async () => {
    const section = makeSection([makeBand({ id: 'detail', type: 'detail' })]);
    await expect(expandBands(section, {}, engine, 1)).rejects.toThrow('must have a dataSource');
  });

  it('resolves nested dataSource paths', async () => {
    const section = makeSection([
      makeBand({ id: 'detail', type: 'detail', dataSource: 'order.lineItems' }),
    ]);
    const data = { order: { lineItems: [{ qty: 1 }, { qty: 2 }] } };
    const result = await expandBands(section, data, engine, 1);
    expect(result.contentBands).toHaveLength(2);
  });
});

describe('expandBands: noData band', () => {
  it('includes noData when detail array is empty', async () => {
    const section = makeSection([
      makeBand({ id: 'detail', type: 'detail', dataSource: 'items' }),
      makeBand({ id: 'nodata', type: 'noData' }),
    ]);
    const result = await expandBands(section, { items: [] }, engine, 1);
    expect(result.contentBands).toHaveLength(1);
    expect(result.contentBands[0]!.band.id).toBe('nodata');
  });

  it('excludes noData when detail has items', async () => {
    const section = makeSection([
      makeBand({ id: 'detail', type: 'detail', dataSource: 'items' }),
      makeBand({ id: 'nodata', type: 'noData' }),
    ]);
    const result = await expandBands(section, { items: ['a'] }, engine, 1);
    const ids = result.contentBands.map((b) => b.band.id);
    expect(ids).not.toContain('nodata');
  });

  it('includes noData when no detail bands exist', async () => {
    const section = makeSection([
      makeBand({ id: 'nodata', type: 'noData' }),
      makeBand({ id: 'body1', type: 'body' }),
    ]);
    const result = await expandBands(section, {}, engine, 1);
    const ids = result.contentBands.map((b) => b.band.id);
    expect(ids).toContain('nodata');
  });
});

describe('expandBands: band conditions', () => {
  it('excludes band when condition is false', async () => {
    const section = makeSection([makeBand({ id: 'body1', type: 'body', condition: 'showBody' })]);
    const result = await expandBands(section, { showBody: false }, engine, 1);
    expect(result.contentBands).toHaveLength(0);
  });

  it('includes band when condition is true', async () => {
    const section = makeSection([makeBand({ id: 'body1', type: 'body', condition: 'showBody' })]);
    const result = await expandBands(section, { showBody: true }, engine, 1);
    expect(result.contentBands).toHaveLength(1);
  });

  it('evaluates comparison conditions', async () => {
    const section = makeSection([
      makeBand({ id: 'body1', type: 'body', condition: 'total > 100' }),
    ]);
    const result = await expandBands(section, { total: 200 }, engine, 1);
    expect(result.contentBands).toHaveLength(1);
  });
});

describe('expandBands: pageBreakBefore', () => {
  it('preserves pageBreakBefore on band instances', async () => {
    const section = makeSection([makeBand({ id: 'body1', type: 'body', pageBreakBefore: true })]);
    const result = await expandBands(section, {}, engine, 1);
    expect(result.contentBands[0]!.band.pageBreakBefore).toBe(true);
  });
});

describe('expandBands: groupBy', () => {
  it('groups items and inserts group headers/footers', async () => {
    const section = makeSection([
      makeBand({ id: 'gh', type: 'groupHeader' }),
      makeBand({
        id: 'detail',
        type: 'detail',
        dataSource: 'items',
        groupBy: 'category',
      }),
      makeBand({ id: 'gf', type: 'groupFooter' }),
    ]);
    const data = {
      items: [
        { name: 'A', category: 'X' },
        { name: 'B', category: 'X' },
        { name: 'C', category: 'Y' },
      ],
    };
    const result = await expandBands(section, data, engine, 1);
    const ids = result.contentBands.map((b) => b.band.id);
    // Group X: gh, detail, detail, gf
    // Group Y: gh, detail, gf
    expect(ids).toEqual(['gh', 'detail', 'detail', 'gf', 'gh', 'detail', 'gf']);
  });

  it('sets _groupKey in group header scope', async () => {
    const section = makeSection([
      makeBand({ id: 'gh', type: 'groupHeader' }),
      makeBand({
        id: 'detail',
        type: 'detail',
        dataSource: 'items',
        groupBy: 'type',
      }),
    ]);
    const data = {
      items: [
        { name: 'A', type: 'widgets' },
        { name: 'B', type: 'gadgets' },
      ],
    };
    const result = await expandBands(section, data, engine, 1);
    // First band is group header for 'widgets'
    expect(result.contentBands[0]!.scope['_groupKey']).toBe('widgets');
  });

  it('handles single group', async () => {
    const section = makeSection([
      makeBand({ id: 'gh', type: 'groupHeader' }),
      makeBand({
        id: 'detail',
        type: 'detail',
        dataSource: 'items',
        groupBy: 'cat',
      }),
      makeBand({ id: 'gf', type: 'groupFooter' }),
    ]);
    const data = {
      items: [
        { name: 'A', cat: 'X' },
        { name: 'B', cat: 'X' },
      ],
    };
    const result = await expandBands(section, data, engine, 1);
    const ids = result.contentBands.map((b) => b.band.id);
    expect(ids).toEqual(['gh', 'detail', 'detail', 'gf']);
  });
});

describe('expandBands: scope', () => {
  it('includes _pageNumber and _totalPages in scope', async () => {
    const section = makeSection([makeBand({ id: 'body1', type: 'body' })]);
    const result = await expandBands(section, {}, engine, 5);
    expect(result.contentBands[0]!.scope['_totalPages']).toBe(5);
  });

  it('includes data properties in scope', async () => {
    const section = makeSection([makeBand({ id: 'body1', type: 'body' })]);
    const result = await expandBands(section, { company: 'Acme' }, engine, 1);
    expect(result.contentBands[0]!.scope['company']).toBe('Acme');
  });

  it('uses _pageNumber=0 during expansion (actual page assigned during layout)', async () => {
    // Band conditions that reference _pageNumber will see 0 during expansion,
    // because the actual page number is not known until the layout phase.
    const section = makeSection([makeBand({ id: 'body1', type: 'body' })]);
    const result = await expandBands(section, {}, engine, 3);
    expect(result.contentBands[0]!.scope['_pageNumber']).toBe(0);
  });

  it('band condition on _pageNumber evaluates against expansion-time value (0)', async () => {
    // A condition like "_pageNumber > 0" will be false during expansion since _pageNumber=0.
    // This documents that page-number-dependent conditions are not supported at the band level.
    const section = makeSection([
      makeBand({ id: 'body1', type: 'body', condition: '_pageNumber > 0' }),
    ]);
    const result = await expandBands(section, {}, engine, 5);
    // Band is excluded because _pageNumber=0 during expansion
    expect(result.contentBands).toHaveLength(0);
  });
});
