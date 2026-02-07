import type { JSONSchema } from '@jsonpdf/core';

/** Fit mode for chart image within element bounds. */
export type ChartFit = 'contain' | 'cover' | 'fill' | 'none';

export interface ChartProps {
  /** Vega-Lite specification object (fully resolved by renderer). */
  spec: Record<string, unknown>;
  /** Optional data array to inject as spec.data.values. */
  dataSource?: unknown[];
  /** How the chart image fits within the element bounds. Default 'contain'. */
  fit?: ChartFit;
  /** Scale factor for SVG rasterization. Default 2 (HiDPI). */
  scale?: number;
  /** Background color for the chart. If set, overrides spec.background. */
  background?: string;
}

export const chartPropsSchema: JSONSchema = {
  type: 'object',
  required: ['spec'],
  additionalProperties: false,
  properties: {
    spec: { type: 'object' },
    dataSource: { type: 'array' },
    fit: { type: 'string', enum: ['contain', 'cover', 'fill', 'none'] },
    scale: { type: 'number', minimum: 0.5 },
    background: { type: 'string' },
  },
};

export const CHART_DEFAULTS: ChartProps = {
  spec: {},
  fit: 'contain',
  scale: 2,
};
