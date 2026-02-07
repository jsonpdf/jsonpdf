import type { PDFDocument } from 'pdf-lib';
import type { Template, Band, PageConfig, Style } from '@jsonpdf/core';
import type { FontMap, Plugin, ImageCache } from '@jsonpdf/plugins';
import { createMeasureContext } from './context.js';
import { resolveElementStyle, normalizePadding } from './style-resolver.js';
import type { ExpressionEngine } from './expression.js';
import { expandBands } from './band-expander.js';
import type { BandInstance, ExpandedSection } from './band-expander.js';

export interface LayoutBand {
  band: Band;
  offsetY: number;
  measuredHeight: number;
  elementHeights: Map<string, number>;
  scope: Record<string, unknown>;
}

export interface LayoutPage {
  sectionIndex: number;
  pageIndex: number;
  bands: LayoutBand[];
}

export interface LayoutResult {
  pages: LayoutPage[];
  totalPages: number;
}

/** Merge section-level page config overrides with the template-level defaults. */
export function mergePageConfig(base: PageConfig, override?: Partial<PageConfig>): PageConfig {
  if (!override) return base;
  return {
    ...base,
    ...override,
    margins: { ...base.margins, ...(override.margins ?? {}) },
  };
}

interface BandMeasurement {
  height: number;
  elementHeights: Map<string, number>;
}

/** Measure a single band's height. Returns the measured height and per-element heights. */
async function measureBand(
  band: Band,
  fonts: FontMap,
  styles: Record<string, Style>,
  getPlugin: (type: string) => Plugin,
  pdfDoc: PDFDocument,
  imageCache: ImageCache,
): Promise<BandMeasurement> {
  const elementHeights = new Map<string, number>();
  let bandHeight = band.height;

  if (band.autoHeight) {
    let maxElementBottom = band.height;
    for (const element of band.elements) {
      const plugin = getPlugin(element.type);
      const props = plugin.resolveProps(element.properties);
      const propErrors = plugin.validate(props);
      if (propErrors.length > 0) {
        const messages = propErrors.map((e) => `${e.path}: ${e.message}`).join('; ');
        throw new Error(
          `Invalid properties for ${element.type} element "${element.id}": ${messages}`,
        );
      }
      const measureCtx = createMeasureContext(element, fonts, styles, pdfDoc, imageCache);
      const measured = await plugin.measure(props, measureCtx);
      // measured.height is the content height (within padding-adjusted space).
      // Store the total element height (content + padding) so createRenderContext
      // can correctly subtract padding without double-counting.
      const padding = normalizePadding(resolveElementStyle(element, styles).padding);
      const totalElementHeight = measured.height + padding.top + padding.bottom;
      elementHeights.set(element.id, totalElementHeight);
      const elementBottom = element.y + totalElementHeight;
      maxElementBottom = Math.max(maxElementBottom, elementBottom);
    }
    bandHeight = maxElementBottom;
  }

  return { height: bandHeight, elementHeights };
}

/** Measure a list of bands. Returns total height and per-band measurements. */
async function measureBandList(
  bands: Band[],
  fonts: FontMap,
  styles: Record<string, Style>,
  getPlugin: (type: string) => Plugin,
  pdfDoc: PDFDocument,
  imageCache: ImageCache,
): Promise<{ total: number; measurements: BandMeasurement[] }> {
  const measurements: BandMeasurement[] = [];
  let total = 0;
  for (const band of bands) {
    const result = await measureBand(band, fonts, styles, getPlugin, pdfDoc, imageCache);
    measurements.push(result);
    total += result.height;
  }
  return { total, measurements };
}

/** Create a LayoutBand from a band with measurement results. */
function createLayoutBand(
  band: Band,
  offsetY: number,
  measurement: BandMeasurement,
  scope: Record<string, unknown>,
): LayoutBand {
  return {
    band,
    offsetY,
    measuredHeight: measurement.height,
    elementHeights: measurement.elementHeights,
    scope,
  };
}

/**
 * Layout a template across multiple pages.
 *
 * Handles all 13 band types, multi-section support, page breaks,
 * and content overflow. Each LayoutBand carries its Liquid scope
 * for expression resolution during rendering.
 */
