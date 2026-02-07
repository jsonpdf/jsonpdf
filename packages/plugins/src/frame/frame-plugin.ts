import type { ValidationError } from '@jsonpdf/core';
import type { Plugin, MeasureContext, RenderContext } from '../types.js';
import { type FrameProps, framePropsSchema, FRAME_DEFAULTS } from './frame-types.js';

export const framePlugin: Plugin<FrameProps> = {
  type: 'frame',
  propsSchema: framePropsSchema,
  defaultProps: FRAME_DEFAULTS,

  resolveProps(raw: Record<string, unknown>): FrameProps {
    return { ...FRAME_DEFAULTS, ...raw } as FrameProps;
  },

  validate(props: FrameProps): ValidationError[] {
    const errors: ValidationError[] = [];

    const bands: unknown = props.bands;
    if (!Array.isArray(bands)) {
      errors.push({ path: '/bands', message: 'bands is required and must be an array' });
      return errors;
    }

    if (bands.length === 0) {
      errors.push({ path: '/bands', message: 'bands must not be empty' });
      return errors;
    }

    for (let i = 0; i < bands.length; i++) {
      const band = bands[i] as Record<string, unknown>;
      const prefix = `/bands/${String(i)}`;
      if (!band.id) {
        errors.push({ path: `${prefix}/id`, message: 'band must have an id' });
      }
      if (!band.type) {
        errors.push({ path: `${prefix}/type`, message: 'band must have a type' });
      }
      if (!Array.isArray(band.elements)) {
        errors.push({ path: `${prefix}/elements`, message: 'band must have an elements array' });
      }
    }

    return errors;
  },

  async measure(
    props: FrameProps,
    ctx: MeasureContext,
  ): Promise<{ width: number; height: number }> {
    if (props.bands.length === 0) {
      return { width: 0, height: 0 };
    }
    if (!ctx.measureBands) {
      return { width: ctx.availableWidth, height: ctx.availableHeight };
    }
    const { totalHeight } = await ctx.measureBands(props.bands);
    return { width: ctx.availableWidth, height: totalHeight };
  },

  async render(props: FrameProps, ctx: RenderContext): Promise<void> {
    if (props.bands.length === 0 || !ctx.renderBands) {
      return;
    }
    await ctx.renderBands(props.bands);
  },
};
