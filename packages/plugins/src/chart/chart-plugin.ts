import type { ValidationError } from '@jsonpdf/core';
import type { Plugin, MeasureContext, RenderContext, EmbeddedImage } from '../types.js';
import { computeFitDimensions } from '../image/image-plugin.js';
import { type ChartProps, chartPropsSchema, CHART_DEFAULTS } from './chart-types.js';
import { generateChart, createChartCache, type ChartCache } from './chart-generator.js';

/** Module-level chart cache shared across measure and render passes. */
const chartCache: ChartCache = createChartCache();

/** Get the chart as an embedded PDF image. */
async function getChart(props: ChartProps, ctx: MeasureContext): Promise<EmbeddedImage> {
  const dataUri = await generateChart(props, chartCache);
  return ctx.imageCache.getOrEmbed(dataUri, ctx.pdfDoc);
}

export const chartPlugin: Plugin<ChartProps> = {
  type: 'chart',
  propsSchema: chartPropsSchema,
  defaultProps: CHART_DEFAULTS,

  resolveProps(raw: Record<string, unknown>): ChartProps {
    return { ...CHART_DEFAULTS, ...raw } as ChartProps;
  },

  validate(props: ChartProps): ValidationError[] {
    const errors: ValidationError[] = [];

    const spec: unknown = props.spec;
    if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
      errors.push({ path: '/spec', message: 'spec is required and must be a non-empty object' });
    } else if (Object.keys(props.spec).length === 0) {
      errors.push({ path: '/spec', message: 'spec must not be empty' });
    }

    if (props.dataSource !== undefined && !Array.isArray(props.dataSource)) {
      errors.push({ path: '/dataSource', message: 'dataSource must be an array' });
    }

    if (props.fit !== undefined && !['contain', 'cover', 'fill', 'none'].includes(props.fit)) {
      errors.push({ path: '/fit', message: 'fit must be contain, cover, fill, or none' });
    }

    if (props.scale !== undefined && (typeof props.scale !== 'number' || props.scale < 0.5)) {
      errors.push({ path: '/scale', message: 'scale must be a number >= 0.5' });
    }

    return errors;
  },

  async measure(
    props: ChartProps,
    ctx: MeasureContext,
  ): Promise<{ width: number; height: number }> {
    if (Object.keys(props.spec).length === 0) {
      return { width: 0, height: 0 };
    }

    await getChart(props, ctx);
    return { width: ctx.availableWidth, height: ctx.availableHeight };
  },

  async render(props: ChartProps, ctx: RenderContext): Promise<void> {
    if (Object.keys(props.spec).length === 0) {
      return;
    }

    const embedded = await getChart(props, ctx);
    const fit = props.fit ?? 'contain';
    const { drawWidth, drawHeight, offsetX, offsetY } = computeFitDimensions(
      embedded.width,
      embedded.height,
      ctx.width,
      ctx.height,
      fit,
    );

    // pdf-lib drawImage: x,y is the bottom-left corner.
    // ctx.x, ctx.y is the top-left of content area in pdf-lib coords (y up).
    const imgX = ctx.x + offsetX;
    const imgY = ctx.y - offsetY - drawHeight;

    ctx.page.drawImage(embedded.image, {
      x: imgX,
      y: imgY,
      width: drawWidth,
      height: drawHeight,
      opacity: ctx.opacity,
    });
  },
};
