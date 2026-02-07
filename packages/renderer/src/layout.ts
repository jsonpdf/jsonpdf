import type { PDFDocument } from 'pdf-lib';
import type { Template, Band, BandType, PageConfig, Style } from '@jsonpdf/core';
import type { FontMap, Plugin, ImageCache } from '@jsonpdf/plugins';
import { createMeasureContext } from './context.js';
import { resolveElementStyle, normalizePadding } from './style-resolver.js';
import type { ExpressionEngine } from './expression.js';
import { expandBands } from './band-expander.js';
import type { BandInstance, ExpandedSection } from './band-expander.js';
import { computeColumnLayout, type ColumnLayout } from './columns.js';

export interface LayoutBand {
  band: Band;
  offsetY: number;
  measuredHeight: number;
  elementHeights: Map<string, number>;
  scope: Record<string, unknown>;
  /** Column index (0-based). Undefined for full-width bands. */
  columnIndex?: number;
  /** X-offset from left margin for this column. */
  columnOffsetX?: number;
  /** Width of this column in points. */
  columnWidth?: number;
}

interface ColumnInfo {
  columnIndex: number;
  columnOffsetX: number;
  columnWidth: number;
}

export interface LayoutPage {
  sectionIndex: number;
  pageIndex: number;
  bands: LayoutBand[];
  /** Computed page height when autoHeight is enabled. */
  computedHeight?: number;
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
  columnInfo?: ColumnInfo,
): LayoutBand {
  return {
    band,
    offsetY,
    measuredHeight: measurement.height,
    elementHeights: measurement.elementHeights,
    scope,
    ...(columnInfo
      ? {
          columnIndex: columnInfo.columnIndex,
          columnOffsetX: columnInfo.columnOffsetX,
          columnWidth: columnInfo.columnWidth,
        }
      : {}),
  };
}

/** Column configuration extracted from a Section. */
interface SectionColumnConfig {
  columns: number;
  columnGap: number;
  columnWidths?: number[];
}

