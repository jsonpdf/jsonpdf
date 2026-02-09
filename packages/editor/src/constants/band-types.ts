import type { BandType } from '@jsonpdf/core';

export interface BandTypeMeta {
  label: string;
  abbreviation: string;
  fill: string;
}

export const BAND_TYPE_META: Record<BandType, BandTypeMeta> = {
  title: {
    label: 'Title',
    abbreviation: 'TI',
    fill: 'rgba(16, 185, 129, 0.08)',
  },
  pageHeader: {
    label: 'Page Header',
    abbreviation: 'PH',
    fill: 'rgba(59, 130, 246, 0.08)',
  },
  pageFooter: {
    label: 'Page Footer',
    abbreviation: 'PF',
    fill: 'rgba(59, 130, 246, 0.08)',
  },
  lastPageFooter: {
    label: 'Last Page Footer',
    abbreviation: 'LF',
    fill: 'rgba(59, 130, 246, 0.05)',
  },
  columnHeader: {
    label: 'Column Header',
    abbreviation: 'CH',
    fill: 'rgba(59, 130, 246, 0.05)',
  },
  detail: {
    label: 'Detail',
    abbreviation: 'DT',
    fill: 'rgba(249, 115, 22, 0.08)',
  },
  columnFooter: {
    label: 'Column Footer',
    abbreviation: 'CF',
    fill: 'rgba(59, 130, 246, 0.05)',
  },
  summary: {
    label: 'Summary',
    abbreviation: 'SM',
    fill: 'rgba(236, 72, 153, 0.08)',
  },
  body: {
    label: 'Body',
    abbreviation: 'BD',
    fill: 'rgba(139, 92, 246, 0.08)',
  },
  background: {
    label: 'Background',
    abbreviation: 'BG',
    fill: 'rgba(107, 114, 128, 0.05)',
  },
  noData: {
    label: 'No Data',
    abbreviation: 'ND',
    fill: 'rgba(239, 68, 68, 0.08)',
  },
  groupHeader: {
    label: 'Group Header',
    abbreviation: 'GH',
    fill: 'rgba(234, 179, 8, 0.08)',
  },
  groupFooter: {
    label: 'Group Footer',
    abbreviation: 'GF',
    fill: 'rgba(234, 179, 8, 0.05)',
  },
};

/** Band types that allow only 0 or 1 instance per section. */
export const SINGULAR_BAND_TYPES: ReadonlySet<BandType> = new Set<BandType>([
  'title',
  'pageHeader',
  'pageFooter',
  'lastPageFooter',
  'columnHeader',
  'columnFooter',
  'summary',
  'background',
  'noData',
]);

/** Display order for bands in the outline (matches renderer rendering order). */
export const BAND_DISPLAY_ORDER: readonly BandType[] = [
  'background',
  'title',
  'pageHeader',
  'columnHeader',
  'groupHeader',
  'detail',
  'groupFooter',
  'columnFooter',
  'body',
  'noData',
  'summary',
  'pageFooter',
  'lastPageFooter',
];
