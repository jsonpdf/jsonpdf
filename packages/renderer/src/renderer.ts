import type { PDFPage } from 'pdf-lib';
import {
  PDFDocument,
  rgb,
  pushGraphicsState,
  popGraphicsState,
  rotateDegrees,
  translate,
} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { Band, Element, RichContent, Section, Style, Template } from '@jsonpdf/core';
import { parseColor, isGradient, validateTemplateSchema } from '@jsonpdf/core';
import type { FontMap, ImageCache, RenderContext } from '@jsonpdf/plugins';
import {
  PluginRegistry,
  textPlugin,
  linePlugin,
  listPlugin,
  shapePlugin,
  imagePlugin,
  containerPlugin,
  tablePlugin,
  barcodePlugin,
  chartPlugin,
  framePlugin,
  createImageCache,
  roundedRectPath,
} from '@jsonpdf/plugins';
import { embedFonts, collectFontSpecs } from './fonts.js';
import { layoutTemplate, mergePageConfig, MAX_CONTAINER_DEPTH } from './layout.js';
import { createMeasureContext } from './context.js';
import { templateToPdf } from './coordinate.js';
import { createExpressionEngine, type ExpressionEngine } from './expression.js';
import { validateData } from './data.js';
import { expandBands } from './band-expander.js';
import { collectAnchors } from './anchors.js';
import { buildPdfOutline, type BookmarkEntry } from './bookmarks.js';
import { resolveElementStyle, resolveNamedStyle, normalizePadding } from './style-resolver.js';
import { drawGradientRect } from './gradient.js';
import { renderFootnotes, measureFootnoteHeight, type FootnoteEntry } from './footnotes.js';

export interface RenderOptions {
  /** Skip template validation. */
  skipValidation?: boolean;
  /** Input data for template expressions. */
  data?: Record<string, unknown>;
  /** Custom plugin registry. If not provided, a default registry with built-in plugins is used. */
  registry?: PluginRegistry;
}

export interface RenderResult {
  /** PDF file bytes. */
  bytes: Uint8Array;
  /** Number of pages rendered. */
  pageCount: number;
}

/** Dependencies shared across all element rendering calls. */
interface RenderEnv {
  engine: ExpressionEngine;
  registry: PluginRegistry;
  fonts: FontMap;
  styles: Record<string, Style>;
  doc: PDFDocument;
  imageCache: ImageCache;
  anchorPageMap?: Map<string, PDFPage>;
  /** Footnote marker callback — set per-page to collect footnotes. */
  footnoteMarker?: (content: RichContent) => number;
}

/**
 * Create a measureBands callback for frame elements during the render pass.
 * Expands the frame's bands and measures each expanded content band.
 */
function createRenderMeasureBands(
  env: RenderEnv,
  scope: Record<string, unknown>,
): (bands: Band[]) => Promise<{ totalHeight: number }> {
  return async (bands: Band[]) => {
    const pseudoSection: Section = { id: '__frame', bands };
    const totalPages = Number(scope._totalPages) || 0;
    const expanded = await expandBands(pseudoSection, scope, env.engine, totalPages);
    let totalHeight = 0;
    for (const instance of expanded.contentBands) {
      const m = await measureBandForFrame(instance.band, env, instance.scope);
      totalHeight += m.height;
    }
    return { totalHeight };
  };
}

/** Measure a band's height for frame rendering (with expression resolution). */
async function measureBandForFrame(
  band: Band,
  env: RenderEnv,
  scope: Record<string, unknown>,
): Promise<{ height: number; elementHeights: Map<string, number> }> {
  const elementHeights = new Map<string, number>();
  let bandHeight = band.height;

  if (band.autoHeight) {
    let maxElementBottom = band.height;
    for (const element of band.elements) {
      const plugin = env.registry.get(element.type);
      // Protect frame bands from Liquid resolution (same pattern as renderElementAtPosition)
      let nestedFrameBands: Band[] | undefined;
      if (element.type === 'frame' && Array.isArray(element.properties.bands)) {
        nestedFrameBands = element.properties.bands as Band[];
      }
      const resolvedProperties = await env.engine.resolveProps(element.properties, scope);
      if (nestedFrameBands) {
        resolvedProperties.bands = nestedFrameBands;
      }
      const props = plugin.resolveProps(resolvedProperties);
      const measureCtx = createMeasureContext(
        element,
        env.fonts,
        env.styles,
        env.doc,
        env.imageCache,
      );
      if (element.elements?.length) {
        measureCtx.children = element.elements;
        measureCtx.measureChild = createMeasureChildCallback(env, scope, 0);
      }
      if (element.type === 'frame') {
        measureCtx.measureBands = createRenderMeasureBands(env, scope);
      }
      const measured = await plugin.measure(props, measureCtx);
      const padding = normalizePadding(resolveElementStyle(element, env.styles).padding);
      const totalElementHeight = measured.height + padding.top + padding.bottom;
      elementHeights.set(element.id, totalElementHeight);
      const elementBottom = element.y + totalElementHeight;
      maxElementBottom = Math.max(maxElementBottom, elementBottom);
    }
    bandHeight = maxElementBottom;
  }

  return { height: bandHeight, elementHeights };
}

