# Architecture

This document describes the JsonPDF template schema, plugin system, rendering pipeline, and key design decisions.

## Content Model: Sections > Bands > Elements

JsonPDF uses a three-level content hierarchy inspired by [JasperReports](https://community.jaspersoft.com/downloads/community-edition/).

**Sections** group related bands and define page configuration. Each section can specify its own page size, orientation, and margins — enabling mixed layouts within a single document (e.g., portrait cover page followed by landscape data tables). A section can span multiple rendered pages.

**Bands** define content flow and data binding. They stack vertically within a section, and the renderer creates pages automatically when content overflows. Band types control when and how often a band renders (once, per page, per data record, etc.).

**Elements** are visual primitives positioned absolutely (x, y) within their containing band. This model works well for both the drag-and-drop editor and the renderer.

## Template Schema

All measurements are in **points** (1/72 inch). The editor can display in mm, inches, or points based on user preference, but the schema stores points. The coordinate system uses a **top-left origin** (the renderer translates to pdf-lib's bottom-left internally).

### Type Definitions

```typescript
interface Template {
  version: "1.0";
  name: string;
  description?: string;
  author?: string;
  license?: string;

  /** Default page config; sections can override */
  page: PageConfig;

  /** JSON Schema (draft 2020-12) defining expected input data */
  dataSchema: JSONSchema;

  /** Reusable named styles */
  styles: Record<string, Style>;

  /** Font declarations */
  fonts: FontDeclaration[];

  /** Ordered list of sections */
  sections: Section[];
}

interface PageConfig {
  width: number;          // in points (612 = US Letter, 595 = A4)
  height: number;         // in points (792 = US Letter, 842 = A4)
  autoHeight?: boolean;   // if true, page height grows to fit content (Phase 3)
  orientation?: "portrait" | "landscape";
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

interface Section {
  id: string;
  name?: string;
  page?: Partial<PageConfig>;   // overrides template-level page config
  columns?: number;             // multi-column layout (default: 1)
  columnWidths?: number[];      // asymmetric column widths as ratios (e.g., [1, 2]) (Phase 3)
  columnGap?: number;           // gap between columns in points
  columnMode?: "tile" | "flow"; // "tile" (default): detail bands fill columns; "flow": text reflows across columns (Phase 8)
  bookmark?: string;            // PDF outline entry (Liquid expression supported)
  bands: Band[];
}

interface Band {
  id: string;
  type: BandType;
  height: number;               // declared height in points
  autoHeight?: boolean;         // if true, height is minimum; band grows to fit
  condition?: string;           // Liquid expression; band skipped if falsy
  dataSource?: string;          // dot-path to array (for detail bands)
  itemName?: string;            // loop variable name (default: "item")
  groupBy?: string;             // dot-path for group bands
  float?: boolean;              // for columnFooter: sit under last detail row
  pageBreakBefore?: boolean;    // force a page break before this band
  bookmark?: string;            // PDF outline entry (Liquid expression supported)
  anchor?: string;              // cross-reference target (use {{ ref("id") }} to get page number)
  backgroundColor?: string;
  elements: Element[];
}

type BandType =
  | "title"           // once, first page only
  | "pageHeader"      // top of every page
  | "pageFooter"      // bottom of every page
  | "lastPageFooter"  // replaces pageFooter on final page
  | "columnHeader"    // before first detail, repeats after page breaks
  | "detail"          // repeats per record in dataSource
  | "columnFooter"    // after detail rows on each page
  | "summary"         // once, after all detail rows
  | "body"            // static content, no data binding iteration
  | "background"      // behind all content on every page
  | "noData"          // shown when dataSource is empty
  | "groupHeader"     // when groupBy expression changes (Phase 2)
  | "groupFooter";    // before groupBy expression changes (Phase 2)

interface Element {
  id: string;
  type: string;                 // matches a plugin type (e.g., "text", "image")
  x: number;                    // horizontal position within band
  y: number;                    // vertical position within band
  width: number;
  height: number;
  rotation?: number;            // rotation in degrees (clockwise)
  anchor?: string;              // cross-reference target (use {{ ref("id") }} to get page number)
  style?: string;               // reference to a named style
  styleOverrides?: Partial<Style>;
  condition?: string;           // Liquid expression
  conditionalStyles?: Array<{   // dynamic style selection
    condition: string;          // Liquid expression
    style?: string;
    styleOverrides?: Partial<Style>;
  }>;
  properties: Record<string, unknown>;  // plugin-specific props
}

/**
 * Rich text content: either a plain string or an array of styled runs.
 * Plain strings are used for simple text; styled runs enable mixed
 * formatting within a single text element.
 */
type RichContent = string | StyledRun[];

interface StyledRun {
  text: string;                 // text content (supports Liquid expressions)
  style?: string;               // reference to a named style
  styleOverrides?: Partial<Style>;  // inline style overrides for this run
  link?: string;                // URL or internal bookmark reference
  footnote?: RichContent;        // footnote content, rendered at page bottom (Phase 8)
}

interface Style {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline" | "line-through" | "underline line-through";
  color?: string;
  backgroundColor?: string;
  textAlign?: "left" | "center" | "right";
  lineHeight?: number;
  letterSpacing?: number;
  borderWidth?: number;
  borderColor?: string;
  borderTop?: { width: number; color?: string };
  borderRight?: { width: number; color?: string };
  borderBottom?: { width: number; color?: string };
  borderLeft?: { width: number; color?: string };
  borderRadius?: number;
  padding?: number | { top: number; right: number; bottom: number; left: number };
  opacity?: number;
  widows?: number;              // minimum lines at top of page after break (Phase 2)
  orphans?: number;             // minimum lines at bottom of page before break (Phase 2)
}

interface FontDeclaration {
  family: string;
  weight?: number;
  style?: "normal" | "italic";
  src: string;  // URL, file path, or fontsource identifier
}
```

## Band Types

| Band Type | Renders | Description |
|-----------|---------|-------------|
| `background` | Every page, behind all content | Watermarks, page borders, letterhead backgrounds |
| `title` | Once, first page only | Cover page content, report title |
| `pageHeader` | Top of every page | Running headers, logo, document title |
| `columnHeader` | Before first detail row, repeats after page breaks | Table column headers |
| `detail` | Once per record in `dataSource` | The main repeating content band |
| `columnFooter` | After detail rows on each page | Per-page subtotals. `float: true` sits under last detail row |
| `pageFooter` | Bottom of every page | Page numbers, running footers |
| `lastPageFooter` | Replaces `pageFooter` on the final page | Signatures, "end of report" |
| `summary` | Once, after all detail rows | Grand totals, conclusions |
| `body` | Once, in document flow | Static content (certificates, letters, free-form sections) |
| `noData` | Only when `dataSource` is empty | "No records found" fallback |
| `groupHeader` | When `groupBy` expression changes | Group break headers (Phase 2) |
| `groupFooter` | Before `groupBy` expression changes | Group subtotals (Phase 2) |

## Multi-Column Sections

Sections support a `columns` property for grid-style layouts like product catalogs or card grids. When `columns` is set, the renderer:

1. Computes column width: `(contentWidth - (columns - 1) * columnGap) / columns`
2. Fills `detail` bands left-to-right across columns, then wraps to the next row
3. Renders `columnHeader` at the top of each column group, repeating after page breaks
4. Renders `columnFooter` at the bottom of each page's column group
5. Element positions within the detail band are relative to the column — the template author doesn't manage column offsets

```json
{
  "id": "product-catalog",
  "columns": 3,
  "columnGap": 10,
  "bands": [
    {
      "type": "detail",
      "dataSource": "products",
      "height": 200,
      "elements": [
        { "type": "image", "x": 0, "y": 0, "width": 160, "height": 120,
          "properties": { "src": "{{ item.image }}" } },
        { "type": "text", "x": 0, "y": 130, "width": 160, "height": 20,
          "styleOverrides": { "fontWeight": "bold" },
          "properties": { "content": "{{ item.name }}" } },
        { "type": "text", "x": 0, "y": 155, "width": 160, "height": 20,
          "properties": { "content": "{{ item.price | money }}" } }
      ]
    }
  ]
}
```

This is the same mechanism that makes `columnHeader` and `columnFooter` band types meaningful — they were designed for multi-column layouts in JasperReports. Single-column sections (the default) use `columnHeader`/`columnFooter` as table header/footer bands.

## Rich Text

Text content uses the `RichContent` type — either a plain string for simple text, or an array of `StyledRun` objects for mixed formatting within a single element:

Simple — plain string:

```json
{ "content": "Total: {{ total | money }}" }
```

Rich — styled runs with per-segment formatting:

```json
{ "content": [
    { "text": "Invoice for " },
    { "text": "{{ client.name }}", "styleOverrides": { "fontWeight": "bold" } },
    { "text": " — " },
    { "text": "OVERDUE", "styleOverrides": {
        "color": "#e74c3c",
        "fontWeight": "bold",
        "textDecoration": "underline"
      }
    }
  ]
}
```

Each run inherits the element's base style and can override any style property — font size, weight, color, decoration, etc. This enables mixed formatting without a markup parser, and maps directly to selectable spans in the editor.

## Element Types (Plugins)

Each element type is implemented as a plugin with a standardized interface:

```typescript
interface Plugin<TProps = Record<string, unknown>> {
  type: string;                                    // unique identifier
  propsSchema: JSONSchema;                         // validates element properties
  defaultProps: TProps;                            // sensible defaults
  validate(props: TProps): ValidationError[];      // custom validation
  measure(props: TProps, ctx: MeasureContext): Promise<{ width: number; height: number }>;
  render(props: TProps, ctx: RenderContext): Promise<void>;
  editorComponent?: React.ComponentType;           // optional: drag-and-drop canvas
  propPanelComponent?: React.ComponentType;        // optional: property editor UI
}
```

The `measure()` function is critical — it enables the two-pass rendering pipeline (measure all content first to compute page breaks, then render).

### Phase 1 Plugins

| Plugin | Properties | Description |
|--------|-----------|-------------|
| `text` | `content: RichContent`, `autoHeight` | Text with rich formatting, word wrapping, multi-line. Content is a plain string or array of styled runs. |
| `line` | `color`, `thickness`, `direction`, `dashPattern` | Horizontal/vertical lines, dividers. `dashPattern` is an array of dash/gap lengths (e.g., `[4, 2]` for dashed, `[1, 2]` for dotted). |
| `list` | `listType`, `items`, `bulletStyle`, `indent`, `itemSpacing` | Bullet, numbered, or lettered lists with nesting. Items use `RichContent` for mixed formatting. |

### Phase 3 Plugins

| Plugin | Properties | Description |
|--------|-----------|-------------|
| `image` | `src`, `fit`, `alt` | Images from URL, file path, or base64. Supports JPEG, PNG, and SVG. SVGs are rasterized at high DPI (default 300) for embedding. Fit modes: contain, cover, fill. |
| `container` | `layout`, `columns`, `gap`, `elements` | Groups child elements. Layout: horizontal, vertical, absolute, or grid. Grid mode uses `columns` for static multi-column layouts. |
| `shape` | `shapeType`, `fill`, `stroke`, `strokeWidth`, `dashPattern` | Rectangle, circle, ellipse primitives with fill and stroke styling |

### Phase 5 Plugins

| Plugin | Properties | Description |
|--------|-----------|-------------|
| `table` | `dataSource`, `columns`, `borders`, `headerStyle`, `cellStyle` | Declarative tables with auto page-break support |
| `chart` | `spec`, `dataSource` | Charts via Vega-Lite. Rendered to image then embedded |
| `barcode` | `value`, `format` | Barcodes and QR codes via bwip-js |
| `frame` | `bands` | A nested band container (similar to JasperReports subreports). Contains its own bands with independent data iteration and page-break logic. Enables side-by-side repeating content like two tables with different data sources. |

## Packages

### `@jsonpdf/core`

Shared types, utilities, and validation helpers used by all packages.

- TypeScript interfaces (Template, Section, Band, Element, Style, Plugin, etc.)
- Unit conversion utilities (points, mm, inches)
- Color parsing
- ID generation
- JSON Schema validation via `ajv`

### `@jsonpdf/template`

Template schema and methods for creating, editing, and validating templates. All manipulation functions are **immutable** — they return a new `Template` object, leaving the original unchanged. This enables undo/redo in the editor via simple state snapshots.

> **Phasing**: Phase 1 implements Factory & Validation plus basic `add*` helpers. The full manipulation API (update, remove, move, clone, queries) ships in Phase 6 alongside the editor.

**Factory & Validation**

- `createTemplate(overrides?)` — factory with sensible defaults
- `validateTemplate(template)` — schema + data schema validation
- `migrateTemplate(template)` — version migration (`v1 → v2`) for forward compatibility

**Section Operations**

- `addSection(template, section, index?)` — insert section at position (default: end)
- `updateSection(template, sectionId, changes)` — update section properties (page config, columns, etc.)
- `removeSection(template, sectionId)` — remove section and all its bands/elements
- `moveSection(template, sectionId, newIndex)` — reorder section within template

**Band Operations**

- `addBand(template, sectionId, band, index?)` — insert band into section
- `updateBand(template, bandId, changes)` — update band properties (height, condition, dataSource, etc.)
- `removeBand(template, bandId)` — remove band and all its elements
- `moveBand(template, bandId, targetSectionId, newIndex)` — reorder or move band between sections

**Element Operations**

- `addElement(template, bandId, element, index?)` — insert element into band
- `updateElement(template, elementId, changes)` — update position, size, properties, style, etc.
- `removeElement(template, elementId)` — remove element from its band
- `moveElement(template, elementId, targetBandId, index?)` — move element between bands
- `reorderElement(template, elementId, newIndex)` — change z-order within band

**Style Operations**

- `addStyle(template, name, style)` — add a named style
- `updateStyle(template, name, changes)` — update a named style
- `removeStyle(template, name)` — remove style (fails if referenced by elements)
- `renameStyle(template, oldName, newName)` — rename and update all element references

**Font Operations**

- `addFont(template, font)` — add a font declaration
- `removeFont(template, family, weight?, style?)` — remove a font declaration

**Template-Level**

- `updateMetadata(template, changes)` — update name, description, author, license
- `updatePageDefaults(template, pageConfig)` — update default page config
- `updateDataSchema(template, schema)` — update the data schema

**Cloning & Queries**

- `cloneElement(template, elementId, targetBandId?)` — deep copy with new IDs (for duplicate/paste)
- `cloneBand(template, bandId, targetSectionId?)` — deep copy band and all elements with new IDs
- `cloneSection(template, sectionId)` — deep copy section and all bands/elements with new IDs
- `getElementById(template, elementId)` — find element by ID
- `getBandById(template, bandId)` — find band by ID
- `getSectionById(template, sectionId)` — find section by ID
- `getElementsByStyle(template, styleName)` — find all elements referencing a style

### `@jsonpdf/plugins`

Element type implementations. Each plugin is self-contained with measure, render, and optional editor components.

**Dependencies**: `pdf-lib`, `@pdf-lib/fontkit`, `@resvg/resvg-js`

### `@jsonpdf/renderer`

Takes a template + data and produces a PDF. This is the most complex package.

**Pipeline**:
1. **Validate** — Check template schema + data against `dataSchema`
2. **Resolve** — Process LiquidJS expressions with provided data
3. **Measure** — Call each plugin's `measure()` to compute element/band sizes
4. **Layout** — Allocate bands to pages, handle page breaks, compute final positions
5. **Render** — Call each plugin's `render()` to draw onto pdf-lib pages

**Two-pass rendering**: The layout engine runs twice — first to determine total page count, then to render with `_totalPages` resolved. Measurement results are cached between passes.

**Dependencies**: `pdf-lib`, `@pdf-lib/fontkit`, `liquidjs`

LiquidJS lives exclusively in the renderer. Plugins never touch it — they receive fully resolved values.

### `@jsonpdf/cli`

Command line tool for template management and rendering.

**Dependencies**: `commander`, `chalk`

### `@jsonpdf/editor`

Visual drag-and-drop template designer. Designed to run locally (via CLI) or in a future SaaS context.

- Canvas rendering with React Konva
- Element selection, drag, resize with alignment guides
- Property panel (auto-generated from plugin `propsSchema`)
- Band and section management
- Live PDF preview via the renderer
- Template import/export (JSON)
- Sample data editing

**Dependencies**: `react`, `react-dom`, `konva`, `react-konva`

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Content model | Sections > Bands > Elements | Bands flow vertically with automatic pagination. Sections allow mixed page sizes/orientations. Proven model from JasperReports. |
| Pages | Rendering artifact | Pages are created by the renderer, not defined in the template. Supports both fixed layouts (certificates) and dynamic content (invoices with variable line items). |
| Positioning | Absolute within bands | Elements use (x, y, width, height) relative to band origin. Ideal for drag-and-drop editing. Bands themselves stack vertically. |
| Units | Points (1/72 inch) | Native PDF unit. Editor converts to mm/inches for display. |
| Coordinate origin | Top-left in schema | Intuitive for authors and the editor. Renderer translates to pdf-lib's bottom-left internally. |
| Data schema | JSON Schema (draft 2020-12) | Industry standard. Free validation via `ajv`. Interoperable with APIs. |
| Template expressions | LiquidJS | Mature syntax, filters, conditionals. Resolved by renderer before reaching plugins. |
| Styling | Named styles + inline overrides | Reusable styles without cascade complexity. Simple to serialize and reason about. |
| Plugin isolation | Plugins receive resolved values | Plugins never call LiquidJS. They get plain strings/numbers. This keeps them testable, decoupled, and swappable. |

## Example: Invoice Template

```json
{
  "version": "1.0",
  "name": "Standard Invoice",
  "description": "Professional invoice with dynamic line items",
  "author": "JsonPDF",

  "page": {
    "width": 612,
    "height": 792,
    "margins": { "top": 40, "right": 40, "bottom": 60, "left": 40 }
  },

  "dataSchema": {
    "type": "object",
    "required": ["company", "client", "invoice", "lineItems", "total"],
    "properties": {
      "company": {
        "type": "object",
        "required": ["name"],
        "properties": {
          "name": { "type": "string" },
          "logo": { "type": "string", "format": "uri" },
          "address": { "type": "string" },
          "phone": { "type": "string" },
          "email": { "type": "string", "format": "email" }
        }
      },
      "client": {
        "type": "object",
        "required": ["name"],
        "properties": {
          "name": { "type": "string" },
          "address": { "type": "string" },
          "email": { "type": "string", "format": "email" }
        }
      },
      "invoice": {
        "type": "object",
        "required": ["number", "date"],
        "properties": {
          "number": { "type": "string" },
          "date": { "type": "string", "format": "date" },
          "dueDate": { "type": "string", "format": "date" },
          "notes": { "type": "string" }
        }
      },
      "lineItems": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["description", "quantity", "unitPrice", "total"],
          "properties": {
            "description": { "type": "string" },
            "quantity": { "type": "number" },
            "unitPrice": { "type": "number" },
            "total": { "type": "number" }
          }
        }
      },
      "subtotal": { "type": "number" },
      "taxRate": { "type": "number" },
      "taxAmount": { "type": "number" },
      "total": { "type": "number" }
    }
  },

  "styles": {
    "companyName": {
      "fontFamily": "Inter",
      "fontSize": 20,
      "fontWeight": "bold",
      "color": "#1a1a1a"
    },
    "label": {
      "fontFamily": "Inter",
      "fontSize": 9,
      "fontWeight": "bold",
      "color": "#888888"
    },
    "bodyText": {
      "fontFamily": "Inter",
      "fontSize": 10,
      "color": "#333333"
    },
    "tableHeader": {
      "fontFamily": "Inter",
      "fontSize": 9,
      "fontWeight": "bold",
      "color": "#ffffff",
      "backgroundColor": "#2c3e50"
    },
    "tableCell": {
      "fontFamily": "Inter",
      "fontSize": 9,
      "color": "#333333"
    },
    "totalLabel": {
      "fontFamily": "Inter",
      "fontSize": 11,
      "fontWeight": "bold",
      "color": "#1a1a1a",
      "textAlign": "right"
    },
    "totalValue": {
      "fontFamily": "Inter",
      "fontSize": 14,
      "fontWeight": "bold",
      "color": "#2c3e50",
      "textAlign": "right"
    },
    "footer": {
      "fontFamily": "Inter",
      "fontSize": 8,
      "color": "#999999",
      "textAlign": "center"
    }
  },

  "fonts": [
    { "family": "Inter", "weight": 400, "src": "fontsource:inter" },
    { "family": "Inter", "weight": 700, "src": "fontsource:inter" }
  ],

  "sections": [
    {
      "id": "invoice",
      "bands": [
        {
          "id": "header",
          "type": "pageHeader",
          "height": 130,
          "elements": [
            {
              "id": "logo",
              "type": "image",
              "x": 0, "y": 0, "width": 60, "height": 60,
              "properties": { "src": "{{ company.logo }}" }
            },
            {
              "id": "companyName",
              "type": "text",
              "x": 70, "y": 10, "width": 200, "height": 25,
              "style": "companyName",
              "properties": { "content": "{{ company.name }}" }
            },
            {
              "id": "companyDetails",
              "type": "text",
              "x": 70, "y": 38, "width": 200, "height": 40,
              "style": "bodyText",
              "properties": {
                "content": "{{ company.address }}\n{{ company.phone }}\n{{ company.email }}"
              }
            },
            {
              "id": "invoiceTitle",
              "type": "text",
              "x": 370, "y": 0, "width": 162, "height": 30,
              "style": "label",
              "styleOverrides": { "fontSize": 24, "textAlign": "right" },
              "properties": { "content": "INVOICE" }
            },
            {
              "id": "invoiceNumber",
              "type": "text",
              "x": 370, "y": 34, "width": 162, "height": 14,
              "style": "bodyText",
              "styleOverrides": { "textAlign": "right" },
              "properties": { "content": "#{{ invoice.number }}" }
            },
            {
              "id": "invoiceDate",
              "type": "text",
              "x": 370, "y": 50, "width": 162, "height": 14,
              "style": "bodyText",
              "styleOverrides": { "textAlign": "right" },
              "properties": { "content": "Date: {{ invoice.date | date: '%B %d, %Y' }}" }
            },
            {
              "id": "dueDate",
              "type": "text",
              "x": 370, "y": 66, "width": 162, "height": 14,
              "style": "bodyText",
              "styleOverrides": { "textAlign": "right" },
              "properties": { "content": "Due: {{ invoice.dueDate | date: '%B %d, %Y' }}" }
            },
            {
              "id": "billToLabel",
              "type": "text",
              "x": 0, "y": 85, "width": 100, "height": 12,
              "style": "label",
              "properties": { "content": "BILL TO" }
            },
            {
              "id": "clientName",
              "type": "text",
              "x": 0, "y": 99, "width": 250, "height": 14,
              "style": "bodyText",
              "styleOverrides": { "fontWeight": "bold" },
              "properties": { "content": "{{ client.name }}" }
            },
            {
              "id": "clientAddress",
              "type": "text",
              "x": 0, "y": 115, "width": 250, "height": 14,
              "style": "bodyText",
              "properties": { "content": "{{ client.address }}" }
            }
          ]
        },
        {
          "id": "tableHeader",
          "type": "columnHeader",
          "height": 24,
          "backgroundColor": "#2c3e50",
          "elements": [
            {
              "id": "thDesc",
              "type": "text",
              "x": 8, "y": 6, "width": 280, "height": 14,
              "style": "tableHeader",
              "properties": { "content": "Description" }
            },
            {
              "id": "thQty",
              "type": "text",
              "x": 296, "y": 6, "width": 60, "height": 14,
              "style": "tableHeader",
              "styleOverrides": { "textAlign": "center" },
              "properties": { "content": "Qty" }
            },
            {
              "id": "thPrice",
              "type": "text",
              "x": 364, "y": 6, "width": 80, "height": 14,
              "style": "tableHeader",
              "styleOverrides": { "textAlign": "right" },
              "properties": { "content": "Unit Price" }
            },
            {
              "id": "thTotal",
              "type": "text",
              "x": 452, "y": 6, "width": 80, "height": 14,
              "style": "tableHeader",
              "styleOverrides": { "textAlign": "right" },
              "properties": { "content": "Total" }
            }
          ]
        },
        {
          "id": "lineItem",
          "type": "detail",
          "height": 22,
          "dataSource": "lineItems",
          "itemName": "item",
          "elements": [
            {
              "id": "tdDesc",
              "type": "text",
              "x": 8, "y": 4, "width": 280, "height": 14,
              "style": "tableCell",
              "properties": { "content": "{{ item.description }}" }
            },
            {
              "id": "tdQty",
              "type": "text",
              "x": 296, "y": 4, "width": 60, "height": 14,
              "style": "tableCell",
              "styleOverrides": { "textAlign": "center" },
              "properties": { "content": "{{ item.quantity }}" }
            },
            {
              "id": "tdPrice",
              "type": "text",
              "x": 364, "y": 4, "width": 80, "height": 14,
              "style": "tableCell",
              "styleOverrides": { "textAlign": "right" },
              "properties": { "content": "{{ item.unitPrice | money }}" }
            },
            {
              "id": "tdTotal",
              "type": "text",
              "x": 452, "y": 4, "width": 80, "height": 14,
              "style": "tableCell",
              "styleOverrides": { "textAlign": "right" },
              "properties": { "content": "{{ item.total | money }}" }
            }
          ]
        },
        {
          "id": "totals",
          "type": "summary",
          "height": 80,
          "elements": [
            {
              "id": "subtotalLabel",
              "type": "text",
              "x": 332, "y": 10, "width": 120, "height": 14,
              "style": "totalLabel",
              "styleOverrides": { "fontSize": 10, "fontWeight": "normal" },
              "properties": { "content": "Subtotal" }
            },
            {
              "id": "subtotalValue",
              "type": "text",
              "x": 452, "y": 10, "width": 80, "height": 14,
              "style": "totalLabel",
              "styleOverrides": { "fontSize": 10, "fontWeight": "normal" },
              "properties": { "content": "{{ subtotal | money }}" }
            },
            {
              "id": "taxLabel",
              "type": "text",
              "x": 332, "y": 28, "width": 120, "height": 14,
              "style": "totalLabel",
              "styleOverrides": { "fontSize": 10, "fontWeight": "normal" },
              "properties": { "content": "Tax ({{ taxRate }}%)" }
            },
            {
              "id": "taxValue",
              "type": "text",
              "x": 452, "y": 28, "width": 80, "height": 14,
              "style": "totalLabel",
              "styleOverrides": { "fontSize": 10, "fontWeight": "normal" },
              "properties": { "content": "{{ taxAmount | money }}" }
            },
            {
              "id": "divider",
              "type": "line",
              "x": 332, "y": 48, "width": 200, "height": 1,
              "properties": { "color": "#cccccc", "thickness": 1 }
            },
            {
              "id": "totalLabel",
              "type": "text",
              "x": 332, "y": 54, "width": 120, "height": 20,
              "style": "totalLabel",
              "properties": { "content": "TOTAL" }
            },
            {
              "id": "totalValue",
              "type": "text",
              "x": 452, "y": 54, "width": 80, "height": 20,
              "style": "totalValue",
              "properties": { "content": "{{ total | money }}" }
            }
          ]
        },
        {
          "id": "notes",
          "type": "body",
          "height": 60,
          "autoHeight": true,
          "condition": "{{ invoice.notes }}",
          "elements": [
            {
              "id": "notesLabel",
              "type": "text",
              "x": 0, "y": 10, "width": 100, "height": 12,
              "style": "label",
              "properties": { "content": "NOTES" }
            },
            {
              "id": "notesText",
              "type": "text",
              "x": 0, "y": 24, "width": 532, "height": 30,
              "style": "bodyText",
              "properties": { "content": "{{ invoice.notes }}" }
            }
          ]
        },
        {
          "id": "footer",
          "type": "pageFooter",
          "height": 30,
          "elements": [
            {
              "id": "footerText",
              "type": "text",
              "x": 0, "y": 10, "width": 532, "height": 12,
              "style": "footer",
              "properties": {
                "content": "Thank you for your business! | Page {{ _pageNumber }} of {{ _totalPages }}"
              }
            }
          ]
        }
      ]
    }
  ]
}
```

Key features demonstrated:
- **Data binding**: `{{ company.name }}`, `{{ item.total | money }}` — LiquidJS syntax with filters
- **Detail band**: `dataSource: "lineItems"` iterates automatically, one band instance per array item
- **Column header**: Repeats after each page break so table headers are always visible
- **Conditional rendering**: The notes band only renders when `invoice.notes` is truthy
- **Built-in variables**: `{{ _pageNumber }}` and `{{ _totalPages }}` are injected by the renderer
- **Named styles + overrides**: Elements reference styles by name and add `styleOverrides` as needed

> **Note**: This example uses the Inter font via fontsource, which requires Phase 3 font loading. In Phase 1, text renders with pdf-lib's standard fonts (Helvetica, Times, Courier).

## Critical Implementation Notes

### Text Measurement

pdf-lib's `widthOfTextAtSize()` does not handle multi-line wrapping. We must implement our own word-wrap algorithm: split text into words, accumulate on a line until width exceeds the available space, then break. This is the foundation of the layout engine — if text measurement is wrong, page breaks will be wrong and elements will overlap. Build this early and test exhaustively (empty strings, long words, Unicode, CJK characters).

### Coordinate System Translation

The template schema uses **top-left origin** (y=0 is the top of the content area). pdf-lib uses **bottom-left origin** (y=0 is the bottom of the page). The renderer must translate: `pdfY = pageHeight - marginTop - templateY - elementHeight`. Never expose bottom-left coordinates outside the renderer.

### Two-Pass Rendering for `_totalPages`

`_totalPages` creates a chicken-and-egg problem: you need the total page count to render footers, but you need to render to know the page count. Solution: run the layout engine twice. Pass 1 measures and determines page count. Pass 2 renders with `_totalPages` resolved. Cache measurement results from pass 1.

### Font Subsetting

Embedding entire font files creates bloated PDFs. pdf-lib with fontkit supports font subsetting (only embedding glyphs actually used). Enable this by default.

### Image Handling

Images referenced by URL are fetched during rendering (async, can fail). Fetch all images in parallel at the start, cache by URL, and provide clear error messages on failure.
