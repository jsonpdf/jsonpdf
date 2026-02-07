import type { ValidationError } from '@jsonpdf/core';
import type { Plugin, MeasureContext, RenderContext, EmbeddedImage } from '../types.js';
import { computeFitDimensions } from '../image/image-plugin.js';
import {
  type BarcodeProps,
  barcodePropsSchema,
  BARCODE_DEFAULTS,
  SUPPORTED_FORMATS,
} from './barcode-types.js';
import { generateBarcode, createBarcodeCache, type BarcodeCache } from './barcode-generator.js';

/** Module-level barcode cache shared across measure and render passes. */
const barcodeCache: BarcodeCache = createBarcodeCache();

/** Get the barcode as an embedded PDF image. */
async function getBarcode(props: BarcodeProps, ctx: MeasureContext): Promise<EmbeddedImage> {
  const dataUri = await generateBarcode(props, barcodeCache);
  return ctx.imageCache.getOrEmbed(dataUri, ctx.pdfDoc);
}

export const barcodePlugin: Plugin<BarcodeProps> = {
  type: 'barcode',
  propsSchema: barcodePropsSchema,
  defaultProps: BARCODE_DEFAULTS,

  resolveProps(raw: Record<string, unknown>): BarcodeProps {
    return { ...BARCODE_DEFAULTS, ...raw } as BarcodeProps;
  },

  validate(props: BarcodeProps): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!props.value || typeof props.value !== 'string' || props.value.trim().length === 0) {
      errors.push({ path: '/value', message: 'value is required and must be a non-empty string' });
    }

    if (!(SUPPORTED_FORMATS as readonly string[]).includes(props.format)) {
      errors.push({
        path: '/format',
        message: `format must be one of: ${SUPPORTED_FORMATS.join(', ')}`,
      });
    }

    if (
      props.barColor !== undefined &&
      typeof props.barColor === 'string' &&
      !props.barColor.startsWith('#')
    ) {
      errors.push({ path: '/barColor', message: 'barColor must be a hex string starting with #' });
    }

    if (
      props.backgroundColor !== undefined &&
      typeof props.backgroundColor === 'string' &&
      !props.backgroundColor.startsWith('#')
    ) {
      errors.push({
        path: '/backgroundColor',
        message: 'backgroundColor must be a hex string starting with #',
      });
    }

    return errors;
  },

  async measure(
    props: BarcodeProps,
    ctx: MeasureContext,
  ): Promise<{ width: number; height: number }> {
    if (!props.value || props.value.trim().length === 0) {
      return { width: 0, height: 0 };
    }

    await getBarcode(props, ctx);
    return { width: ctx.availableWidth, height: ctx.availableHeight };
  },

  async render(props: BarcodeProps, ctx: RenderContext): Promise<void> {
    if (!props.value || props.value.trim().length === 0) {
      return;
    }

    const embedded = await getBarcode(props, ctx);
    const { drawWidth, drawHeight, offsetX, offsetY } = computeFitDimensions(
      embedded.width,
      embedded.height,
      ctx.width,
      ctx.height,
      'contain',
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
    });
  },
};