/**
 * Create a measureChild callback for container elements.
 * Recursively supports nested containers.
 */
function createMeasureChildCallback(
  env: RenderEnv,
  scope: Record<string, unknown>,
  depth: number,
): (element: Element) => Promise<{ width: number; height: number }> {
  const callback = async (childEl: Element): Promise<{ width: number; height: number }> => {
    if (depth + 1 > MAX_CONTAINER_DEPTH) {
      throw new Error('Maximum container nesting depth exceeded');
    }

    const resolvedProperties = await env.engine.resolveProps(childEl.properties, scope);
    const plugin = env.registry.get(childEl.type);
    const props = plugin.resolveProps(resolvedProperties);
    const measureCtx = createMeasureContext(
      childEl,
      env.fonts,
      env.styles,
      env.doc,
      env.imageCache,
    );

    if (childEl.elements?.length) {
      measureCtx.children = childEl.elements;
      measureCtx.measureChild = createMeasureChildCallback(env, scope, depth + 1);
    }

    // Provide measureBands callback for frame elements
    if (childEl.type === 'frame') {
      measureCtx.measureBands = createRenderMeasureBands(env, scope);
    }

    return plugin.measure(props, measureCtx);
  };
  return callback;
}

/**
 * Draw element-level background and borders.
 * Called BEFORE plugin.render() so backgrounds/borders appear behind content.
 *
 * @param page - The pdf-lib page
 * @param pdfX - Left edge in pdf-lib coordinates
 * @param pdfY - Top edge in pdf-lib coordinates (Y increases upward)
 * @param width - Element width
 * @param height - Element height
 * @param style - Resolved element style
 */
