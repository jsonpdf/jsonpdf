// ---- JSON Schema alias ----

/** A JSON Schema object (draft 2020-12). */
export type JSONSchema = Record<string, unknown>;

// ---- Validation ----

export interface ValidationResult {
  /** Whether the validated input conforms to the schema. */
  valid: boolean;
  /** List of validation errors (empty when valid). */
  errors: ValidationError[];
}

export interface ValidationError {
  /** JSON Pointer path to the invalid property (e.g. "/sections/0/bands/1"). */
  path: string;
  /** Human-readable error description. */
  message: string;
  /** JSON Schema keyword that triggered the error (e.g. "required", "type"). */
  keyword?: string;
}

// ---- Template ----

export interface Template {
  /** Template format version. Currently only '1.0'. */
  version: '1.0';
  /** Display name for the template. */
  name: string;
  /** Optional description of what the template produces. */
  description?: string;
  /** Optional author name or organization. */
  author?: string;
  /** Optional license identifier (e.g. "MIT"). */
  license?: string;
  /** Default page configuration applied to all sections. */
  page: PageConfig;
  /** JSON Schema (draft 2020-12) describing the expected input data shape. */
  dataSchema: JSONSchema;
  /** Named style definitions that can be referenced by elements and styled runs. */
  styles: Record<string, Style>;
  /** Custom font declarations with source paths or URLs. */
  fonts: FontDeclaration[];
  /** Ordered list of document sections. */
  sections: Section[];
}

// ---- Page ----

export interface PageConfig {
  /** Page width in points (1 pt = 1/72 inch). */
  width: number;
  /** Page height in points (1 pt = 1/72 inch). */
  height: number;
  /** When true, page height grows to fit content (ignores declared height). */
  autoHeight?: boolean;
  /** Page orientation hint. Width and height are the canonical dimensions. */
  orientation?: 'portrait' | 'landscape';
  /** Page margins in points. */
  margins: {
    /** Top margin in points. */
    top: number;
    /** Right margin in points. */
    right: number;
    /** Bottom margin in points. */
    bottom: number;
    /** Left margin in points. */
    left: number;
  };
}

// ---- Section ----

export interface Section {
  /** Unique section identifier. */
  id: string;
  /** Optional display name for the section. */
  name?: string;
  /** Section-level page config overrides (merged with template-level defaults). */
  page?: Partial<PageConfig>;
  /** Number of columns (default 1). */
  columns?: number;
  /** Relative column width ratios for asymmetric columns (length must match `columns`). */
  columnWidths?: number[];
  /** Gap between columns in points (default 0). */
  columnGap?: number;
  /** Column fill mode: "tile" renders each column independently, "flow" reflows text across columns. */
  columnMode?: 'tile' | 'flow';
  /** Bookmark title for this section in the PDF outline (level 0). */
  bookmark?: string;
  /** Ordered list of bands in this section. */
  bands: Band[];
}

// ---- Band ----

export type BandType =
  | 'title'
  | 'pageHeader'
  | 'pageFooter'
  | 'lastPageFooter'
  | 'columnHeader'
  | 'detail'
  | 'columnFooter'
  | 'summary'
  | 'body'
  | 'background'
  | 'noData'
  | 'groupHeader'
  | 'groupFooter';

export interface Band {
  /** Unique band identifier. */
  id: string;
  /** Band type determining its structural role and rendering order. */
  type: BandType;
  /** Declared band height in points. */
  height: number;
  /** When true, band height grows to fit its tallest element. */
  autoHeight?: boolean;
  /** Raw Liquid expression (without {{ }}) — band renders only when truthy. */
  condition?: string;
  /** Data path or special source (e.g. "_bookmarks") for detail band iteration. */
  dataSource?: string;
  /** Variable name for the current iteration item (default "item"). */
  itemName?: string;
  /** Property path to group detail items by (creates groupHeader/groupFooter pairs). */
  groupBy?: string;
  /** When true, columnFooter floats up to sit just below content instead of fixed at column bottom. */
  float?: boolean;
  /** When true, a page break is inserted before this band. */
  pageBreakBefore?: boolean;
  /** Bookmark title for this band in the PDF outline (level 1). */
  bookmark?: string;
  /** Cross-reference anchor ID for internal links via {{ ref("id") }}. */
  anchor?: string;
  /** Band background color — hex string or gradient object. */
  backgroundColor?: BackgroundColor;
  /** Elements rendered inside this band. */
  elements: Element[];
}

// ---- Element ----

