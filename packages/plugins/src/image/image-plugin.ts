import {
  pushGraphicsState,
  popGraphicsState,
  moveTo,
  lineTo,
  closePath,
  clip,
  endPath,
} from 'pdf-lib';
import type { ValidationError, JSONSchema } from '@jsonpdf/core';
import type { Plugin, MeasureContext, RenderContext, EmbeddedImage } from '../types.js';

export interface ImageProps {
  src: string;
  fit?: 'contain' | 'cover' | 'fill' | 'none';
}

export const imagePropsSchema: JSONSchema = {
  type: 'object',
  required: ['src'],
  properties: {
    src: { type: 'string', minLength: 1 },
    fit: { type: 'string', enum: ['contain', 'cover', 'fill', 'none'] },
  },
};

const IMAGE_DEFAULTS: ImageProps = { src: '', fit: 'contain' };

/**
 * Compute the draw dimensions and offset for an image within an element.
 * Returns { drawWidth, drawHeight, offsetX, offsetY } in element-local coordinates.
 */
export function computeFitDimensions(
  imgWidth: number,
  imgHeight: number,
  elemWidth: number,
  elemHeight: number,
  fit: 'contain' | 'cover' | 'fill' | 'none',
): { drawWidth: number; drawHeight: number; offsetX: number; offsetY: number } {
  // Guard against degenerate (zero-dimension) images
  if (imgWidth <= 0 || imgHeight <= 0) {
    return { drawWidth: 0, drawHeight: 0, offsetX: 0, offsetY: 0 };
  }

  switch (fit) {
    case 'fill':
      return { drawWidth: elemWidth, drawHeight: elemHeight, offsetX: 0, offsetY: 0 };

    case 'none': {
      const offsetX = (elemWidth - imgWidth) / 2;
      const offsetY = (elemHeight - imgHeight) / 2;
      return { drawWidth: imgWidth, drawHeight: imgHeight, offsetX, offsetY };
    }

    case 'cover': {
      const scale = Math.max(elemWidth / imgWidth, elemHeight / imgHeight);
      const drawWidth = imgWidth * scale;
      const drawHeight = imgHeight * scale;
      const offsetX = (elemWidth - drawWidth) / 2;
      const offsetY = (elemHeight - drawHeight) / 2;
      return { drawWidth, drawHeight, offsetX, offsetY };
    }

    case 'contain':
    default: {
      const scale = Math.min(elemWidth / imgWidth, elemHeight / imgHeight);
      const drawWidth = imgWidth * scale;
      const drawHeight = imgHeight * scale;
      const offsetX = (elemWidth - drawWidth) / 2;
      const offsetY = (elemHeight - drawHeight) / 2;
      return { drawWidth, drawHeight, offsetX, offsetY };
    }
  }
}

async function getImage(src: string, ctx: MeasureContext): Promise<EmbeddedImage> {
  return ctx.imageCache.getOrEmbed(src, ctx.pdfDoc);
}

/** Apply a clipping rectangle to the current page graphics state. */
function clipToElementBounds(ctx: RenderContext): void {
  ctx.page.pushOperators(
    pushGraphicsState(),
    moveTo(ctx.x, ctx.y),
    lineTo(ctx.x + ctx.width, ctx.y),
    lineTo(ctx.x + ctx.width, ctx.y - ctx.height),
    lineTo(ctx.x, ctx.y - ctx.height),
    closePath(),
    clip(),
    endPath(),
  );
}

export const imagePlugin: Plugin<ImageProps> = {
  type: 'image',
  propsSchema: imagePropsSchema,
  defaultProps: IMAGE_DEFAULTS,

  resolveProps(raw: Record<string, unknown>): ImageProps {
    return { ...IMAGE_DEFAULTS, ...raw } as ImageProps;
  },

  validate(props: ImageProps): ValidationError[] {
    const errors: ValidationError[] = [];
    if (!props.src || typeof props.src !== 'string' || props.src.trim().length === 0) {
      errors.push({ path: '/src', message: 'src is required and must be a non-empty string' });
    }
    if (props.fit !== undefined && !['contain', 'cover', 'fill', 'none'].includes(props.fit)) {
      errors.push({ path: '/fit', message: 'fit must be contain, cover, fill, or none' });
    }
    return errors;
  },

  async measure(
    props: ImageProps,
    ctx: MeasureContext,
  ): Promise<{ width: number; height: number }> {
    const embedded = await getImage(props.src, ctx);
    const fit = props.fit ?? 'contain';
    const { drawWidth, drawHeight } = computeFitDimensions(
      embedded.width,
      embedded.height,
      ctx.availableWidth,
      ctx.availableHeight,
      fit,
    );

    if (fit === 'none') {
      return { width: drawWidth, height: drawHeight };
    }
    return { width: ctx.availableWidth, height: ctx.availableHeight };
  },

  async render(props: ImageProps, ctx: RenderContext): Promise<void> {
    const embedded = await getImage(props.src, ctx);
    const fit = props.fit ?? 'contain';
    const { drawWidth, drawHeight, offsetX, offsetY } = computeFitDimensions(
      embedded.width,
      embedded.height,
      ctx.width,
      ctx.height,
      fit,
    );

    // pdf-lib drawImage: x,y is the bottom-left corner of the image.
    // ctx.x, ctx.y is the top-left of content area in pdf-lib coords (y up).
    // offsetY is the distance from the top of the element to the top of the image (top-down).
    const imgX = ctx.x + offsetX;
    const imgY = ctx.y - offsetY - drawHeight;

    // Clip to element bounds for modes that can overflow (cover, none)
    const needsClip = fit === 'cover' || fit === 'none';
    if (needsClip) {
      clipToElementBounds(ctx);
    }

    ctx.page.drawImage(embedded.image, {
      x: imgX,
      y: imgY,
      width: drawWidth,
      height: drawHeight,
    });

    if (needsClip) {
      ctx.page.pushOperators(popGraphicsState());
    }
  },
};
