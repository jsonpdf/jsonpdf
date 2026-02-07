import type { Band, Section } from '@jsonpdf/core';
import type { ExpressionEngine } from './expression.js';
import { resolveDotPath, buildScope } from './data.js';

/** A band instance with its associated Liquid scope. */
export interface BandInstance {
  band: Band;
  scope: Record<string, unknown>;
}

/** Bands separated by their structural role within a section. */
export interface ExpandedSection {
  pageHeaderBands: Band[];
  pageFooterBands: Band[];
  lastPageFooterBands: Band[];
  columnHeaderBands: Band[];
  columnFooterBands: Band[];
  backgroundBands: Band[];
  contentBands: BandInstance[];
}

/**
 * Expand a section's bands into structural roles and ordered content instances.
 *
 * Content band ordering: title → [groupHeader → detail items → groupFooter] → body → summary
 * NoData bands are included only when there are no detail items (or no detail bands at all).
 */
export async function expandBands(
  section: Section,
  data: Record<string, unknown>,
  engine: ExpressionEngine,
  totalPages: number,
): Promise<ExpandedSection> {
  const result: ExpandedSection = {
    pageHeaderBands: [],
    pageFooterBands: [],
    lastPageFooterBands: [],
    columnHeaderBands: [],
    columnFooterBands: [],
    backgroundBands: [],
    contentBands: [],
  };

  // Separate structural bands
  const titleBands: Band[] = [];
  const detailBands: Band[] = [];
  const bodyBands: Band[] = [];
  const summaryBands: Band[] = [];
  const noDataBands: Band[] = [];
  const groupHeaderBands: Band[] = [];
  const groupFooterBands: Band[] = [];

  for (const band of section.bands) {
    switch (band.type) {
      case 'pageHeader':
        result.pageHeaderBands.push(band);
        break;
      case 'pageFooter':
        result.pageFooterBands.push(band);
        break;
      case 'lastPageFooter':
        result.lastPageFooterBands.push(band);
        break;
      case 'columnHeader':
        result.columnHeaderBands.push(band);
        break;
      case 'columnFooter':
        result.columnFooterBands.push(band);
        break;
      case 'background':
        result.backgroundBands.push(band);
        break;
      case 'title':
        titleBands.push(band);
        break;
      case 'detail':
        detailBands.push(band);
        break;
      case 'body':
        bodyBands.push(band);
        break;
      case 'summary':
        summaryBands.push(band);
        break;
      case 'noData':
        noDataBands.push(band);
        break;
      case 'groupHeader':
        groupHeaderBands.push(band);
        break;
      case 'groupFooter':
        groupFooterBands.push(band);
        break;
    }
  }

  const baseScope = buildScope(data, 0, totalPages);

  // Title bands (first in content order)
  for (const band of titleBands) {
    if (await shouldInclude(band, baseScope, engine)) {
      result.contentBands.push({ band, scope: baseScope });
    }
  }

  // Detail bands with iteration
  let hasDetailItems = false;
  for (const band of detailBands) {
    if (!band.dataSource) {
      throw new Error(`Detail band "${band.id}" must have a dataSource property`);
    }

    const sourceArray = resolveDotPath(data, band.dataSource);
    if (!Array.isArray(sourceArray) || sourceArray.length === 0) {
      continue;
    }

    hasDetailItems = true;
    const itemName = band.itemName ?? 'item';

    if (band.groupBy) {
      // Group the array
      const groups = groupByKey(sourceArray, band.groupBy);
      for (const group of groups) {
        const groupScope = {
          ...baseScope,
          _groupKey: group.key,
          _groupItems: group.items,
        };

        // Group headers
        for (const gh of groupHeaderBands) {
          if (await shouldInclude(gh, groupScope, engine)) {
            result.contentBands.push({ band: gh, scope: groupScope });
          }
        }

        // Detail items within group
        for (let i = 0; i < group.items.length; i++) {
          const itemScope = buildScope(data, 0, totalPages, {
            item: group.items[i],
            itemName,
            index: i,
          });
          itemScope['_groupKey'] = group.key;
          if (await shouldInclude(band, itemScope, engine)) {
            result.contentBands.push({ band, scope: itemScope });
          }
        }

        // Group footers
        for (const gf of groupFooterBands) {
          if (await shouldInclude(gf, groupScope, engine)) {
            result.contentBands.push({ band: gf, scope: groupScope });
          }
        }
      }
    } else {
      // Simple iteration
      for (let i = 0; i < sourceArray.length; i++) {
        const itemScope = buildScope(data, 0, totalPages, {
          item: sourceArray[i],
          itemName,
          index: i,
        });
        if (await shouldInclude(band, itemScope, engine)) {
          result.contentBands.push({ band, scope: itemScope });
        }
      }
    }
  }

  // NoData bands (only when no detail items were produced)
  if (!hasDetailItems && noDataBands.length > 0) {
    for (const band of noDataBands) {
      if (await shouldInclude(band, baseScope, engine)) {
        result.contentBands.push({ band, scope: baseScope });
      }
    }
  }

  // Body bands
  for (const band of bodyBands) {
    if (await shouldInclude(band, baseScope, engine)) {
      result.contentBands.push({ band, scope: baseScope });
    }
  }

  // Summary bands (last in content order)
  for (const band of summaryBands) {
    if (await shouldInclude(band, baseScope, engine)) {
      result.contentBands.push({ band, scope: baseScope });
    }
  }

  return result;
}

/** Check if a band should be included based on its condition. */
async function shouldInclude(
  band: Band,
  scope: Record<string, unknown>,
  engine: ExpressionEngine,
): Promise<boolean> {
  if (!band.condition) return true;
  return engine.evaluate(band.condition, scope);
}

interface Group {
  key: string;
  items: unknown[];
}

/** Group an array by a property path. */
function groupByKey(array: unknown[], keyPath: string): Group[] {
  const groupMap = new Map<string, unknown[]>();
  const groupOrder: string[] = [];

  for (const item of array) {
    let key: string;
    if (item !== null && typeof item === 'object') {
      const val = (item as Record<string, unknown>)[keyPath];
      if (typeof val === 'string') key = val;
      else if (typeof val === 'number' || typeof val === 'boolean') key = String(val);
      else key = '';
    } else {
      key = '';
    }

    if (!groupMap.has(key)) {
      groupMap.set(key, []);
      groupOrder.push(key);
    }
    const items = groupMap.get(key);
    if (items) items.push(item);
  }

  return groupOrder.map((key) => ({ key, items: groupMap.get(key) ?? [] }));
}