function drawElementBordersAndBackground(
  page: PDFPage,
  doc: PDFDocument,
  pdfX: number,
  pdfY: number,
  width: number,
  height: number,
  style: Style,
): void {
  const opacity = style.opacity;
  const hasBorderRadius = (style.borderRadius ?? 0) > 0;
  const hasIndividualBorders = !!(
    style.borderTop ||
    style.borderRight ||
    style.borderBottom ||
    style.borderLeft
  );

  // 1. Background
  if (style.backgroundColor) {
    if (isGradient(style.backgroundColor)) {
      // Gradient fill — bottom-left coordinates for drawGradientRect
      drawGradientRect(
        page,
        doc,
        pdfX,
        pdfY - height,
        width,
        height,
        style.backgroundColor,
        opacity,
      );
    } else {
      const bg = parseColor(style.backgroundColor);
      const bgColor = rgb(bg.r, bg.g, bg.b);

      if (hasBorderRadius) {
        const path = roundedRectPath(width, height, style.borderRadius ?? 0);
        page.drawSvgPath(path, {
          x: pdfX,
          y: pdfY,
          color: bgColor,
          opacity,
        });
      } else {
        page.drawRectangle({
          x: pdfX,
          y: pdfY - height,
          width,
          height,
          color: bgColor,
          opacity,
        });
      }
    }
  }

  // 2. Uniform border (skipped when individual borders are defined — they take precedence)
  if ((style.borderWidth ?? 0) > 0 && !hasBorderRadius && !hasIndividualBorders) {
    const borderColor = style.borderColor ? parseColor(style.borderColor) : { r: 0, g: 0, b: 0 };
    page.drawRectangle({
      x: pdfX,
      y: pdfY - height,
      width,
      height,
      borderColor: rgb(borderColor.r, borderColor.g, borderColor.b),
      borderWidth: style.borderWidth,
      opacity: 0,
      borderOpacity: opacity,
    });
  }

  // 2b. Uniform border with borderRadius (skipped when individual borders are defined)
  if ((style.borderWidth ?? 0) > 0 && hasBorderRadius && !hasIndividualBorders) {
    const borderColor = style.borderColor ? parseColor(style.borderColor) : { r: 0, g: 0, b: 0 };
    const path = roundedRectPath(width, height, style.borderRadius ?? 0);
    page.drawSvgPath(path, {
      x: pdfX,
      y: pdfY,
      borderColor: rgb(borderColor.r, borderColor.g, borderColor.b),
      borderWidth: style.borderWidth,
      borderOpacity: opacity,
      opacity: 0,
    });
  }

  // 3. Individual borders (skipped when borderRadius is set — CSS behavior)
  if (!hasBorderRadius) {
    const top = pdfY;
    const bottom = pdfY - height;
    const left = pdfX;
    const right = pdfX + width;

    if (style.borderTop && style.borderTop.width > 0) {
      const c = parseColor(style.borderTop.color ?? style.borderColor ?? '#000000');
      page.drawLine({
        start: { x: left, y: top },
        end: { x: right, y: top },
        thickness: style.borderTop.width,
        color: rgb(c.r, c.g, c.b),
        opacity,
      });
    }
    if (style.borderBottom && style.borderBottom.width > 0) {
      const c = parseColor(style.borderBottom.color ?? style.borderColor ?? '#000000');
      page.drawLine({
        start: { x: left, y: bottom },
        end: { x: right, y: bottom },
        thickness: style.borderBottom.width,
        color: rgb(c.r, c.g, c.b),
        opacity,
      });
    }
    if (style.borderLeft && style.borderLeft.width > 0) {
      const c = parseColor(style.borderLeft.color ?? style.borderColor ?? '#000000');
      page.drawLine({
        start: { x: left, y: bottom },
        end: { x: left, y: top },
        thickness: style.borderLeft.width,
        color: rgb(c.r, c.g, c.b),
        opacity,
      });
    }
    if (style.borderRight && style.borderRight.width > 0) {
      const c = parseColor(style.borderRight.color ?? style.borderColor ?? '#000000');
      page.drawLine({
        start: { x: right, y: bottom },
        end: { x: right, y: top },
        thickness: style.borderRight.width,
        color: rgb(c.r, c.g, c.b),
        opacity,
      });
    }
  }
}

/**
 * Render a single element at a given position in pdf-lib coordinates.
 *
 * Handles: condition evaluation, expression resolution, conditional styles,
 * plugin resolution, child callbacks for containers, rotation, and rendering.
 *
 * @param pdfX - Left edge in pdf-lib coordinates (before element padding)
 * @param pdfY - Top edge in pdf-lib coordinates (before element padding)
 */
