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
  backgroundColor?: string;
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
  backgroundColor?: string;
  textAlign?: 'left' | 'center' | 'right';
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
