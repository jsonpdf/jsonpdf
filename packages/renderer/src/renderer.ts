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
import type { Element, Style, Template } from '@jsonpdf/core';
import { parseColor, validateTemplateSchema } from '@jsonpdf/core';
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
  createImageCache,
} from '@jsonpdf/plugins';
import { embedFonts, collectFontSpecs } from './fonts.js';
import { layoutTemplate, mergePageConfig, MAX_CONTAINER_DEPTH } from './layout.js';
import { createMeasureContext } from './context.js';
import { templateToPdf } from './coordinate.js';
import { createExpressionEngine, type ExpressionEngine } from './expression.js';
import { validateData } from './data.js';
import { collectAnchors } from './anchors.js';
import { buildPdfOutline, type BookmarkEntry } from './bookmarks.js';
import { resolveElementStyle, resolveNamedStyle, normalizePadding } from './style-resolver.js';

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

/** Immutable dependencies shared across all element rendering calls. */
interface RenderEnv {
  engine: ExpressionEngine;
  registry: PluginRegistry;
  fonts: FontMap;
  styles: Record<string, Style>;
  doc: PDFDocument;
  imageCache: ImageCache;
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

    return plugin.measure(props, measureCtx);
  };
  return callback;
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

  // 2. Resolve expressions in properties
  const resolvedProperties = await env.engine.resolveProps(element.properties, scope);

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
  };

  // 7. Add child callbacks for container elements
  if (effectiveElement.elements?.length) {
    renderCtx.children = effectiveElement.elements;
    renderCtx.measureChild = createMeasureChildCallback(env, scope, depth);
    renderCtx.renderChild = async (childEl: Element, offsetX: number, offsetY: number) => {
      // Child position in pdf-lib coords relative to the container's content area
      const childPdfX = renderCtx.x + offsetX;
      const childPdfY = renderCtx.y - offsetY;

      // Measure child for correct height
      const childPlugin = env.registry.get(childEl.type);
      const childResolvedProps = await env.engine.resolveProps(childEl.properties, scope);
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

  // 10. Pass 2: layout with correct totalPages (and ref filter available)
  const layout = await layoutTemplate(
    template,
    fonts,
    getPlugin,
    engine,
    data,
    measureLayout.totalPages,
    doc,
    imageCache,
  );

  // 11. Render pages
  const env: RenderEnv = { engine, registry, fonts, styles: template.styles, doc, imageCache };
  const bookmarkEntries: BookmarkEntry[] = [];
  let lastSectionIndex = -1;

  for (const layoutPage of layout.pages) {
    const section = template.sections[layoutPage.sectionIndex];
    const pageConfig = mergePageConfig(template.page, section.page);
    const pageHeight = layoutPage.computedHeight ?? pageConfig.height;
    const page = doc.addPage([pageConfig.width, pageHeight]);

    // Section bookmark (only on first page of each section)
    if (layoutPage.sectionIndex !== lastSectionIndex && section.bookmark) {
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
        const bgColor = parseColor(layoutBand.band.backgroundColor);
        const bgY =
          pageHeight - pageConfig.margins.top - layoutBand.offsetY - layoutBand.measuredHeight;
        page.drawRectangle({
          x: effectiveMarginLeft,
          y: bgY,
          width: effectiveContentWidth,
          height: layoutBand.measuredHeight,
          color: rgb(bgColor.r, bgColor.g, bgColor.b),
        });
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
