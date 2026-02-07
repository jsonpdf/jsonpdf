import type { Template, Band } from '@jsonpdf/core';
import type { FontMap, Plugin } from '@jsonpdf/plugins';
import { createMeasureContext } from './context.js';

export interface LayoutBand {
  band: Band;
  offsetY: number;
  measuredHeight: number;
  elementHeights: Map<string, number>;
}

export interface LayoutPage {
  sectionIndex: number;
  bands: LayoutBand[];
}

export interface LayoutResult {
  pages: LayoutPage[];
}

/**
 * Phase 1 layout: single page, body bands only.
 * Bands stack vertically starting from Y=0 in the content area.
 */
export async function layoutTemplate(
  template: Template,
  fonts: FontMap,
  getPlugin: (type: string) => Plugin,
): Promise<LayoutResult> {
  const section = template.sections[0] as Template['sections'][number] | undefined;
  if (!section) {
    return { pages: [] };
  }

  let currentY = 0;
  const layoutBands: LayoutBand[] = [];

  for (const band of section.bands) {
    if (band.type !== 'body') continue;

    let bandHeight = band.height;
    const elementHeights = new Map<string, number>();

    // Measure elements for autoHeight bands
    if (band.autoHeight) {
      let maxElementBottom = band.height;
      for (const element of band.elements) {
        const plugin = getPlugin(element.type);
        const measureCtx = createMeasureContext(element, fonts, template.styles);
        const props = plugin.resolveProps(element.properties);
        const propErrors = plugin.validate(props);
        if (propErrors.length > 0) {
          const messages = propErrors.map((e) => `${e.path}: ${e.message}`).join('; ');
          throw new Error(
            `Invalid properties for ${element.type} element "${element.id}": ${messages}`,
          );
        }
        const measured = await plugin.measure(props, measureCtx);
        elementHeights.set(element.id, measured.height);
        const elementBottom = element.y + measured.height;
        maxElementBottom = Math.max(maxElementBottom, elementBottom);
      }
      bandHeight = maxElementBottom;
    }

    layoutBands.push({
      band,
      offsetY: currentY,
      measuredHeight: bandHeight,
      elementHeights,
    });

    currentY += bandHeight;
  }

  if (layoutBands.length === 0) {
    return { pages: [] };
  }

  return {
    pages: [{ sectionIndex: 0, bands: layoutBands }],
  };
}
