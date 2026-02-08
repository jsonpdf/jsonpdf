import type { Template, Band, BandType, PageConfig } from '@jsonpdf/core';
import { mergePageConfig } from './merge-page-config';

export interface DesignPage {
  sectionIndex: number;
  sectionId: string;
  pageConfig: PageConfig;
  bands: DesignBand[];
  totalHeight: number;
  /** Computed design-time page height: margins.top + totalHeight + margins.bottom. */
  designHeight: number;
}

export interface DesignBand {
  band: Band;
  offsetY: number;
  height: number;
}

/** Band display order for the design canvas. */
const BAND_DISPLAY_ORDER: BandType[] = [
  'background',
  'pageHeader',
  'columnHeader',
  'title',
  'groupHeader',
  'detail',
  'groupFooter',
  'body',
  'summary',
  'noData',
  'columnFooter',
  'pageFooter',
  'lastPageFooter',
];

function bandSortKey(type: BandType): number {
  const idx = BAND_DISPLAY_ORDER.indexOf(type);
  return idx === -1 ? BAND_DISPLAY_ORDER.length : idx;
}

/**
 * Compute the design-time layout for the template canvas.
 * This is a simplified layout — no data binding, no page breaks.
 * Each section produces one "design page" with all bands visible.
 */
export function computeDesignLayout(template: Template): DesignPage[] {
  return template.sections.map((section, sectionIndex) => {
    const pageConfig = mergePageConfig(template.page, section.page);

    // Sort bands by display order, preserving relative order within same type
    const sorted = [...section.bands].sort((a, b) => bandSortKey(a.type) - bandSortKey(b.type));

    let offsetY = 0;
    const bands: DesignBand[] = sorted.map((band) => {
      const db: DesignBand = { band, offsetY, height: band.height };
      offsetY += band.height;
      return db;
    });

    const totalHeight = offsetY;
    const designHeight = pageConfig.margins.top + totalHeight + pageConfig.margins.bottom;

    return {
      sectionIndex,
      sectionId: section.id,
      pageConfig,
      bands,
      totalHeight,
      designHeight,
    };
  });
}
