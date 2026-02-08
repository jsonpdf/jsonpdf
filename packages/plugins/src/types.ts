import type { PDFDocument, PDFFont, PDFImage, PDFPage } from 'pdf-lib';
import type { Band, Element, Style, JSONSchema, ValidationError } from '@jsonpdf/core';

/** An embedded image with its natural dimensions. */
export interface EmbeddedImage {
  image: PDFImage;
  width: number;
  height: number;
}

/** Cache for embedded images. Deduplicates loads for the same src. */
export interface ImageCache {
  getOrEmbed(src: string, doc: PDFDocument): Promise<EmbeddedImage>;
}

/** Map of font key to embedded PDFFont. */
export type FontMap = Map<string, PDFFont>;

/** Build a font key from style properties. */
export function fontKey(
  family: string,
  weight: 'normal' | 'bold',
  style: 'normal' | 'italic',
): string {
  return `${family}:${weight}:${style}`;
}

/** Context available during the measure pass. */
export interface MeasureContext {
  /** Embedded fonts keyed by fontKey(). */
  fonts: FontMap;
  /** Available width for the element content (element width minus padding). */
  availableWidth: number;
  /** Available height for the element content (element height minus padding). */
  availableHeight: number;
  /** Resolve a named style to its full Style object. */
  resolveStyle: (name: string) => Style;
  /** The element's computed style (defaults + named + overrides merged). */
  elementStyle: Style;
  /** The pdf-lib document (needed for embedding images). */
  pdfDoc: PDFDocument;
  /** Image cache for deduplicating image loads. */
  imageCache: ImageCache;
  /** Child elements for container plugins (from Element.elements). */
  children?: Element[];
  /** Measure a child element's content size. Only available for container plugins. */
  measureChild?: (element: Element) => Promise<{ width: number; height: number }>;
  /** Expand and measure nested bands. Only available for frame plugins. */
  measureBands?: (bands: Band[]) => Promise<{ totalHeight: number }>;
}

/** Context available during the render pass. */
export interface RenderContext extends MeasureContext {
  /** The pdf-lib page to draw on. */
  page: PDFPage;
  /** X position of the content area in pdf-lib coordinates. */
  x: number;
  /** Y position of the top of the content area in pdf-lib coordinates. */
  y: number;
  /** Content width (element width minus padding). */
  width: number;
  /** Content height (element height minus padding, may be measured). */
  height: number;
  /** Render a child element at an offset from the container's content area. */
  renderChild?: (element: Element, offsetX: number, offsetY: number) => Promise<void>;
  /** Expand and render nested bands within the frame's content area. Only available for frame plugins. */
  renderBands?: (bands: Band[]) => Promise<void>;
  /** Map from anchor ID to the PDFPage it appears on. For internal "#anchor" links. */
  anchorPageMap?: Map<string, PDFPage>;
  /** Opacity for this element (0-1). Plugins should pass this to pdf-lib draw calls. */
  opacity?: number;
}

/** An element plugin that can measure and render a specific element type. */
export interface Plugin<TProps = Record<string, unknown>> {
  /** Unique plugin type identifier (e.g., 'text', 'line', 'list'). */
  type: string;
  /** JSON Schema that validates element.properties for this plugin. */
  propsSchema: JSONSchema;
  /** Default properties. */
  defaultProps: TProps;
  /** Merge raw element properties with defaults to produce typed props. */
  resolveProps(raw: Record<string, unknown>): TProps;
  /** Custom validation beyond JSON Schema. */
  validate(props: TProps): ValidationError[];
  /** Measure content size (for autoHeight). */
  measure(props: TProps, ctx: MeasureContext): Promise<{ width: number; height: number }>;
  /** Render the element onto a PDF page. */
  render(props: TProps, ctx: RenderContext): Promise<void>;
  /** Whether this plugin supports splitting across page boundaries. */
  canSplit?: boolean;
  /** Split the element into two parts that fit within availableHeight.
   *  Returns null if the element cannot be meaningfully split. */
  split?: (
    props: TProps,
    ctx: MeasureContext,
    availableHeight: number,
  ) => Promise<{ fit: TProps; overflow: TProps } | null>;
}