export interface Element {
  /** Unique element identifier. */
  id: string;
  /** Plugin type name (e.g. "text", "image", "line", "shape", "table", "chart"). */
  type: string;
  /** Horizontal position in points relative to the band's left edge. */
  x: number;
  /** Vertical position in points relative to the band's top edge. */
  y: number;
  /** Element width in points. */
  width: number;
  /** Element height in points. */
  height: number;
  /** Clockwise rotation in degrees around the element's center. */
  rotation?: number;
  /** Cross-reference anchor ID for internal links via {{ ref("id") }}. */
  anchor?: string;
  /** Named style reference from the template's `styles` map. */
  style?: string;
  /** Inline style overrides merged on top of the named style. */
  styleOverrides?: Partial<Style>;
  /** Raw Liquid expression (without {{ }}) — element renders only when truthy. */
  condition?: string;
  /** Conditional style rules evaluated in order; first matching condition wins. */
  conditionalStyles?: ConditionalStyle[];
  /** Plugin-specific properties (content, src, listType, etc.). */
  properties: Record<string, unknown>;
  /** Child elements for container-like plugins. */
  elements?: Element[];
}

export interface ConditionalStyle {
  /** Raw Liquid expression (without {{ }}) — style applies when truthy. */
  condition: string;
  /** Named style reference to apply when condition is met. */
  style?: string;
  /** Inline style overrides to apply when condition is met. */
  styleOverrides?: Partial<Style>;
}

// ---- Rich Text ----

export type RichContent = string | StyledRun[];

export interface StyledRun {
  /** The text content of this run. */
  text: string;
  /** Named style reference from the template's `styles` map. */
  style?: string;
  /** Inline style overrides for this run. */
  styleOverrides?: Partial<Style>;
  /** Hyperlink URL (external) or internal anchor reference (e.g. "#anchorId"). */
  link?: string;
  /** Footnote content displayed at the bottom of the page with a superscript marker. */
  footnote?: RichContent;
}

// ---- Gradient ----

export interface GradientStop {
  /** Hex color string (e.g. "#ff0000"). */
  color: string;
  /** Position along the gradient axis (0–1). */
  position: number;
}

export interface LinearGradient {
  /** Discriminator for linear gradients. */
  type: 'linear';
  /** Angle in degrees. 0 = left-to-right, 90 = top-to-bottom. */
  angle: number;
  /** Color stops (minimum 2). */
  stops: GradientStop[];
}

export interface RadialGradient {
  /** Discriminator for radial gradients. */
  type: 'radial';
  /** Center X as fraction (0–1, default 0.5). */
  cx?: number;
  /** Center Y as fraction (0–1, default 0.5). */
  cy?: number;
  /** Radius as fraction of the shorter dimension (0–1, default 0.5). */
  radius?: number;
  /** Color stops (minimum 2). */
  stops: GradientStop[];
}

export type Gradient = LinearGradient | RadialGradient;

/** A background color can be a hex string or a gradient object. */
export type BackgroundColor = string | Gradient;

// ---- Style ----

export interface BorderSide {
  /** Border width in points. */
  width: number;
  /** Border color as hex string (defaults to borderColor or "#000000"). */
  color?: string;
}

export type PaddingValue = number | { top: number; right: number; bottom: number; left: number };

export interface Style {
  /** Font family name (e.g. "Helvetica", "Times-Roman", or a custom font family). */
  fontFamily?: string;
  /** Font size in points (must be > 0). */
  fontSize?: number;
  /** Font weight. */
  fontWeight?: 'normal' | 'bold';
  /** Font style. */
  fontStyle?: 'normal' | 'italic';
  /** Text decoration applied to rendered text. */
  textDecoration?: 'none' | 'underline' | 'line-through' | 'underline line-through';
  /** Text color as hex string (e.g. "#000000"). */
  color?: string;
  /** Background fill — hex string or gradient object. */
  backgroundColor?: BackgroundColor;
  /** Horizontal text alignment. */
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  /** Line height as a multiplier of font size (e.g. 1.2). */
  lineHeight?: number;
  /** Extra spacing between characters in points. */
  letterSpacing?: number;
  /** Uniform border width in points (used when individual borders are not set). */
  borderWidth?: number;
  /** Uniform border color as hex string (used when individual borders are not set). */
  borderColor?: string;
  /** Top border (overrides borderWidth/borderColor for top side). */
  borderTop?: BorderSide;
  /** Right border (overrides borderWidth/borderColor for right side). */
  borderRight?: BorderSide;
  /** Bottom border (overrides borderWidth/borderColor for bottom side). */
  borderBottom?: BorderSide;
  /** Left border (overrides borderWidth/borderColor for left side). */
  borderLeft?: BorderSide;
  /** Border corner radius in points. When set, individual borders are ignored. */
  borderRadius?: number;
  /** Padding inside the element — uniform number or per-side object. */
  padding?: PaddingValue;
  /** Element opacity (0 = fully transparent, 1 = fully opaque). */
  opacity?: number;
  /** Minimum lines of a paragraph to keep at the top of a page/column after a break. */
  widows?: number;
  /** Minimum lines of a paragraph to keep at the bottom of a page/column before a break. */
  orphans?: number;
}

// ---- Font ----

export interface FontDeclaration {
  /** Font family name (must match fontFamily references in styles). */
  family: string;
  /** Font weight as a numeric value (e.g. 400 for normal, 700 for bold). */
  weight?: number;
  /** Font style variant. */
  style?: 'normal' | 'italic';
  /** Path or URL to the font file (.ttf, .otf, .woff). */
  src: string;
}
