import { rgb } from 'pdf-lib';
import { parseColor } from '@jsonpdf/core';
import type { ValidationError, JSONSchema } from '@jsonpdf/core';
import type { Plugin, MeasureContext, RenderContext } from '../types.js';

export interface LineProps {
  color?: string;
  thickness?: number;
  direction?: 'horizontal' | 'vertical';
  dashPattern?: number[];
}

export const linePropsSchema: JSONSchema = {
  type: 'object',
  properties: {
    color: { type: 'string' },
    thickness: { type: 'number', exclusiveMinimum: 0 },
    direction: { type: 'string', enum: ['horizontal', 'vertical'] },
    dashPattern: { type: 'array', items: { type: 'number', minimum: 0 } },
  },
};

const LINE_DEFAULTS: LineProps = { color: '#000000', thickness: 1, direction: 'horizontal' };

export const linePlugin: Plugin<LineProps> = {
  type: 'line',
  propsSchema: linePropsSchema,
  defaultProps: LINE_DEFAULTS,

  resolveProps(raw: Record<string, unknown>): LineProps {
    return { ...LINE_DEFAULTS, ...raw } as LineProps;
  },

  validate(props: LineProps): ValidationError[] {
    const errors: ValidationError[] = [];
    if (
      props.color !== undefined &&
      typeof props.color === 'string' &&
      !props.color.startsWith('#')
    ) {
      errors.push({ path: '/color', message: 'color must be a hex string starting with #' });
    }
    if (props.thickness !== undefined && props.thickness <= 0) {
      errors.push({ path: '/thickness', message: 'thickness must be greater than 0' });
    }
    return errors;
  },

  measure(props: LineProps, ctx: MeasureContext): Promise<{ width: number; height: number }> {
    const thickness = props.thickness ?? 1;
    if (props.direction === 'vertical') {
      return Promise.resolve({ width: thickness, height: ctx.availableHeight });
    }
    return Promise.resolve({ width: ctx.availableWidth, height: thickness });
  },

  render(props: LineProps, ctx: RenderContext): Promise<void> {
    const thickness = props.thickness ?? 1;
    const color = parseColor(props.color ?? '#000000');
    const pdfColor = rgb(color.r, color.g, color.b);

    if (props.direction === 'vertical') {
      const lineX = ctx.x + ctx.width / 2;
      ctx.page.drawLine({
        start: { x: lineX, y: ctx.y },
        end: { x: lineX, y: ctx.y - ctx.height },
        thickness,
        color: pdfColor,
        dashArray: props.dashPattern,
      });
    } else {
      const lineY = ctx.y - ctx.height / 2;
      ctx.page.drawLine({
        start: { x: ctx.x, y: lineY },
        end: { x: ctx.x + ctx.width, y: lineY },
        thickness,
        color: pdfColor,
        dashArray: props.dashPattern,
      });
    }

    return Promise.resolve();
  },
};