async function renderElementAtPosition(
  element: Element,
  scope: Record<string, unknown>,
  page: PDFPage,
  pdfX: number,
  pdfY: number,
  env: RenderEnv,
  measuredHeight?: number,
  depth: number = 0,
): Promise<void> {
  if (depth > MAX_CONTAINER_DEPTH) {
    throw new Error('Maximum container nesting depth exceeded');
  }

  // 1. Evaluate condition
  if (element.condition) {
    const show = await env.engine.evaluate(element.condition, scope);
    if (!show) return;
  }

  // 2. Resolve expressions in properties (protect frame bands from Liquid resolution)
  let frameBands: Band[] | undefined;
  if (element.type === 'frame' && Array.isArray(element.properties.bands)) {
    frameBands = element.properties.bands as Band[];
  }
  const resolvedProperties = await env.engine.resolveProps(element.properties, scope);
  if (frameBands) {
    resolvedProperties.bands = frameBands;
  }

  // 3. Apply conditional styles
  let effectiveElement = element;
  if (element.conditionalStyles?.length) {
    let mergedOverrides = { ...(element.styleOverrides ?? {}) };
    let mergedStyleName = element.style;
    for (const cs of element.conditionalStyles) {
      const matches = await env.engine.evaluate(cs.condition, scope);
      if (matches) {
        if (cs.style) mergedStyleName = cs.style;
        if (cs.styleOverrides) mergedOverrides = { ...mergedOverrides, ...cs.styleOverrides };
      }
    }
    effectiveElement = {
      ...element,
      style: mergedStyleName,
      styleOverrides: mergedOverrides,
    };
  }

  // 4. Plugin resolution and validation
  const plugin = env.registry.get(effectiveElement.type);
  const props = plugin.resolveProps(resolvedProperties);
  const propErrors = plugin.validate(props);
  if (propErrors.length > 0) {
    const messages = propErrors.map((e) => `${e.path}: ${e.message}`).join('; ');
    throw new Error(
      `Invalid properties for ${effectiveElement.type} element "${effectiveElement.id}": ${messages}`,
    );
  }

  // 5. Compute style and padding
  const elementStyle = resolveElementStyle(effectiveElement, env.styles);
  const padding = normalizePadding(elementStyle.padding);
  const height = measuredHeight ?? effectiveElement.height;

  // 6. Build render context
  const renderCtx: RenderContext = {
    fonts: env.fonts,
    availableWidth: effectiveElement.width - padding.left - padding.right,
    availableHeight: height - padding.top - padding.bottom,
    resolveStyle: (name: string) => resolveNamedStyle(name, env.styles),
    elementStyle,
    pdfDoc: env.doc,
    imageCache: env.imageCache,
    page,
    x: pdfX + padding.left,
    y: pdfY - padding.top,
    width: effectiveElement.width - padding.left - padding.right,
    height: height - padding.top - padding.bottom,
    anchorPageMap: env.anchorPageMap,
    opacity: elementStyle.opacity,
    footnoteMarker: env.footnoteMarker,
  };

  // 7. Add child callbacks for container elements
  if (effectiveElement.elements?.length) {
    renderCtx.children = effectiveElement.elements;
    renderCtx.measureChild = createMeasureChildCallback(env, scope, depth);
    renderCtx.renderChild = async (childEl: Element, offsetX: number, offsetY: number) => {
      // Child position in pdf-lib coords relative to the container's content area
      const childPdfX = renderCtx.x + offsetX;
      const childPdfY = renderCtx.y - offsetY;

      // Measure child for correct height (protect frame bands from Liquid resolution)
      const childPlugin = env.registry.get(childEl.type);
      let childFrameBands: Band[] | undefined;
      if (childEl.type === 'frame' && Array.isArray(childEl.properties.bands)) {
        childFrameBands = childEl.properties.bands as Band[];
      }
      const childResolvedProps = await env.engine.resolveProps(childEl.properties, scope);
      if (childFrameBands) {
        childResolvedProps.bands = childFrameBands;
      }
      const childProps = childPlugin.resolveProps(childResolvedProps);
      const childMeasureCtx = createMeasureContext(
        childEl,
        env.fonts,
        env.styles,
        env.doc,
        env.imageCache,
      );
      if (childEl.elements?.length) {
        childMeasureCtx.children = childEl.elements;
        childMeasureCtx.measureChild = createMeasureChildCallback(env, scope, depth + 1);
      }
      if (childEl.type === 'frame') {
        childMeasureCtx.measureBands = createRenderMeasureBands(env, scope);
      }
      const measured = await childPlugin.measure(childProps, childMeasureCtx);
      const childPadding = normalizePadding(resolveElementStyle(childEl, env.styles).padding);
      const childMeasuredHeight = measured.height + childPadding.top + childPadding.bottom;

      await renderElementAtPosition(
        childEl,
        scope,
        page,
        childPdfX,
        childPdfY,
        env,
        childMeasuredHeight,
        depth + 1,
      );
    };
  }

  // 7b. Add frame callbacks for frame elements
  if (effectiveElement.type === 'frame') {
    renderCtx.measureBands = createRenderMeasureBands(env, scope);
    renderCtx.renderBands = async (bands: Band[]) => {
      const pseudoSection: Section = { id: '__frame', bands };
      const totalPages = Number(scope._totalPages) || 0;
      const expanded = await expandBands(pseudoSection, scope, env.engine, totalPages);

      let cursorY = 0;
      for (const instance of expanded.contentBands) {
        const bandM = await measureBandForFrame(instance.band, env, instance.scope);

        for (const el of instance.band.elements) {
          const elMeasuredH = bandM.elementHeights.get(el.id);
          const elPdfX = renderCtx.x + el.x;
          const elPdfY = renderCtx.y - cursorY - el.y;

          await renderElementAtPosition(
            el,
            instance.scope,
            page,
            elPdfX,
            elPdfY,
            env,
            elMeasuredH,
            depth + 1,
          );
        }
        cursorY += bandM.height;
      }
    };
  }

  // 8. Apply rotation transform
  const rotation = effectiveElement.rotation;
  if (rotation) {
    const centerX = pdfX + effectiveElement.width / 2;
    const centerY = pdfY - height / 2;
    page.pushOperators(
      pushGraphicsState(),
      translate(centerX, centerY),
      rotateDegrees(-rotation),
      translate(-centerX, -centerY),
    );
  }

  // 8b. Draw element-level background and borders (behind content)
  drawElementBordersAndBackground(
    page,
    env.doc,
    pdfX,
    pdfY,
    effectiveElement.width,
    height,
    elementStyle,
  );

  // 9. Render
  await plugin.render(props, renderCtx);

  // 10. Restore graphics state
  if (rotation) {
    page.pushOperators(popGraphicsState());
  }
}

