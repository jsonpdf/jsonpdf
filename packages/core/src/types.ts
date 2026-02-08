// ---- JSON Schema alias ----

/** A JSON Schema object (draft 2020-12). */
export type JSONSchema = Record<string, unknown>;

// ---- Validation ----

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
  keyword?: string;
}

// ---- Template ----

export interface Template {
  version: '1.0';
  name: string;
  description?: string;
  author?: string;
  license?: string;
  page: PageConfig;
  dataSchema: JSONSchema;
  styles: Record<string, Style>;
  fonts: FontDeclaration[];
  sections: Section[];
}

// ---- Page ----

export interface PageConfig {
  width: number;
  height: number;
  autoHeight?: boolean;
  orientation?: 'portrait' | 'landscape';
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

// ---- Section ----

export interface Section {
  id: string;
  name?: string;
  page?: Partial<PageConfig>;
  columns?: number;
  columnWidths?: number[];
  columnGap?: number;
  columnMode?: 'tile' | 'flow';
  bookmark?: string;
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
  id: string;
  type: BandType;
  height: number;
  autoHeight?: boolean;
  condition?: string;
  dataSource?: string;
  itemName?: string;
  groupBy?: string;
  float?: boolean;
  pageBreakBefore?: boolean;
  bookmark?: string;
  anchor?: string;
  backgroundColor?: BackgroundColor;
  elements: Element[];
}

// ---- Element ----

export interface Element {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  anchor?: string;
  style?: string;
  styleOverrides?: Partial<Style>;
  condition?: string;
  conditionalStyles?: ConditionalStyle[];
  properties: Record<string, unknown>;
  /** Child elements for container-like plugins. */
  elements?: Element[];
}

export interface ConditionalStyle {
  condition: string;
  style?: string;
  styleOverrides?: Partial<Style>;
}

// ---- Rich Text ----

export type RichContent = string | StyledRun[];

export interface StyledRun {
  text: string;
  style?: string;
  styleOverrides?: Partial<Style>;
  link?: string;
  footnote?: RichContent;
}

// ---- Gradient ----

export interface GradientStop {
  color: string;
  position: number;
}

export interface LinearGradient {
  type: 'linear';
  /** Angle in degrees. 0 = left-to-right, 90 = top-to-bottom. */
  angle: number;
  stops: GradientStop[];
}

export interface RadialGradient {
  type: 'radial';
  /** Center X as fraction (0–1, default 0.5). */
  cx?: number;
  /** Center Y as fraction (0–1, default 0.5). */
  cy?: number;
  /** Radius as fraction of the shorter dimension (0–1, default 0.5). */
  radius?: number;
  stops: GradientStop[];
}

export type Gradient = LinearGradient | RadialGradient;

/** A background color can be a hex string or a gradient object. */
export type BackgroundColor = string | Gradient;

// ---- Style ----

export interface BorderSide {
  width: number;
  color?: string;
}

export type PaddingValue = number | { top: number; right: number; bottom: number; left: number };

export interface Style {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through' | 'underline line-through';
  color?: string;
  backgroundColor?: BackgroundColor;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
  letterSpacing?: number;
  borderWidth?: number;
  borderColor?: string;
  borderTop?: BorderSide;
  borderRight?: BorderSide;
  borderBottom?: BorderSide;
  borderLeft?: BorderSide;
  borderRadius?: number;
  padding?: PaddingValue;
  opacity?: number;
  widows?: number;
  orphans?: number;
}

// ---- Font ----

export interface FontDeclaration {
  family: string;
  weight?: number;
  style?: 'normal' | 'italic';
  src: string;
}
