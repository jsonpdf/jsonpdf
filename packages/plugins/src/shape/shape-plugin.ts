import { rgb } from 'pdf-lib';
import { parseColor } from '@jsonpdf/core';
import type { ValidationError, JSONSchema } from '@jsonpdf/core';
import type { Plugin, MeasureContext, RenderContext } from '../types.js';

export interface ShapeProps {
  shapeType: 'rect' | 'circle' | 'ellipse';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  dashPattern?: number[];
  borderRadius?: number;
}

export const shapePropsSchema: JSONSchema = {
  type: 'object',
  required: ['shapeType'],
  properties: {
    shapeType: { type: 'string', enum: ['rect', 'circle', 'ellipse'] },
    fill: { type: 'string' },
    stroke: { type: 'string' },
    strokeWidth: { type: 'number', minimum: 0 },
    dashPattern: { type: 'array', items: { type: 'number', minimum: 0 } },
    borderRadius: { type: 'number', minimum: 0 },
  },
};

const SHAPE_DEFAULTS: ShapeProps = { shapeType: 'rect' };

/**
 * Build an SVG path string for a rounded rectangle.
 * The path is relative to origin (0, 0) for use with page.drawSvgPath().
 * Note: SVG path Y-axis goes downward, but pdf-lib's drawSvgPath
 * interprets the path in pdf-lib coordinates (Y-axis up). We build
 * the path accordingly — M starts at top-left in pdf-lib coords.
 */
export function roundedRectPath(w: number, h: number, r: number): string {
  // Clamp radius to half the smallest dimension
  const cr = Math.min(r, w / 2, h / 2);
  // In pdf-lib coordinate space: Y increases upward.
  // SVG path rendered by drawSvgPath: Y increases downward in path, but
  // pdf-lib flips it. So we draw the path as if Y goes down (SVG convention).
  return [
    `M ${String(cr)} 0`,
    `L ${String(w - cr)} 0`,
    `Q ${String(w)} 0 ${String(w)} ${String(cr)}`,
    `L ${String(w)} ${String(h - cr)}`,
    `Q ${String(w)} ${String(h)} ${String(w - cr)} ${String(h)}`,
    `L ${String(cr)} ${String(h)}`,
    `Q 0 ${String(h)} 0 ${String(h - cr)}`,
    `L 0 ${String(cr)}`,
    `Q 0 0 ${String(cr)} 0`,
    'Z',
  ].join(' ');
}

export const shapePlugin: Plugin<ShapeProps> = {
  type: 'shape',
  propsSchema: shapePropsSchema,
  defaultProps: SHAPE_DEFAULTS,

  resolveProps(raw: Record<string, unknown>): ShapeProps {
    return { ...SHAPE_DEFAULTS, ...raw } as ShapeProps;
  },

  validate(props: ShapeProps): ValidationError[] {
    const errors: ValidationError[] = [];
    if (!['rect', 'circle', 'ellipse'].includes(props.shapeType)) {
      errors.push({ path: '/shapeType', message: 'shapeType must be rect, circle, or ellipse' });
    }
    if (props.fill !== undefined && typeof props.fill === 'string' && !props.fill.startsWith('#')) {
      errors.push({ path: '/fill', message: 'fill must be a hex string starting with #' });
    }
    if (
      props.stroke !== undefined &&
      typeof props.stroke === 'string' &&
      !props.stroke.startsWith('#')
    ) {
      errors.push({ path: '/stroke', message: 'stroke must be a hex string starting with #' });
    }
    if (props.strokeWidth !== undefined && props.strokeWidth < 0) {
      errors.push({ path: '/strokeWidth', message: 'strokeWidth must be >= 0' });
    }
    if (props.borderRadius !== undefined && props.borderRadius < 0) {
      errors.push({ path: '/borderRadius', message: 'borderRadius must be >= 0' });
    }
    return errors;
  },

  measure(_props: ShapeProps, ctx: MeasureContext): Promise<{ width: number; height: number }> {
    return Promise.resolve({ width: ctx.availableWidth, height: ctx.availableHeight });
  },

  render(props: ShapeProps, ctx: RenderContext): Promise<void> {
    const fillColor = props.fill ? parseColor(props.fill) : undefined;
    const strokeColor = props.stroke ? parseColor(props.stroke) : undefined;
    const strokeWidth = props.strokeWidth ?? (props.stroke ? 1 : 0);

    const pdfFill = fillColor ? rgb(fillColor.r, fillColor.g, fillColor.b) : undefined;
    const pdfStroke = strokeColor ? rgb(strokeColor.r, strokeColor.g, strokeColor.b) : undefined;

    switch (props.shapeType) {
      case 'rect': {
        if (props.borderRadius && props.borderRadius > 0) {
          const path = roundedRectPath(ctx.width, ctx.height, props.borderRadius);
          ctx.page.drawSvgPath(path, {
            x: ctx.x,
            y: ctx.y,
            color: pdfFill,
            borderColor: pdfStroke,
            borderWidth: strokeWidth,
            borderDashArray: props.dashPattern,
            opacity: ctx.opacity,
            borderOpacity: ctx.opacity,
          });
        } else {
          ctx.page.drawRectangle({
            x: ctx.x,
            y: ctx.y - ctx.height,
            width: ctx.width,
            height: ctx.height,
            color: pdfFill,
            borderColor: pdfStroke,
            borderWidth: strokeWidth,
            borderDashArray: props.dashPattern,
            opacity: ctx.opacity,
            borderOpacity: ctx.opacity,
          });
        }
        break;
      }
      case 'circle': {
        const radius = Math.min(ctx.width, ctx.height) / 2;
        const centerX = ctx.x + ctx.width / 2;
        const centerY = ctx.y - ctx.height / 2;
        ctx.page.drawCircle({
          x: centerX,
          y: centerY,
          size: radius,
          color: pdfFill,
          borderColor: pdfStroke,
          borderWidth: strokeWidth,
          borderDashArray: props.dashPattern,
          opacity: ctx.opacity,
          borderOpacity: ctx.opacity,
        });
        break;
      }
      case 'ellipse': {
        const centerX = ctx.x + ctx.width / 2;
        const centerY = ctx.y - ctx.height / 2;
        ctx.page.drawEllipse({
          x: centerX,
          y: centerY,
          xScale: ctx.width / 2,
          yScale: ctx.height / 2,
          color: pdfFill,
          borderColor: pdfStroke,
          borderWidth: strokeWidth,
          borderDashArray: props.dashPattern,
          opacity: ctx.opacity,
          borderOpacity: ctx.opacity,
        });
        break;
      }
    }

    return Promise.resolve();
  },
};