export async function layoutTemplate(
  template: Template,
  fonts: FontMap,
  getPlugin: (type: string) => Plugin,
  engine: ExpressionEngine,
  data: Record<string, unknown>,
  totalPagesHint: number,
  pdfDoc: PDFDocument,
  imageCache: ImageCache,
): Promise<LayoutResult> {
  const allPages: LayoutPage[] = [];
  let globalPageIndex = 0;

  for (const [sectionIndex, section] of template.sections.entries()) {
    const pageConfig = mergePageConfig(template.page, section.page);
    const expanded = await expandBands(section, data, engine, totalPagesHint);

    const sectionPages = await layoutSection(
      sectionIndex,
      pageConfig,
      expanded,
      template.styles,
      fonts,
      getPlugin,
      globalPageIndex,
      totalPagesHint,
      pdfDoc,
      imageCache,
    );

    allPages.push(...sectionPages);
    globalPageIndex += sectionPages.length;
  }

  return { pages: allPages, totalPages: allPages.length };
}

async function layoutSection(
  sectionIndex: number,
  pageConfig: PageConfig,
  expanded: ExpandedSection,
  styles: Record<string, Style>,
  fonts: FontMap,
  getPlugin: (type: string) => Plugin,
  globalPageOffset: number,
  totalPagesHint: number,
  pdfDoc: PDFDocument,
  imageCache: ImageCache,
): Promise<LayoutPage[]> {
  // Measure structural band heights (storing per-band measurements)
  const pageHeaderResult = await measureBandList(
    expanded.pageHeaderBands, fonts, styles, getPlugin, pdfDoc, imageCache,
  );
  const pageFooterResult = await measureBandList(
    expanded.pageFooterBands, fonts, styles, getPlugin, pdfDoc, imageCache,
  );
  const lastPageFooterResult = await measureBandList(
    expanded.lastPageFooterBands, fonts, styles, getPlugin, pdfDoc, imageCache,
  );
  const columnHeaderResult = await measureBandList(
    expanded.columnHeaderBands, fonts, styles, getPlugin, pdfDoc, imageCache,
  );
  const columnFooterResult = await measureBandList(
    expanded.columnFooterBands, fonts, styles, getPlugin, pdfDoc, imageCache,
  );
  const backgroundResult = await measureBandList(
    expanded.backgroundBands, fonts, styles, getPlugin, pdfDoc, imageCache,
  );

  const pageHeaderHeight = pageHeaderResult.total;
  const pageFooterHeight = pageFooterResult.total;
  const lastPageFooterHeight = lastPageFooterResult.total;
  const columnHeaderHeight = columnHeaderResult.total;
  const columnFooterHeight = columnFooterResult.total;

  const totalVerticalMargins = pageConfig.margins.top + pageConfig.margins.bottom;

  // Use the larger footer height to prevent content overlap on the last page
  const effectiveFooterHeight = Math.max(pageFooterHeight, lastPageFooterHeight);

  // Content area = page minus margins, header, effective footer
  const contentAreaHeight =
    pageConfig.height - totalVerticalMargins - pageHeaderHeight - effectiveFooterHeight;

  // Available space for content bands (after column headers)
  const availableContentHeight = contentAreaHeight - columnHeaderHeight;

  if (expanded.contentBands.length === 0) {
    return [];
  }

  const pages: LayoutPage[] = [];
  let currentBands: LayoutBand[] = [];
  // cursorY tracks content band offset only (does NOT include column header height).
  // cursorY > 0 means at least one content band has been placed on the current page.
  let cursorY = 0;

  function startNewPage(): void {
    pages.push({
      sectionIndex,
      pageIndex: globalPageOffset + pages.length,
      bands: currentBands,
    });
    currentBands = [];
    cursorY = 0;
  }

  // Place page header bands at top of page
  function placePageHeaders(scope: Record<string, unknown>): void {
    let offsetY = 0;
    for (let i = 0; i < expanded.pageHeaderBands.length; i++) {
      const band = expanded.pageHeaderBands[i];
      const m = pageHeaderResult.measurements[i];
      currentBands.push(createLayoutBand(band, offsetY, m, scope));
      offsetY += m.height;
    }
  }

  // Place column headers after page header (does not advance cursorY)
  function placeColumnHeaders(scope: Record<string, unknown>): void {
    let offsetY = 0;
    for (let i = 0; i < expanded.columnHeaderBands.length; i++) {
      const band = expanded.columnHeaderBands[i];
      const m = columnHeaderResult.measurements[i];
      currentBands.push(createLayoutBand(band, pageHeaderHeight + offsetY, m, scope));
      offsetY += m.height;
    }
  }

  // Finalize a page by adding footer/background bands
  function finalizePage(scope: Record<string, unknown>, isLastPage: boolean): void {
    // Background bands must be rendered first (behind everything).
    // Prepend them to the beginning of the bands array so the renderer
    // draws them before any content.
    const bgBands: LayoutBand[] = [];
    for (let i = 0; i < expanded.backgroundBands.length; i++) {
      const band = expanded.backgroundBands[i];
      const m = backgroundResult.measurements[i];
      bgBands.push(createLayoutBand(band, 0, m, scope));
    }
    currentBands.unshift(...bgBands);

    // Determine which footer to use
    const useLastFooter = isLastPage && expanded.lastPageFooterBands.length > 0;
    const footerBands = useLastFooter ? expanded.lastPageFooterBands : expanded.pageFooterBands;
    const footerMeasurements = useLastFooter
      ? lastPageFooterResult.measurements
      : pageFooterResult.measurements;
    const footerTotalHeight = useLastFooter ? lastPageFooterHeight : pageFooterHeight;

    // Place column footers before page footer
    let columnFooterOffset =
      pageConfig.height - totalVerticalMargins - footerTotalHeight - columnFooterHeight;
    for (let i = 0; i < expanded.columnFooterBands.length; i++) {
      const band = expanded.columnFooterBands[i];
      const m = columnFooterResult.measurements[i];
      currentBands.push(createLayoutBand(band, columnFooterOffset, m, scope));
      columnFooterOffset += m.height;
    }

    // Place page footer at bottom
    let footerOffset = pageConfig.height - totalVerticalMargins - footerTotalHeight;
    for (let i = 0; i < footerBands.length; i++) {
      const band = footerBands[i];
      const m = footerMeasurements[i];
      currentBands.push(createLayoutBand(band, footerOffset, m, scope));
      footerOffset += m.height;
    }
  }

  // Get the scope for a content band (use its own scope, updated with page number)
  function pageScope(instance: BandInstance, pageIdx: number): Record<string, unknown> {
    return {
      ...instance.scope,
      _pageNumber: pageIdx + 1,
      _totalPages: totalPagesHint,
    };
  }

  // Start first page
  const firstScope = pageScope(expanded.contentBands[0], globalPageOffset + pages.length);
  placePageHeaders(firstScope);
  placeColumnHeaders(firstScope);

  // Place content bands
  let lastUsedInstance = expanded.contentBands[0];
  for (let i = 0; i < expanded.contentBands.length; i++) {
    const instance = expanded.contentBands[i];
    const measured = await measureBand(instance.band, fonts, styles, getPlugin, pdfDoc, imageCache);
    const bandHeight = measured.height;
    const scope = pageScope(instance, globalPageOffset + pages.length);

    // Forced page break
    if (instance.band.pageBreakBefore && cursorY > 0) {
      finalizePage(scope, false);
      startNewPage();
      const newScope = pageScope(instance, globalPageOffset + pages.length);
      placePageHeaders(newScope);
      placeColumnHeaders(newScope);
    }

    // Natural overflow: band doesn't fit on current page
    if (bandHeight > availableContentHeight - cursorY && cursorY > 0) {
      const prevScope = pageScope(lastUsedInstance, globalPageOffset + pages.length);
      finalizePage(prevScope, false);
      startNewPage();
      const newScope = pageScope(instance, globalPageOffset + pages.length);
      placePageHeaders(newScope);
      placeColumnHeaders(newScope);
    }

    // Place the content band (after page header + column headers + accumulated content)
    const contentOffsetY = pageHeaderHeight + columnHeaderHeight + cursorY;
    currentBands.push(createLayoutBand(instance.band, contentOffsetY, measured, scope));
    cursorY += bandHeight;
    lastUsedInstance = instance;
  }

  // Finalize last page
  const lastScope = pageScope(lastUsedInstance, globalPageOffset + pages.length);
  finalizePage(lastScope, true);
  startNewPage();

  return pages;
}