/** Check if a band type should be placed in columns (vs. full-width). */
function isColumnBandType(type: BandType): boolean {
  return type === 'detail' || type === 'groupHeader' || type === 'groupFooter';
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

    if (section.columnMode === 'flow') {
      throw new Error(
        `Section "${section.id}": columnMode "flow" is not implemented. Use "tile" or omit columnMode.`,
      );
    }

    const columnConfig: SectionColumnConfig = {
      columns: section.columns ?? 1,
      columnGap: section.columnGap ?? 0,
      columnWidths: section.columnWidths,
    };

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
      columnConfig,
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
  columnConfig: SectionColumnConfig,
): Promise<LayoutPage[]> {
  // Measure structural band heights (storing per-band measurements)
  const pageHeaderResult = await measureBandList(
    expanded.pageHeaderBands,
    fonts,
    styles,
    getPlugin,
    pdfDoc,
    imageCache,
  );
  const pageFooterResult = await measureBandList(
    expanded.pageFooterBands,
    fonts,
    styles,
    getPlugin,
    pdfDoc,
    imageCache,
  );
  const lastPageFooterResult = await measureBandList(
    expanded.lastPageFooterBands,
    fonts,
    styles,
    getPlugin,
    pdfDoc,
    imageCache,
  );
  const columnHeaderResult = await measureBandList(
    expanded.columnHeaderBands,
    fonts,
    styles,
    getPlugin,
    pdfDoc,
    imageCache,
  );
  const columnFooterResult = await measureBandList(
    expanded.columnFooterBands,
    fonts,
    styles,
    getPlugin,
    pdfDoc,
    imageCache,
  );
  const backgroundResult = await measureBandList(
    expanded.backgroundBands,
    fonts,
    styles,
    getPlugin,
    pdfDoc,
    imageCache,
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

  // Multi-column layout setup
  const numColumns = columnConfig.columns;
  const isMultiColumn = numColumns >= 2;
  const contentWidth = pageConfig.width - pageConfig.margins.left - pageConfig.margins.right;
  const colLayout: ColumnLayout | undefined = isMultiColumn
    ? computeColumnLayout(
        contentWidth,
        numColumns,
        columnConfig.columnGap,
        columnConfig.columnWidths,
      )
    : undefined;

  const pages: LayoutPage[] = [];
  let currentBands: LayoutBand[] = [];
  // cursorY tracks content band offset only (does NOT include column header height).
  // cursorY > 0 means at least one content band has been placed on the current page.
  let cursorY = 0;

  function startNewPage(): void {
    const page: LayoutPage = {
      sectionIndex,
      pageIndex: globalPageOffset + pages.length,
      bands: currentBands,
    };

    // Compute page height for autoHeight pages.
    // Footers are already in currentBands (finalizePage is called before startNewPage).
    if (pageConfig.autoHeight) {
      let maxBottom = 0;
      for (const lb of currentBands) {
        if (lb.band.type === 'background') continue;
        const bottom = lb.offsetY + lb.measuredHeight;
        if (bottom > maxBottom) maxBottom = bottom;
      }
      page.computedHeight = Math.max(
        pageConfig.margins.top + pageConfig.margins.bottom + maxBottom,
        pageConfig.height,
      );
    }

    pages.push(page);
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

  // Place column headers (single-column: once; multi-column: once per column)
  function placeColumnHeaders(scope: Record<string, unknown>): void {
    if (colLayout) {
      for (let col = 0; col < numColumns; col++) {
        let offsetY = 0;
        for (let i = 0; i < expanded.columnHeaderBands.length; i++) {
          const band = expanded.columnHeaderBands[i];
          const m = columnHeaderResult.measurements[i];
          currentBands.push(
            createLayoutBand(band, pageHeaderHeight + offsetY, m, scope, {
              columnIndex: col,
              columnOffsetX: colLayout.offsets[col],
              columnWidth: colLayout.widths[col],
            }),
          );
          offsetY += m.height;
        }
      }
    } else {
      let offsetY = 0;
      for (let i = 0; i < expanded.columnHeaderBands.length; i++) {
        const band = expanded.columnHeaderBands[i];
        const m = columnHeaderResult.measurements[i];
        currentBands.push(createLayoutBand(band, pageHeaderHeight + offsetY, m, scope));
        offsetY += m.height;
      }
    }
  }

  // Finalize a page by adding footer/background bands
  function finalizePage(scope: Record<string, unknown>, isLastPage: boolean): void {
    // Background bands must be rendered first (behind everything).
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

    // Compute footer placement origin
    let columnFooterStartOffset: number;
    let footerStartOffset: number;
    if (pageConfig.autoHeight) {
      const contentBottom = pageHeaderHeight + columnHeaderHeight + cursorY;
      columnFooterStartOffset = contentBottom;
      footerStartOffset = contentBottom + columnFooterHeight;
    } else {
      columnFooterStartOffset =
        pageConfig.height - totalVerticalMargins - footerTotalHeight - columnFooterHeight;
      footerStartOffset = pageConfig.height - totalVerticalMargins - footerTotalHeight;
    }

    // Place column footers (multi-column: per column; single-column: once)
    if (colLayout) {
      for (let col = 0; col < numColumns; col++) {
        let offset = columnFooterStartOffset;
        for (let i = 0; i < expanded.columnFooterBands.length; i++) {
          const band = expanded.columnFooterBands[i];
          const m = columnFooterResult.measurements[i];
          currentBands.push(
            createLayoutBand(band, offset, m, scope, {
              columnIndex: col,
              columnOffsetX: colLayout.offsets[col],
              columnWidth: colLayout.widths[col],
            }),
          );
          offset += m.height;
        }
      }
    } else {
      let offset = columnFooterStartOffset;
      for (let i = 0; i < expanded.columnFooterBands.length; i++) {
        const band = expanded.columnFooterBands[i];
        const m = columnFooterResult.measurements[i];
        currentBands.push(createLayoutBand(band, offset, m, scope));
        offset += m.height;
      }
    }

    // Place page footer (always full-width)
    let footerOffset = footerStartOffset;
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

  // Place a full-width content band, handling page breaks and overflow.
  // Returns the updated lastUsedInstance.
  async function placeFullWidthBand(
    instance: BandInstance,
    lastUsed: BandInstance,
  ): Promise<BandInstance> {
    const measured = await measureBand(instance.band, fonts, styles, getPlugin, pdfDoc, imageCache);
    const bandHeight = measured.height;
    const scope = pageScope(instance, globalPageOffset + pages.length);

    // Forced page break
    if (instance.band.pageBreakBefore && cursorY > 0) {
      finalizePage(scope, false);
      startNewPage();
      placePageHeaders(pageScope(instance, globalPageOffset + pages.length));
      placeColumnHeaders(pageScope(instance, globalPageOffset + pages.length));
    }

    // Natural overflow (skipped for autoHeight)
    if (!pageConfig.autoHeight && bandHeight > availableContentHeight - cursorY && cursorY > 0) {
      finalizePage(pageScope(lastUsed, globalPageOffset + pages.length), false);
      startNewPage();
      placePageHeaders(pageScope(instance, globalPageOffset + pages.length));
      placeColumnHeaders(pageScope(instance, globalPageOffset + pages.length));
    }

    const contentOffsetY = pageHeaderHeight + columnHeaderHeight + cursorY;
    currentBands.push(createLayoutBand(instance.band, contentOffsetY, measured, scope));
    cursorY += bandHeight;
    return instance;
  }

  // Start first page
  const firstScope = pageScope(expanded.contentBands[0], globalPageOffset + pages.length);
  placePageHeaders(firstScope);
  placeColumnHeaders(firstScope);

  let lastUsedInstance = expanded.contentBands[0];

  if (isMultiColumn && colLayout) {
    // ─── Multi-column tile mode ───
    // Split content bands into three phases:
    //   Pre-column (full-width): title bands
    //   Column region: detail, groupHeader, groupFooter bands
    //   Post-column (full-width): body, summary, noData bands

    // Find phase boundaries
    let columnRegionStart = 0;
    let columnRegionEnd = expanded.contentBands.length;

    // Pre-column: title bands at the start
    while (
      columnRegionStart < expanded.contentBands.length &&
      expanded.contentBands[columnRegionStart].band.type === 'title'
    ) {
      columnRegionStart++;
    }
    // Post-column: body/summary/noData bands at the end
    while (
      columnRegionEnd > columnRegionStart &&
      !isColumnBandType(expanded.contentBands[columnRegionEnd - 1].band.type)
    ) {
      columnRegionEnd--;
    }

    // Phase 1: Pre-column (title bands) — full-width
    for (let i = 0; i < columnRegionStart; i++) {
      lastUsedInstance = await placeFullWidthBand(expanded.contentBands[i], lastUsedInstance);
    }

    // Phase 2: Column region — tile across columns
    const columnCursors = new Array<number>(numColumns).fill(0);
    let currentCol = 0;

    function startNewColumnPage(prev: BandInstance, next: BandInstance): void {
      finalizePage(pageScope(prev, globalPageOffset + pages.length), false);
      startNewPage();
      const newScope = pageScope(next, globalPageOffset + pages.length);
      placePageHeaders(newScope);
      placeColumnHeaders(newScope);
      columnCursors.fill(0);
      currentCol = 0;
    }

    for (let i = columnRegionStart; i < columnRegionEnd; i++) {
      const instance = expanded.contentBands[i];
      const measured = await measureBand(
        instance.band,
        fonts,
        styles,
        getPlugin,
        pdfDoc,
        imageCache,
      );
      const bandHeight = measured.height;
      const scope = pageScope(instance, globalPageOffset + pages.length);

      // Forced page break
      if (instance.band.pageBreakBefore) {
        const hasAnyContent = columnCursors.some((c) => c > 0) || cursorY > 0;
        if (hasAnyContent) {
          startNewColumnPage(lastUsedInstance, instance);
        }
      }

      // Check if band fits in current column
      if (
        !pageConfig.autoHeight &&
        bandHeight > availableContentHeight - cursorY - columnCursors[currentCol]
      ) {
        // Try next columns
        let found = false;
        for (let col = currentCol + 1; col < numColumns; col++) {
          if (bandHeight <= availableContentHeight - cursorY - columnCursors[col]) {
            currentCol = col;
            found = true;
            break;
          }
        }
        if (!found) {
          // All columns full — start new page (only if there's existing content)
          if (columnCursors.some((c) => c > 0) || cursorY > 0) {
            startNewColumnPage(lastUsedInstance, instance);
          }
        }
      }

      // Place band in current column
      const colOffsetY =
        pageHeaderHeight + columnHeaderHeight + cursorY + columnCursors[currentCol];
      currentBands.push(
        createLayoutBand(instance.band, colOffsetY, measured, scope, {
          columnIndex: currentCol,
          columnOffsetX: colLayout.offsets[currentCol],
          columnWidth: colLayout.widths[currentCol],
        }),
      );
      columnCursors[currentCol] += bandHeight;
      lastUsedInstance = instance;
    }

    // Resume full-width cursor from tallest column
    cursorY += Math.max(0, ...columnCursors);

    // Phase 3: Post-column (body/summary/noData bands) — full-width
    for (let i = columnRegionEnd; i < expanded.contentBands.length; i++) {
      lastUsedInstance = await placeFullWidthBand(expanded.contentBands[i], lastUsedInstance);
    }
  } else {
    // ─── Single-column layout ───
    for (let i = 0; i < expanded.contentBands.length; i++) {
      lastUsedInstance = await placeFullWidthBand(expanded.contentBands[i], lastUsedInstance);
    }
  }

  // Finalize last page
  const lastScope = pageScope(lastUsedInstance, globalPageOffset + pages.length);
  finalizePage(lastScope, true);
  startNewPage();

  return pages;
}
