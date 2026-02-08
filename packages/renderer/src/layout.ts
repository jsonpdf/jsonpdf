import type { PDFDocument } from 'pdf-lib';
import type { Element, Template, Band, BandType, PageConfig, Section, Style } from '@jsonpdf/core';
import type { FontMap, Plugin, ImageCache } from '@jsonpdf/plugins';
import { createMeasureContext } from './context.js';
import { resolveElementStyle, normalizePadding } from './style-resolver.js';
import type { ExpressionEngine } from './expression.js';
import { expandBands } from './band-expander.js';
import type { BandInstance, ExpandedSection } from './band-expander.js';
import { computeColumnLayout, type ColumnLayout } from './columns.js';

/** Maximum nesting depth for container elements to prevent infinite recursion. */
export const MAX_CONTAINER_DEPTH = 10;

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

/** A bookmark entry collected during layout for TOC generation. */
export interface BookmarkLayoutEntry {
  /** Display title. */
  title: string;
  /** 1-based page number. */
  pageNumber: number;
  /** Nesting level: 0 = section, 1 = band. */
  level: number;
}

export interface LayoutResult {
  pages: LayoutPage[];
  totalPages: number;
  /** Bookmarks collected during layout (for _bookmarks data source). */
  bookmarks: BookmarkLayoutEntry[];
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

/** Context for frame measurement support during the layout pass. */
interface FrameMeasureCtx {
  engine: ExpressionEngine;
  data: Record<string, unknown>;
  totalPagesHint: number;
}

/**
 * Create a measureBands callback for frame elements during the layout pass.
 * Expands the frame's bands and measures each expanded content band.
 */
function createFrameMeasureBands(
  fonts: FontMap,
  styles: Record<string, Style>,
  getPlugin: (type: string) => Plugin,
  pdfDoc: PDFDocument,
  imageCache: ImageCache,
  fCtx: FrameMeasureCtx,
): (bands: Band[]) => Promise<{ totalHeight: number }> {
  return async (bands: Band[]) => {
    const pseudoSection: Section = { id: '__frame', bands };
    const expanded = await expandBands(pseudoSection, fCtx.data, fCtx.engine, fCtx.totalPagesHint);
    let totalHeight = 0;
    for (const instance of expanded.contentBands) {
      const m = await measureBand(
        instance.band,
        fonts,
        styles,
        getPlugin,
        pdfDoc,
        imageCache,
        fCtx,
      );
      totalHeight += m.height;
    }
    return { totalHeight };
  };
}

/**
 * Create a measureChild callback for container elements during the layout pass.
 * This allows the container plugin to measure its children during band autoHeight computation.
 */
function createLayoutMeasureChild(
  fonts: FontMap,
  styles: Record<string, Style>,
  getPlugin: (type: string) => Plugin,
  pdfDoc: PDFDocument,
  imageCache: ImageCache,
  depth: number = 0,
  fCtx?: FrameMeasureCtx,
): (element: Element) => Promise<{ width: number; height: number }> {
  return async (childEl: Element) => {
    if (depth + 1 > MAX_CONTAINER_DEPTH) {
      throw new Error('Maximum container nesting depth exceeded');
    }
    const plugin = getPlugin(childEl.type);
    const props = plugin.resolveProps(childEl.properties);
    const measureCtx = createMeasureContext(childEl, fonts, styles, pdfDoc, imageCache);
    if (childEl.elements?.length) {
      measureCtx.children = childEl.elements;
      measureCtx.measureChild = createLayoutMeasureChild(
        fonts,
        styles,
        getPlugin,
        pdfDoc,
        imageCache,
        depth + 1,
        fCtx,
      );
    }
    // Provide measureBands callback for frame elements
    if (childEl.type === 'frame' && fCtx) {
      measureCtx.measureBands = createFrameMeasureBands(
        fonts,
        styles,
        getPlugin,
        pdfDoc,
        imageCache,
        fCtx,
      );
    }
    return plugin.measure(props, measureCtx);
  };
}

/** Measure a single band's height. Returns the measured height and per-element heights. */
async function measureBand(
  band: Band,
  fonts: FontMap,
  styles: Record<string, Style>,
  getPlugin: (type: string) => Plugin,
  pdfDoc: PDFDocument,
  imageCache: ImageCache,
  fCtx?: FrameMeasureCtx,
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
      // Provide child measurement for container elements
      if (element.elements?.length) {
        measureCtx.children = element.elements;
        measureCtx.measureChild = createLayoutMeasureChild(
          fonts,
          styles,
          getPlugin,
          pdfDoc,
          imageCache,
          0,
          fCtx,
        );
      }
      // Provide measureBands callback for frame elements
      if (element.type === 'frame' && fCtx) {
        measureCtx.measureBands = createFrameMeasureBands(
          fonts,
          styles,
          getPlugin,
          pdfDoc,
          imageCache,
          fCtx,
        );
      }
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
  fCtx?: FrameMeasureCtx,
): Promise<{ total: number; measurements: BandMeasurement[] }> {
  const measurements: BandMeasurement[] = [];
  let total = 0;
  for (const band of bands) {
    const result = await measureBand(band, fonts, styles, getPlugin, pdfDoc, imageCache, fCtx);
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
  columnMode?: 'tile' | 'flow';
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

    const columnConfig: SectionColumnConfig = {
      columns: section.columns ?? 1,
      columnGap: section.columnGap ?? 0,
      columnWidths: section.columnWidths,
      columnMode: section.columnMode,
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
      engine,
      data,
    );

    allPages.push(...sectionPages);
    globalPageIndex += sectionPages.length;
  }

  // Collect bookmarks from laid-out pages for TOC (_bookmarks) support
  const bookmarks: BookmarkLayoutEntry[] = [];
  let lastBookmarkSectionIndex = -1;

  for (const page of allPages) {
    // Section bookmark (only on first page of each section)
    if (page.sectionIndex !== lastBookmarkSectionIndex) {
      const section = template.sections[page.sectionIndex];
      if (section.bookmark) {
        const scope = page.bands.length > 0 ? page.bands[0].scope : {};
        const title = await engine.resolve(section.bookmark, scope);
        bookmarks.push({
          title,
          pageNumber: page.pageIndex + 1,
          level: 0,
        });
      }
    }
    lastBookmarkSectionIndex = page.sectionIndex;

    // Band bookmarks
    for (const layoutBand of page.bands) {
      if (layoutBand.band.bookmark) {
        const title = await engine.resolve(layoutBand.band.bookmark, layoutBand.scope);
        bookmarks.push({
          title,
          pageNumber: page.pageIndex + 1,
          level: 1,
        });
      }
    }
  }

  return { pages: allPages, totalPages: allPages.length, bookmarks };
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
  engine: ExpressionEngine,
  data: Record<string, unknown>,
): Promise<LayoutPage[]> {
  const fCtx: FrameMeasureCtx = { engine, data, totalPagesHint };

  // Measure structural band heights (storing per-band measurements)
  const pageHeaderResult = await measureBandList(
    expanded.pageHeaderBands,
    fonts,
    styles,
    getPlugin,
    pdfDoc,
    imageCache,
    fCtx,
  );
  const pageFooterResult = await measureBandList(
    expanded.pageFooterBands,
    fonts,
    styles,
    getPlugin,
    pdfDoc,
    imageCache,
    fCtx,
  );
  const lastPageFooterResult = await measureBandList(
    expanded.lastPageFooterBands,
    fonts,
    styles,
    getPlugin,
    pdfDoc,
    imageCache,
    fCtx,
  );
  const columnHeaderResult = await measureBandList(
    expanded.columnHeaderBands,
    fonts,
    styles,
    getPlugin,
    pdfDoc,
    imageCache,
    fCtx,
  );
  const columnFooterResult = await measureBandList(
    expanded.columnFooterBands,
    fonts,
    styles,
    getPlugin,
    pdfDoc,
    imageCache,
    fCtx,
  );
  const backgroundResult = await measureBandList(
    expanded.backgroundBands,
    fonts,
    styles,
    getPlugin,
    pdfDoc,
    imageCache,
    fCtx,
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

    // Compute per-band column footer offsets
    // Each band independently decides whether to float (sit after content) or use fixed position.
    const fixedColumnFooterBottom = pageConfig.height - totalVerticalMargins - footerTotalHeight;
    let footerStartOffset: number;

    function computeColumnFooterOffsets(): number[] {
      const offsets: number[] = [];
      let floatCursor = pageHeaderHeight + columnHeaderHeight + cursorY;
      let fixedCursor = fixedColumnFooterBottom - columnFooterHeight;

      for (let i = 0; i < expanded.columnFooterBands.length; i++) {
        const band = expanded.columnFooterBands[i];
        const m = columnFooterResult.measurements[i];

        if (pageConfig.autoHeight) {
          offsets.push(floatCursor);
        } else if (band.float === true) {
          offsets.push(Math.min(floatCursor, fixedCursor));
        } else {
          offsets.push(fixedCursor);
        }

        floatCursor += m.height;
        fixedCursor += m.height;
      }
      return offsets;
    }

    const columnFooterOffsets = computeColumnFooterOffsets();

    if (pageConfig.autoHeight) {
      const contentBottom = pageHeaderHeight + columnHeaderHeight + cursorY;
      footerStartOffset = contentBottom + columnFooterHeight;
    } else {
      footerStartOffset = fixedColumnFooterBottom;
    }

    // Place column footers (multi-column: per column; single-column: once)
    if (colLayout) {
      for (let col = 0; col < numColumns; col++) {
        for (let i = 0; i < expanded.columnFooterBands.length; i++) {
          const band = expanded.columnFooterBands[i];
          const m = columnFooterResult.measurements[i];
          currentBands.push(
            createLayoutBand(band, columnFooterOffsets[i], m, scope, {
              columnIndex: col,
              columnOffsetX: colLayout.offsets[col],
              columnWidth: colLayout.widths[col],
            }),
          );
        }
      }
    } else {
      for (let i = 0; i < expanded.columnFooterBands.length; i++) {
        const band = expanded.columnFooterBands[i];
        const m = columnFooterResult.measurements[i];
        currentBands.push(createLayoutBand(band, columnFooterOffsets[i], m, scope));
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

  // Attempt to split a band that contains a single splittable element.
  // Returns fit/overflow bands on success, or null to fall back to standard overflow.
  async function trySplitBand(
    instance: BandInstance,
    availableHeight: number,
  ): Promise<{ fitBand: Band; overflowBand: Band } | null> {
    // Only split bands with exactly one element that supports splitting
    if (instance.band.elements.length !== 1) return null;

    const element = instance.band.elements[0];
    const plugin = getPlugin(element.type);
    if (!plugin.canSplit || !plugin.split) return null;

    const props = plugin.resolveProps(element.properties);
    const measureCtx = createMeasureContext(element, fonts, styles, pdfDoc, imageCache);

    // Account for element's Y offset within the band and padding
    const elPadding = normalizePadding(resolveElementStyle(element, styles).padding);
    const availableForContent = availableHeight - element.y - elPadding.top - elPadding.bottom;

    if (availableForContent <= 0) return null;

    const splitResult = await plugin.split(props, measureCtx, availableForContent);
    if (!splitResult) return null;

    const fitElement: Element = {
      ...element,
      properties: splitResult.fit,
      id: element.id + '__fit',
    };
    const overflowElement: Element = {
      ...element,
      properties: splitResult.overflow,
      id: element.id + '__overflow',
    };

    return {
      fitBand: {
        ...instance.band,
        id: instance.band.id + '__fit',
        elements: [fitElement],
        height: 0,
        autoHeight: true,
      },
      overflowBand: {
        ...instance.band,
        id: instance.band.id + '__overflow',
        elements: [overflowElement],
        height: 0,
        autoHeight: true,
      },
    };
  }

  // Place a full-width content band, handling page breaks and overflow.
  // Returns the updated lastUsedInstance.
  async function placeFullWidthBand(
    instance: BandInstance,
    lastUsed: BandInstance,
  ): Promise<BandInstance> {
    const measured = await measureBand(
      instance.band,
      fonts,
      styles,
      getPlugin,
      pdfDoc,
      imageCache,
      fCtx,
    );
    const bandHeight = measured.height;
    const scope = pageScope(instance, globalPageOffset + pages.length);

    // Forced page break
    if (instance.band.pageBreakBefore && cursorY > 0) {
      finalizePage(scope, false);
      startNewPage();
      placePageHeaders(pageScope(instance, globalPageOffset + pages.length));
      placeColumnHeaders(pageScope(instance, globalPageOffset + pages.length));
    }

    // Natural overflow (skipped for autoHeight pages)
    if (!pageConfig.autoHeight && bandHeight > availableContentHeight - cursorY) {
      // Attempt splitting even at cursorY=0 (splittable elements can be partially placed)
      const splitResult = await trySplitBand(instance, availableContentHeight - cursorY);

      if (splitResult) {
        // Place fit portion on current page
        const fitMeasured = await measureBand(
          splitResult.fitBand,
          fonts,
          styles,
          getPlugin,
          pdfDoc,
          imageCache,
          fCtx,
        );
        const fitOffsetY = pageHeaderHeight + columnHeaderHeight + cursorY;
        currentBands.push(createLayoutBand(splitResult.fitBand, fitOffsetY, fitMeasured, scope));
        cursorY += fitMeasured.height;

        // Start new page for overflow
        finalizePage(scope, false);
        startNewPage();
        placePageHeaders(pageScope(instance, globalPageOffset + pages.length));
        placeColumnHeaders(pageScope(instance, globalPageOffset + pages.length));

        // Recursively place overflow (may split again)
        const overflowInstance: BandInstance = {
          band: splitResult.overflowBand,
          scope: instance.scope,
        };
        return placeFullWidthBand(overflowInstance, instance);
      }

      // Standard behavior: move entire band to next page (only if not already at top)
      if (cursorY > 0) {
        finalizePage(pageScope(lastUsed, globalPageOffset + pages.length), false);
        startNewPage();
        placePageHeaders(pageScope(instance, globalPageOffset + pages.length));
        placeColumnHeaders(pageScope(instance, globalPageOffset + pages.length));
      }
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

  const isFlowMode = columnConfig.columnMode === 'flow';

  if (isMultiColumn && colLayout && isFlowMode) {
    // ─── Multi-column flow mode ───
    // Content fills column 1, overflows to column 2, then to new page column 1, etc.
    // Splittable bands can be split mid-column to fill the remaining space.
    const flowColLayout = colLayout; // narrowed — always defined in this branch

    // Same three-phase split as tile mode
    let columnRegionStart = 0;
    let columnRegionEnd = expanded.contentBands.length;
    while (
      columnRegionStart < expanded.contentBands.length &&
      expanded.contentBands[columnRegionStart].band.type === 'title'
    ) {
      columnRegionStart++;
    }
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

    // Phase 2: Column region — flow across columns
    let flowCol = 0;
    let flowColCursor = 0; // vertical cursor within current column
    let flowMaxColCursor = 0; // tallest column height on current page

    function flowStartNewPage(prev: BandInstance, next: BandInstance): void {
      finalizePage(pageScope(prev, globalPageOffset + pages.length), false);
      startNewPage();
      const newScope = pageScope(next, globalPageOffset + pages.length);
      placePageHeaders(newScope);
      placeColumnHeaders(newScope);
      flowCol = 0;
      flowColCursor = 0;
      flowMaxColCursor = 0;
    }

    function flowAdvanceColumn(prev: BandInstance, next: BandInstance): void {
      flowMaxColCursor = Math.max(flowMaxColCursor, flowColCursor);
      flowCol++;
      flowColCursor = 0;
      if (flowCol >= numColumns) {
        flowStartNewPage(prev, next);
      }
    }

    function flowAvailableHeight(): number {
      return availableContentHeight - cursorY - flowColCursor;
    }

    // Place a band (possibly split) in flow mode, handling column/page overflow.
    async function placeFlowBand(instance: BandInstance): Promise<void> {
      const measured = await measureBand(
        instance.band,
        fonts,
        styles,
        getPlugin,
        pdfDoc,
        imageCache,
        fCtx,
      );
      const bandHeight = measured.height;
      const scope = pageScope(instance, globalPageOffset + pages.length);

      // Forced page break
      if (instance.band.pageBreakBefore && (flowColCursor > 0 || flowCol > 0 || cursorY > 0)) {
        flowStartNewPage(lastUsedInstance, instance);
      }

      const available = flowAvailableHeight();

      // Band fits in current column
      if (pageConfig.autoHeight || bandHeight <= available) {
        const colOffsetY = pageHeaderHeight + columnHeaderHeight + cursorY + flowColCursor;
        currentBands.push(
          createLayoutBand(instance.band, colOffsetY, measured, scope, {
            columnIndex: flowCol,
            columnOffsetX: flowColLayout.offsets[flowCol],
            columnWidth: flowColLayout.widths[flowCol],
          }),
        );
        flowColCursor += bandHeight;
        lastUsedInstance = instance;
        return;
      }

      // Band doesn't fit — try to split
      if (available > 0) {
        const splitResult = await trySplitBand(instance, available);
        if (splitResult) {
          // Place fit portion in current column
          const fitMeasured = await measureBand(
            splitResult.fitBand,
            fonts,
            styles,
            getPlugin,
            pdfDoc,
            imageCache,
            fCtx,
          );
          const colOffsetY = pageHeaderHeight + columnHeaderHeight + cursorY + flowColCursor;
          currentBands.push(
            createLayoutBand(splitResult.fitBand, colOffsetY, fitMeasured, scope, {
              columnIndex: flowCol,
              columnOffsetX: flowColLayout.offsets[flowCol],
              columnWidth: flowColLayout.widths[flowCol],
            }),
          );
          flowColCursor += fitMeasured.height;

          // Advance to next column/page for overflow
          const overflowInstance: BandInstance = {
            band: splitResult.overflowBand,
            scope: instance.scope,
          };
          flowAdvanceColumn(lastUsedInstance, overflowInstance);
          lastUsedInstance = instance;

          // Recursively place overflow
          await placeFlowBand(overflowInstance);
          return;
        }
      }

      // Can't split or nothing fits — advance to next column/page
      if (flowColCursor > 0 || flowCol > 0) {
        flowAdvanceColumn(lastUsedInstance, instance);
      }

      // Band still doesn't fit — it's just too tall for any column — place it anyway
      const colOffsetY = pageHeaderHeight + columnHeaderHeight + cursorY + flowColCursor;
      currentBands.push(
        createLayoutBand(instance.band, colOffsetY, measured, scope, {
          columnIndex: flowCol,
          columnOffsetX: flowColLayout.offsets[flowCol],
          columnWidth: flowColLayout.widths[flowCol],
        }),
      );
      flowColCursor += measured.height;
      lastUsedInstance = instance;
    }

    for (let i = columnRegionStart; i < columnRegionEnd; i++) {
      await placeFlowBand(expanded.contentBands[i]);
    }

    // Resume full-width cursor after flow columns — use tallest column height
    cursorY += Math.max(flowMaxColCursor, flowColCursor);

    // Phase 3: Post-column (body/summary/noData bands) — full-width
    for (let i = columnRegionEnd; i < expanded.contentBands.length; i++) {
      lastUsedInstance = await placeFullWidthBand(expanded.contentBands[i], lastUsedInstance);
    }
  } else if (isMultiColumn && colLayout) {
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
        fCtx,
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
