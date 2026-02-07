import {
  PDFDocument,
  rgb,
  pushGraphicsState,
  popGraphicsState,
  rotateDegrees,
  translate,
} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { Template } from '@jsonpdf/core';
import { parseColor, validateTemplateSchema } from '@jsonpdf/core';
import {
  PluginRegistry,
  textPlugin,
  linePlugin,
  listPlugin,
  shapePlugin,
  imagePlugin,
  createImageCache,
} from '@jsonpdf/plugins';
import { embedFonts, collectFontSpecs } from './fonts.js';
import { layoutTemplate, mergePageConfig } from './layout.js';
import { createRenderContext } from './context.js';
import { templateToPdf } from './coordinate.js';
import { createExpressionEngine } from './expression.js';
import { validateData } from './data.js';
import { collectAnchors } from './anchors.js';
import { buildPdfOutline, type BookmarkEntry } from './bookmarks.js';

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

/** Create a default plugin registry with all built-in plugins. */
function createDefaultRegistry(): PluginRegistry {
  const registry = new PluginRegistry();
  registry.register(textPlugin);
  registry.register(linePlugin);
  registry.register(listPlugin);
  registry.register(shapePlugin);
  registry.register(imagePlugin);
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
        // Evaluate element condition
        if (element.condition) {
          const show = await engine.evaluate(element.condition, layoutBand.scope);
          if (!show) continue;
        }

        // Resolve expressions in properties
        const resolvedProperties = await engine.resolveProps(element.properties, layoutBand.scope);

        // Apply conditional styles
        let effectiveElement = element;
        if (element.conditionalStyles?.length) {
          let mergedOverrides = { ...(element.styleOverrides ?? {}) };
          let mergedStyleName = element.style;
          for (const cs of element.conditionalStyles) {
            const matches = await engine.evaluate(cs.condition, layoutBand.scope);
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

        const plugin = registry.get(effectiveElement.type);
        const props = plugin.resolveProps(resolvedProperties);
        const propErrors = plugin.validate(props);
        if (propErrors.length > 0) {
          const messages = propErrors.map((e) => `${e.path}: ${e.message}`).join('; ');
          throw new Error(
            `Invalid properties for ${effectiveElement.type} element "${effectiveElement.id}": ${messages}`,
          );
        }
        const measuredHeight = layoutBand.elementHeights.get(effectiveElement.id);
        const renderCtx = createRenderContext(
          effectiveElement,
          fonts,
          template.styles,
          page,
          layoutBand.offsetY,
          pageHeight,
          pageConfig.margins.top,
          effectiveMarginLeft,
          doc,
          imageCache,
          measuredHeight,
        );

        // Apply rotation transform if element has rotation
        const rotation = effectiveElement.rotation;
        if (rotation) {
          const elementHeight = measuredHeight ?? effectiveElement.height;
          const { x: preX, y: preY } = templateToPdf(
            effectiveElement.x,
            layoutBand.offsetY + effectiveElement.y,
            pageHeight,
            pageConfig.margins.top,
            effectiveMarginLeft,
          );
          const centerX = preX + effectiveElement.width / 2;
          const centerY = preY - elementHeight / 2;

          page.pushOperators(
            pushGraphicsState(),
            translate(centerX, centerY),
            rotateDegrees(-rotation),
            translate(-centerX, -centerY),
          );
        }

        await plugin.render(props, renderCtx);

        if (rotation) {
          page.pushOperators(popGraphicsState());
        }
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
