import { PDFDocument, rgb } from 'pdf-lib';
import type { Template } from '@jsonpdf/core';
import { parseColor, validateTemplateSchema } from '@jsonpdf/core';
import { PluginRegistry, textPlugin, linePlugin, listPlugin } from '@jsonpdf/plugins';
import { embedFonts, collectFontSpecs } from './fonts.js';
import { layoutTemplate } from './layout.js';
import { createRenderContext } from './context.js';

export interface RenderOptions {
  /** Skip template validation. */
  skipValidation?: boolean;
  /** Input data for template expressions (Phase 2). */
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
  return registry;
}

/** Render a template to PDF bytes. */
export async function renderPdf(
  template: Template,
  options?: RenderOptions,
): Promise<RenderResult> {
  // 1. Validate (schema-only; semantic validation is the caller's responsibility)
  if (!options?.skipValidation) {
    const validation = validateTemplateSchema(template);
    if (!validation.valid) {
      const messages = validation.errors.map((e) => `  ${e.path}: ${e.message}`).join('\n');
      throw new Error(`Template validation failed:\n${messages}`);
    }
  }

  // 2. Set up plugin registry
  const registry = options?.registry ?? createDefaultRegistry();

  // 3. Create PDF document
  const doc = await PDFDocument.create();

  // 4. Collect and embed fonts
  const fontSpecs = collectFontSpecs(template);
  const fonts = await embedFonts(doc, fontSpecs);

  // 5. Layout
  const getPlugin = (type: string) => registry.get(type);
  const layout = await layoutTemplate(template, fonts, getPlugin);

  // 6. Render pages
  for (const layoutPage of layout.pages) {
    const section = template.sections[layoutPage.sectionIndex];
    const pageConfig = {
      ...template.page,
      ...(section.page ?? {}),
      margins: { ...template.page.margins, ...(section.page?.margins ?? {}) },
    };
    const page = doc.addPage([pageConfig.width, pageConfig.height]);

    for (const layoutBand of layoutPage.bands) {
      // Draw band background
      if (layoutBand.band.backgroundColor) {
        const bgColor = parseColor(layoutBand.band.backgroundColor);
        const bgY =
          pageConfig.height -
          pageConfig.margins.top -
          layoutBand.offsetY -
          layoutBand.measuredHeight;
        page.drawRectangle({
          x: pageConfig.margins.left,
          y: bgY,
          width: pageConfig.width - pageConfig.margins.left - pageConfig.margins.right,
          height: layoutBand.measuredHeight,
          color: rgb(bgColor.r, bgColor.g, bgColor.b),
        });
      }

      // Render elements
      for (const element of layoutBand.band.elements) {
        const plugin = registry.get(element.type);
        const props = plugin.resolveProps(element.properties);
        const propErrors = plugin.validate(props);
        if (propErrors.length > 0) {
          const messages = propErrors.map((e) => `${e.path}: ${e.message}`).join('; ');
          throw new Error(
            `Invalid properties for ${element.type} element "${element.id}": ${messages}`,
          );
        }
        const measuredHeight = layoutBand.elementHeights.get(element.id);
        const renderCtx = createRenderContext(
          element,
          fonts,
          template.styles,
          page,
          layoutBand.offsetY,
          pageConfig.height,
          pageConfig.margins.top,
          pageConfig.margins.left,
          measuredHeight,
        );
        await plugin.render(props, renderCtx);
      }
    }
  }

  // 7. Save
  const bytes = await doc.save();
  return {
    bytes,
    pageCount: layout.pages.length,
  };
}