/** Create a default plugin registry with all built-in plugins. */
function createDefaultRegistry(): PluginRegistry {
  const registry = new PluginRegistry();
  registry.register(textPlugin);
  registry.register(linePlugin);
  registry.register(listPlugin);
  registry.register(shapePlugin);
  registry.register(imagePlugin);
  registry.register(containerPlugin);
  registry.register(tablePlugin);
  registry.register(barcodePlugin);
  registry.register(chartPlugin);
  registry.register(framePlugin);
  return registry;
}

/** Render a template to PDF bytes. */
export async function renderPdf(
  template: Template,
  options?: RenderOptions,
): Promise<RenderResult> {
  // 1. Validate template schema
  if (!options?.skipValidation) {
    const validation = validateTemplateSchema(template);
    if (!validation.valid) {
      const messages = validation.errors.map((e) => `  ${e.path}: ${e.message}`).join('\n');
      throw new Error(`Template validation failed:\n${messages}`);
    }
  }

  // 2. Validate data against dataSchema
  const data = options?.data ?? {};
  validateData(data, template.dataSchema);

  // 3. Set up plugin registry
  const registry = options?.registry ?? createDefaultRegistry();

  // 4. Create PDF document
  const doc = await PDFDocument.create();

  // 5. Register fontkit for custom font embedding
  if (template.fonts.length > 0) {
    doc.registerFontkit(fontkit);
  }

  // 6. Create expression engine
  const engine = createExpressionEngine();

  // 7. Collect and embed fonts
  const fontSpecs = collectFontSpecs(template);
  const fonts = await embedFonts(doc, fontSpecs, template.fonts);

  // 8. Layout helpers
  const getPlugin = (type: string) => registry.get(type);
  const imageCache = createImageCache();

  // 9. Pass 1: measure layout to determine total page count and anchors
  const measureLayout = await layoutTemplate(
    template,
    fonts,
    getPlugin,
    engine,
    data,
    0,
    doc,
    imageCache,
  );

  // 9b. Collect cross-reference anchors and register ref filter
  const anchorMap = collectAnchors(measureLayout);
  engine.registerFilter('ref', (anchorId: unknown) => {
    return anchorMap.get(String(anchorId)) ?? '??';
  });

  // 9c. Inject _bookmarks from pass 1 for TOC data source
  const dataWithBookmarks: Record<string, unknown> = {
    ...data,
    _bookmarks: measureLayout.bookmarks,
  };

  // 10. Pass 2: layout with correct totalPages, _bookmarks, and ref filter
  const layout = await layoutTemplate(
    template,
    fonts,
    getPlugin,
    engine,
    dataWithBookmarks,
    measureLayout.totalPages,
    doc,
    imageCache,
  );

  // 11. Create all pages first (needed for internal GoTo links across pages)
  interface PageEntry {
    page: PDFPage;
    layoutPage: (typeof layout.pages)[number];
    pageConfig: ReturnType<typeof mergePageConfig>;
    pageHeight: number;
  }
  const pdfPages: PageEntry[] = [];
  for (const layoutPage of layout.pages) {
    const section = template.sections[layoutPage.sectionIndex];
    const pageConfig = mergePageConfig(template.page, section.page);
    const pageHeight = layoutPage.computedHeight ?? pageConfig.height;
    const page = doc.addPage([pageConfig.width, pageHeight]);
    pdfPages.push({ page, layoutPage, pageConfig, pageHeight });
  }

  // 11b. Build anchor-to-PDFPage map for internal links
  const anchorPageMap = new Map<string, PDFPage>();
  for (const [anchorId, pageNum] of anchorMap) {
    anchorPageMap.set(anchorId, pdfPages[pageNum - 1].page); // 1-based → 0-based
  }

  // 12. Render pages
  const env: RenderEnv = {
    engine,
    registry,
    fonts,
    styles: template.styles,
    doc,
    imageCache,
    anchorPageMap,
  };
  const bookmarkEntries: BookmarkEntry[] = [];
  let lastSectionIndex = -1;

  for (const { page, layoutPage, pageConfig, pageHeight } of pdfPages) {
    // Set up per-page footnote collection
    const pageFootnotes: FootnoteEntry[] = [];
    let footnoteCounter = 0;
    env.footnoteMarker = (content: RichContent) => {
      footnoteCounter++;
      pageFootnotes.push({ number: footnoteCounter, content });
      return footnoteCounter;
    };

    // Section bookmark (only on first page of each section)
    if (layoutPage.sectionIndex !== lastSectionIndex) {
      const section = template.sections[layoutPage.sectionIndex];
      if (section.bookmark) {
        const scope = layoutPage.bands.length > 0 ? layoutPage.bands[0].scope : {};
        const title = await engine.resolve(section.bookmark, scope);
        bookmarkEntries.push({
          title,
          page,
          top: pageHeight,
          left: 0,
          level: 0,
        });
      }
    }
    lastSectionIndex = layoutPage.sectionIndex;

    for (const layoutBand of layoutPage.bands) {
      // Compute column-aware effective values
      const effectiveMarginLeft = pageConfig.margins.left + (layoutBand.columnOffsetX ?? 0);
      const effectiveContentWidth =
        layoutBand.columnWidth ??
        pageConfig.width - pageConfig.margins.left - pageConfig.margins.right;

      // Band bookmark
      if (layoutBand.band.bookmark) {
        const title = await engine.resolve(layoutBand.band.bookmark, layoutBand.scope);
        const pdfY = pageHeight - pageConfig.margins.top - layoutBand.offsetY;
        bookmarkEntries.push({
          title,
          page,
          top: pdfY,
          left: effectiveMarginLeft,
          level: 1,
        });
      }

      // Draw band background
      if (layoutBand.band.backgroundColor) {
        const bgY =
          pageHeight - pageConfig.margins.top - layoutBand.offsetY - layoutBand.measuredHeight;
        if (isGradient(layoutBand.band.backgroundColor)) {
          drawGradientRect(
            page,
            doc,
            effectiveMarginLeft,
            bgY,
            effectiveContentWidth,
            layoutBand.measuredHeight,
            layoutBand.band.backgroundColor,
          );
        } else {
          const bgColor = parseColor(layoutBand.band.backgroundColor);
          page.drawRectangle({
            x: effectiveMarginLeft,
            y: bgY,
            width: effectiveContentWidth,
            height: layoutBand.measuredHeight,
            color: rgb(bgColor.r, bgColor.g, bgColor.b),
          });
        }
      }

      // Render elements
      for (const element of layoutBand.band.elements) {
        const measuredHeight = layoutBand.elementHeights.get(element.id);
        const { x: pdfX, y: pdfY } = templateToPdf(
          element.x,
          layoutBand.offsetY + element.y,
          pageHeight,
          pageConfig.margins.top,
          effectiveMarginLeft,
        );

        await renderElementAtPosition(
          element,
          layoutBand.scope,
          page,
          pdfX,
          pdfY,
          env,
          measuredHeight,
        );
      }
    }

    // Render footnotes at page bottom (above page footer)
    if (pageFootnotes.length > 0) {
      // Find the lowest non-footer band to determine where footnotes start
      // Footnotes render above the page footer area
      const footerBandTypes = new Set(['pageFooter', 'lastPageFooter']);
      let footerTopY = pageConfig.margins.bottom; // fallback: bottom margin
      for (const lb of layoutPage.bands) {
        if (footerBandTypes.has(lb.band.type)) {
          const bandBottomPdf = pageHeight - pageConfig.margins.top - lb.offsetY;
          if (bandBottomPdf > footerTopY) {
            footerTopY = bandBottomPdf;
          }
        }
      }

      // Measure footnote height and position just above the footer
      const defaultStyle: Style = {
        fontFamily: 'Helvetica',
        fontSize: 12,
      };
      const fnHeight = measureFootnoteHeight(pageFootnotes, defaultStyle);
      const fnY = footerTopY + fnHeight;
      const marginLeft = pageConfig.margins.left;
      const contentWidth = pageConfig.width - pageConfig.margins.left - pageConfig.margins.right;

      renderFootnotes(page, pageFootnotes, marginLeft, fnY, contentWidth, defaultStyle, env.fonts);
    }
  }

  // 12. Build PDF outline from collected bookmarks
  if (bookmarkEntries.length > 0) {
    buildPdfOutline(doc, bookmarkEntries);
  }

  // 13. Save
  const bytes = await doc.save();
  return {
    bytes,
    pageCount: layout.totalPages,
  };
}
