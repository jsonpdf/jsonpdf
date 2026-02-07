import * as vl from 'vega-lite';
import * as vega from 'vega';
import { rasterizeSvg } from '../image/svg-rasterizer.js';
import type { ChartProps } from './chart-types.js';

/** Cache for generated chart PNG data URIs. */
export type ChartCache = Map<string, Promise<string>>;

/** Create a new chart cache instance. */
export function createChartCache(): ChartCache {
  return new Map();
}

/** Build a deterministic cache key from resolved spec + scale. */
function cacheKey(spec: Record<string, unknown>, scale: number): string {
  return JSON.stringify({ s: spec, sc: scale });
}

/**
 * Build the final Vega-Lite spec by merging dataSource and background.
 */
export function buildFinalSpec(props: ChartProps): Record<string, unknown> {
  let spec = { ...props.spec };

  if (props.dataSource !== undefined) {
    spec = { ...spec, data: { values: props.dataSource } };
  }

  if (props.background !== undefined) {
    spec = { ...spec, background: props.background };
  }

  return spec;
}

/**
 * Generate a chart PNG data URI from a resolved Vega-Lite spec.
 *
 * Uses the provided cache to deduplicate calls with identical specs
 * (important because the two-pass renderer calls measure+render twice).
 */
export function generateChart(props: ChartProps, cache: ChartCache): Promise<string> {
  const finalSpec = buildFinalSpec(props);
  const scale = props.scale ?? 2;
  const key = cacheKey(finalSpec, scale);

  const existing = cache.get(key);
  if (existing) return existing;

  const promise = generateChartUncached(finalSpec, scale);
  promise.catch(() => cache.delete(key));
  cache.set(key, promise);
  return promise;
}

async function generateChartUncached(
  spec: Record<string, unknown>,
  scale: number,
): Promise<string> {
  // Step 1: Compile Vega-Lite spec to Vega spec
  let vegaSpec: vega.Spec;
  try {
    const result = vl.compile(spec as unknown as vl.TopLevelSpec);
    vegaSpec = result.spec;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Vega-Lite compilation failed: ${message}`);
  }

  // Step 2: Render Vega spec to SVG
  let svgString: string;
  const runtime = vega.parse(vegaSpec);
  const view = new vega.View(runtime, { renderer: 'none' });
  try {
    view.initialize();
    await view.runAsync();
    svgString = await view.toSVG();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Vega chart rendering failed: ${message}`);
  } finally {
    view.finalize();
  }

  // Step 3: Rasterize SVG to PNG
  const { pngBytes } = rasterizeSvg(svgString, scale);

  // Step 4: Convert to data URI
  const base64 = Buffer.from(pngBytes).toString('base64');
  return `data:image/png;base64,${base64}`;
}
