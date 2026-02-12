# Template Guide

This document is the core conceptual reference for jsonpdf templates. It covers the full
template structure, content model, coordinate system, page configuration, sections, bands,
data binding, and element basics.

## Template Structure

A jsonpdf template is a JSON object with the following top-level shape:

```json
{
  "version": "1.0",
  "name": "My Report",
  "description": "Quarterly sales report with charts and tables.",
  "author": "Acme Corp",
  "license": "MIT",
  "page": { ... },
  "dataSchema": { ... },
  "defaultStyle": { ... },
  "styles": { ... },
  "sections": [ ... ],
  "fonts": [ ... ]
}
```

| Property       | Type                    | Required | Description                                                                          |
| -------------- | ----------------------- | -------- | ------------------------------------------------------------------------------------ |
| `version`      | `"1.0"`                 | Yes      | Template format version. Currently only `"1.0"`.                                     |
| `name`         | string                  | Yes      | Display name for the template.                                                       |
| `description`  | string                  | No       | Human-readable description of what the template produces.                            |
| `author`       | string                  | No       | Author name or organization.                                                         |
| `license`      | string                  | No       | License identifier (e.g. `"MIT"`).                                                   |
| `page`         | PageConfig              | Yes      | Default page configuration applied to all sections.                                  |
| `dataSchema`   | JSONSchema              | Yes      | JSON Schema (draft 2020-12) describing the expected input data.                      |
| `defaultStyle` | Style                   | Yes      | Base style layer for all elements. `fontFamily` is required.                         |
| `styles`       | Record\<string, Style\> | Yes      | Named style definitions referenced by elements and styled runs.                      |
| `sections`     | Section[]               | Yes      | Ordered list of document sections (at least one required).                           |
| `fonts`        | FontDeclaration[]       | Yes      | Font declarations with embedded base64 data. Includes Inter (4 variants) by default. |

## Content Model

```
Template
├── page (default page config)
├── dataSchema (JSON Schema for input data)
├── defaultStyle (base style, fontFamily required)
├── styles (named styles)
├── fonts (font declarations)
└── sections[]
    ├── page? (section page overrides)
    └── bands[]
        ├── type, height, condition, dataSource...
        └── elements[]
            ├── type, x, y, width, height
            └── properties (plugin-specific)
```

The content model has three levels:

- **Sections** define page configuration. Each section can override the template-level page
  size, orientation, and margins. A section groups bands together and controls multi-column
  layout.

- **Bands** define content flow. The renderer processes bands in order, automatically creating
  new pages when content overflows. Each band has a type that determines when and how it
  renders (e.g. once per data record, once per page, only on the last page).

- **Elements** are visual primitives positioned absolutely within their band. Each element has
  a type (text, image, line, shape, etc.) and a set of plugin-specific properties. Elements
  use a top-left coordinate origin relative to the band.

## Units and Coordinates

All measurements in jsonpdf templates use **points** (1 pt = 1/72 inch).

### Common page sizes

| Size      | Width  | Height  |
| --------- | ------ | ------- |
| US Letter | 612 pt | 792 pt  |
| A4        | 595 pt | 842 pt  |
| US Legal  | 612 pt | 1008 pt |

### Unit conversions

| From        | To Points | Formula         |
| ----------- | --------- | --------------- |
| inches      | points    | 1 in = 72 pt    |
| millimeters | points    | 1 mm = 2.835 pt |
| centimeters | points    | 1 cm = 28.35 pt |

### Coordinate origin

The coordinate origin is the **top-left corner** of the content area (inside page margins).
`x=0, y=0` places an element at the top-left of its band. The `y` axis increases downward.

Element positions are relative to their containing band, not to the page.

## Page Configuration

The `page` object defines the physical page dimensions and margins.

```json
{
  "page": {
    "width": 612,
    "height": 792,
    "orientation": "portrait",
    "margins": { "top": 40, "right": 40, "bottom": 40, "left": 40 }
  }
}
```

| Property      | Type                          | Required | Description                                                            |
| ------------- | ----------------------------- | -------- | ---------------------------------------------------------------------- |
| `width`       | number                        | Yes      | Page width in points. Must be > 0.                                     |
| `height`      | number                        | Yes      | Page height in points. Must be > 0.                                    |
| `orientation` | `"portrait"` \| `"landscape"` | No       | Orientation hint. Width and height are canonical.                      |
| `autoHeight`  | boolean                       | No       | When true, page height grows to fit content (ignores declared height). |
| `margins`     | object                        | Yes      | Page margins in points (top, right, bottom, left).                     |

### US Letter example

```json
{
  "width": 612,
  "height": 792,
  "margins": { "top": 72, "right": 72, "bottom": 72, "left": 72 }
}
```

The content area is 612 - 72 - 72 = 468 pt wide and 792 - 72 - 72 = 648 pt tall.

### A4 landscape example

```json
{
  "width": 842,
  "height": 595,
  "orientation": "landscape",
  "margins": { "top": 50, "right": 50, "bottom": 50, "left": 50 }
}
```

## Sections

A section groups bands and optionally overrides the template-level page configuration.

```json
{
  "id": "report-body", "name": "Report Body",
  "page": { "orientation": "landscape", "margins": { "top": 30, "right": 30, "bottom": 30, "left": 30 } },
  "columns": 2, "columnGap": 20, "bookmark": "Report Body",
  "bands": [ ... ]
}
```

| Property       | Type                  | Required | Description                                                                          |
| -------------- | --------------------- | -------- | ------------------------------------------------------------------------------------ |
| `id`           | string                | Yes      | Unique section identifier.                                                           |
| `name`         | string                | No       | Display name for the section.                                                        |
| `page`         | Partial\<PageConfig\> | No       | Page config overrides merged with the template-level defaults.                       |
| `columns`      | integer               | No       | Number of columns (default 1).                                                       |
| `columnWidths` | number[]              | No       | Relative column width ratios. Length must match `columns`.                           |
| `columnGap`    | number                | No       | Gap between columns in points (default 0).                                           |
| `columnMode`   | `"tile"` \| `"flow"`  | No       | `"tile"` renders each column independently; `"flow"` reflows content across columns. |
| `bookmark`     | string                | No       | Bookmark title for this section in the PDF outline (level 0).                        |
| `bands`        | Band[]                | Yes      | Ordered list of bands in this section.                                               |

For multi-column layout details and PDF bookmark/outline features, see
[Advanced Features](advanced-features.md).

## Band Types

Bands are the content flow units of a template. Each band has a `type` that determines when
and how it renders during PDF generation.

| Type             | Renders                                        | Use Case                      |
| ---------------- | ---------------------------------------------- | ----------------------------- |
| `background`     | Every page, behind all content                 | Watermarks, page borders      |
| `title`          | Once, first page only                          | Cover content, report title   |
| `pageHeader`     | Top of every page                              | Running headers, logo         |
| `columnHeader`   | Before first detail, repeats after page breaks | Table column headers          |
| `groupHeader`    | When `groupBy` value changes                   | Group break headers           |
| `detail`         | Once per record in `dataSource`                | Main repeating content        |
| `groupFooter`    | Before `groupBy` value changes                 | Group subtotals               |
| `columnFooter`   | After detail rows on each page                 | Per-page subtotals            |
| `body`           | Once, in document flow                         | Static content                |
| `noData`         | Only when `dataSource` is empty                | "No records" fallback         |
| `summary`        | Once, after all detail rows                    | Grand totals                  |
| `pageFooter`     | Bottom of every page                           | Page numbers, running footers |
| `lastPageFooter` | Replaces `pageFooter` on final page            | Signatures, "end of report"   |

### Rendering order within a page

Bands render in the following structural order on each page:

1. `background` -- drawn behind all other content
2. `pageHeader` -- pinned to the top of the page
3. Content bands flow in document order: `title`, `columnHeader`, `groupHeader`, `detail`,
   `groupFooter`, `columnFooter`, `body`, `noData`, `summary`
4. `pageFooter` or `lastPageFooter` -- pinned to the bottom of the page

## Band Properties

| Property          | Type               | Required | Description                                                                                                              |
| ----------------- | ------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| `id`              | string             | Yes      | Unique band identifier.                                                                                                  |
| `type`            | BandType           | Yes      | Structural role (see table above).                                                                                       |
| `height`          | number             | Yes      | Declared band height in points.                                                                                          |
| `autoHeight`      | boolean            | No       | When true, band height grows to fit its tallest element.                                                                 |
| `condition`       | string             | No       | Raw Liquid expression (without `{{ }}`). Band is skipped when falsy.                                                     |
| `dataSource`      | string             | No       | Dot-path to an array in the data (e.g. `"lineItems"`) or the special `"_bookmarks"` source. Required for `detail` bands. |
| `itemName`        | string             | No       | Loop variable name for the current iteration item (default `"item"`).                                                    |
| `groupBy`         | string             | No       | Dot-path for grouping detail items. Triggers `groupHeader`/`groupFooter` rendering.                                      |
| `float`           | boolean            | No       | When true, `columnFooter` sits just below the last detail row instead of at the column bottom.                           |
| `pageBreakBefore` | boolean            | No       | When true, a page break is inserted before this band.                                                                    |
| `bookmark`        | string             | No       | Bookmark title for this band in the PDF outline (level 1). Supports Liquid expressions.                                  |
| `anchor`          | string             | No       | Cross-reference target ID. Use `{{ "anchor-id" \| ref }}` to get the page number.                                        |
| `backgroundColor` | string \| Gradient | No       | Hex color string (e.g. `"#1a1a2e"`) or a gradient object.                                                                |
| `elements`        | Element[]          | Yes      | Elements rendered inside this band.                                                                                      |

### Detail band example

A detail band iterates over an array in the input data. Each item produces one band instance:

```json
{
  "id": "line-item",
  "type": "detail",
  "height": 20,
  "dataSource": "items",
  "elements": [
    {
      "id": "item-desc",
      "type": "text",
      "x": 8,
      "y": 3,
      "width": 260,
      "height": 14,
      "style": "item-text",
      "properties": { "content": "{{ item.description }}" }
    },
    {
      "id": "item-qty",
      "type": "text",
      "x": 278,
      "y": 3,
      "width": 60,
      "height": 14,
      "style": "item-number",
      "properties": { "content": "{{ item.qty }}" }
    },
    {
      "id": "item-price",
      "type": "text",
      "x": 348,
      "y": 3,
      "width": 80,
      "height": 14,
      "style": "item-number",
      "properties": { "content": "{{ item.unitPrice | money }}" }
    }
  ]
}
```

Here `dataSource: "items"` tells the renderer to look up the `items` array in the input data.
The default `itemName` is `"item"`, so each record is available as `{{ item.* }}`.

### Conditional band example

A band with a `condition` renders only when the expression evaluates to truthy. The
`condition` field takes a raw Liquid expression -- not wrapped in `{{ }}`:

```json
{
  "id": "fragile-warning",
  "type": "body",
  "height": 30,
  "condition": "fragile",
  "elements": [
    {
      "id": "fragile-text",
      "type": "text",
      "x": 0,
      "y": 5,
      "width": 258,
      "height": 20,
      "style": "fragile",
      "properties": { "content": "FRAGILE -- HANDLE WITH CARE" }
    }
  ]
}
```

### Background band example

Background bands render on every page, behind all other content:

```json
{
  "id": "bg",
  "type": "background",
  "height": 512,
  "elements": [
    {
      "id": "page-border",
      "type": "shape",
      "x": 0,
      "y": 0,
      "width": 692,
      "height": 512,
      "properties": { "shapeType": "rect", "stroke": "#d4af37", "strokeWidth": 3 }
    }
  ]
}
```

## Data Binding

jsonpdf uses [LiquidJS](https://liquidjs.com/) for data binding. Templates can reference
input data using Liquid expressions, filters, and conditionals.

### dataSchema

The `dataSchema` field is a JSON Schema (draft 2020-12) that defines the expected shape of
the input data. The renderer validates incoming data against this schema before rendering.

You can provide `default` values in the schema. When a property is missing from the input
data, the default value is used automatically.

```json
{
  "dataSchema": {
    "type": "object",
    "properties": {
      "invoiceNumber": { "type": "string", "default": "INV-0001" },
      "customer": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "email": { "type": "string" }
        }
      },
      "items": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "description": { "type": "string" },
            "qty": { "type": "number" },
            "unitPrice": { "type": "number" },
            "total": { "type": "number" }
          }
        }
      },
      "grandTotal": { "type": "number", "default": 0 }
    }
  }
}
```

### Expressions

Use double curly braces to insert data values into element content and properties:

```
{{ invoiceNumber }}              -- top-level variable
{{ customer.name }}              -- nested object path
{{ customer.address }}           -- dot-separated paths
{{ items[0].description }}       -- array index access
```

Expressions are resolved recursively in all string values within element `properties`. This
means any plugin property that accepts a string can contain Liquid expressions.

### Filters

Filters transform values inside expressions using the pipe (`|`) syntax.

#### Custom filters

| Filter  | Syntax                              | Description                                          | Example                                           |
| ------- | ----------------------------------- | ---------------------------------------------------- | ------------------------------------------------- |
| `money` | `{{ value \| money }}`              | Format as currency (default USD).                    | `{{ 1234.56 \| money }}` -> `$1,234.56`           |
| `money` | `{{ value \| money: "EUR" }}`       | Format with a specific currency code.                | `{{ 1234.56 \| money: "EUR" }}` -> `EUR 1,234.56` |
| `pad`   | `{{ value \| pad: width, "char" }}` | Left-pad a string to a given width.                  | `{{ 42 \| pad: 5, "0" }}` -> `00042`              |
| `ref`   | `{{ "anchor-id" \| ref }}`          | Look up the page number of a cross-reference anchor. | `{{ "chapter-1" \| ref }}` -> `3`                 |

#### Built-in Liquid filters

All standard LiquidJS filters are available, including:

- **String**: `upcase`, `downcase`, `capitalize`, `strip`, `truncate`, `split`, `replace`,
  `append`, `prepend`, `remove`, `slice`
- **Number**: `plus`, `minus`, `times`, `divided_by`, `modulo`, `round`, `ceil`, `floor`,
  `abs`
- **Array**: `size`, `first`, `last`, `join`, `map`, `where`, `sort`, `reverse`, `uniq`,
  `concat`
- **Date**: `date` (e.g. `{{ "now" | date: "%Y-%m-%d" }}`)

### Built-in Variables

The renderer provides several built-in variables available in all expressions:

| Variable      | Type   | Description                                                                                                                   |
| ------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `_pageNumber` | number | Current page number (1-based).                                                                                                |
| `_totalPages` | number | Total page count. Resolved via two-pass rendering.                                                                            |
| `_index`      | number | Current iteration index (0-based) within a `detail` band.                                                                     |
| `_bookmarks`  | array  | Array of bookmark entries collected during the first rendering pass. Used as a `dataSource` for table-of-contents generation. |

#### Page numbers example

```json
{
  "id": "page-num",
  "type": "text",
  "x": 0,
  "y": 5,
  "width": 532,
  "height": 12,
  "style": "footer",
  "properties": { "content": "Page {{ _pageNumber }} of {{ _totalPages }}" }
}
```

The `_totalPages` variable requires two-pass rendering: the renderer first lays out the entire
document to determine the total page count, then performs a second pass with the correct value.

#### Table of contents example

The special `_bookmarks` data source lets you build a table of contents. Each bookmark entry
has `title`, `pageNumber`, `level`, and `anchorId` properties:

```json
{
  "id": "toc-entry",
  "type": "detail",
  "height": 20,
  "dataSource": "_bookmarks",
  "itemName": "bm",
  "elements": [
    {
      "id": "toc-title",
      "type": "text",
      "x": 0,
      "y": 2,
      "width": 400,
      "height": 16,
      "properties": { "content": "{{ bm.title }}" }
    },
    {
      "id": "toc-page",
      "type": "text",
      "x": 400,
      "y": 2,
      "width": 60,
      "height": 16,
      "styleOverrides": { "textAlign": "right" },
      "properties": { "content": "{{ bm.pageNumber }}" }
    }
  ]
}
```

### Conditions

Conditions appear on bands and elements as the `condition` property. They are raw Liquid
expressions -- **not** wrapped in `{{ }}`. When the expression evaluates to a falsy value
(false, nil, empty string, 0), the band or element is skipped.

```
item.total > 100                 -- comparison
invoice.notes                    -- truthy check (non-nil, non-empty)
customer.type == "premium"       -- equality
```

Conditions use standard Liquid truthiness rules. Any non-nil, non-false value is truthy.

## Element Basics

Elements are the visual building blocks of a template. Every element shares a common set of
properties, plus a `properties` object with plugin-specific configuration.

### Common properties

| Property            | Type               | Required | Description                                                                                                                   |
| ------------------- | ------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `id`                | string             | Yes      | Unique element identifier.                                                                                                    |
| `type`              | string             | Yes      | Plugin type: `"text"`, `"image"`, `"line"`, `"shape"`, `"list"`, `"table"`, `"chart"`, `"barcode"`, `"container"`, `"frame"`. |
| `x`                 | number             | Yes      | Horizontal position in points (relative to band left edge).                                                                   |
| `y`                 | number             | Yes      | Vertical position in points (relative to band top edge).                                                                      |
| `width`             | number             | Yes      | Element width in points.                                                                                                      |
| `height`            | number             | Yes      | Element height in points.                                                                                                     |
| `rotation`          | number             | No       | Clockwise rotation in degrees around the element center.                                                                      |
| `style`             | string             | No       | Named style reference from the template's `styles` map.                                                                       |
| `styleOverrides`    | Partial\<Style\>   | No       | Inline style overrides merged on top of the named style.                                                                      |
| `condition`         | string             | No       | Raw Liquid expression (without `{{ }}`). Element is skipped when falsy.                                                       |
| `conditionalStyles` | ConditionalStyle[] | No       | Conditional style rules evaluated in order; first matching condition wins.                                                    |
| `anchor`            | string             | No       | Cross-reference ID for internal links via `{{ "anchor-id" \| ref }}`.                                                         |
| `properties`        | object             | Yes      | Plugin-specific configuration (content, src, shapeType, etc.).                                                                |
| `elements`          | Element[]          | No       | Child elements for container-like plugins.                                                                                    |

### Element example

A text element displaying the company name with a named style:

```json
{
  "id": "company-name",
  "type": "text",
  "x": 0,
  "y": 5,
  "width": 250,
  "height": 25,
  "style": "company-name",
  "properties": { "content": "{{ company.name }}" }
}
```

### Conditional styles

Conditional styles let you change an element's appearance based on data values. Rules are
evaluated in order, and the first matching condition wins:

```json
{
  "id": "total-cell",
  "type": "text",
  "x": 400,
  "y": 3,
  "width": 100,
  "height": 14,
  "style": "item-number",
  "conditionalStyles": [
    {
      "condition": "item.total > 5000",
      "styleOverrides": { "color": "#16a34a", "fontWeight": "bold" }
    },
    { "condition": "item.total < 0", "styleOverrides": { "color": "#dc2626" } }
  ],
  "properties": { "content": "{{ item.total | money }}" }
}
```

### Style resolution order

When the renderer resolves an element's final style, it merges styles in the following order
(later layers override earlier ones):

1. `defaultStyle` -- template-level base style
2. Named `style` -- from the template's `styles` map
3. `styleOverrides` -- inline overrides on the element
4. `conditionalStyles` -- first matching conditional rule's style and overrides

For full style property documentation, see [Styling](styling.md).

### Rich text content

Text elements support both plain strings and rich text (styled runs). Rich text is an array
of `StyledRun` objects, each with its own text content, style, and optional hyperlink:

```json
{
  "id": "contact-link",
  "type": "text",
  "x": 0,
  "y": 0,
  "width": 300,
  "height": 14,
  "properties": {
    "content": [
      { "text": "Contact us at " },
      {
        "text": "support@example.com",
        "styleOverrides": { "color": "#2563eb" },
        "link": "mailto:support@example.com"
      }
    ]
  }
}
```

Each styled run can have:

| Property         | Type                  | Description                                            |
| ---------------- | --------------------- | ------------------------------------------------------ |
| `text`           | string                | The text content of this run. Required.                |
| `style`          | string                | Named style reference.                                 |
| `styleOverrides` | Partial\<Style\>      | Inline style overrides for this run.                   |
| `link`           | string                | Hyperlink URL or internal anchor (e.g. `"#anchorId"`). |
| `footnote`       | string \| StyledRun[] | Footnote content with a superscript marker.            |

For plugin-specific properties (text, image, line, shape, list, table, chart, barcode,
container, frame), see [Element Reference](elements.md).

## Fonts

Custom fonts are declared in the `fonts` array. Each entry embeds a base64-encoded font file
(.ttf, .otf, or .woff) with its family name, weight, and style:

```json
{
  "fonts": [
    { "family": "Inter", "weight": 400, "style": "normal", "data": "AAEAAAARAQ..." },
    { "family": "Inter", "weight": 700, "style": "normal", "data": "AAEAAAARAQ..." },
    { "family": "Inter", "weight": 400, "style": "italic", "data": "AAEAAAARAQ..." }
  ]
}
```

| Property | Type                     | Required | Description                                                     |
| -------- | ------------------------ | -------- | --------------------------------------------------------------- |
| `family` | string                   | Yes      | Font family name. Must match `fontFamily` references in styles. |
| `weight` | number                   | No       | Numeric font weight (e.g. 400 for normal, 700 for bold).        |
| `style`  | `"normal"` \| `"italic"` | No       | Font style variant.                                             |
| `data`   | string                   | Yes      | Base64-encoded font file data.                                  |

Templates created with `jsonpdf init` or `createTemplate()` include Inter (400, 400 italic,
700, 700 italic) by default. The `defaultStyle.fontFamily` must reference a font family that
is declared in `fonts`.

## Putting It All Together

Here is a minimal complete template with a page header, detail iteration, summary, and footer:

```json
{
  "version": "1.0",
  "name": "Simple Invoice",
  "page": {
    "width": 612,
    "height": 792,
    "margins": { "top": 40, "right": 40, "bottom": 40, "left": 40 }
  },
  "dataSchema": {
    "type": "object",
    "properties": {
      "invoiceNumber": { "type": "string", "default": "INV-0001" },
      "items": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "description": { "type": "string" },
            "total": { "type": "number" }
          }
        }
      },
      "grandTotal": { "type": "number", "default": 0 }
    }
  },
  "defaultStyle": { "fontFamily": "Inter", "fontSize": 10 },
  "styles": {
    "heading": { "fontSize": 20, "fontWeight": "bold", "color": "#1a1a2e" },
    "right": { "textAlign": "right" },
    "footer": { "fontSize": 8, "color": "#999999", "textAlign": "center" }
  },
  "sections": [
    {
      "id": "invoice",
      "bands": [
        {
          "id": "header",
          "type": "pageHeader",
          "height": 40,
          "elements": [
            {
              "id": "title",
              "type": "text",
              "x": 0,
              "y": 5,
              "width": 300,
              "height": 25,
              "style": "heading",
              "properties": { "content": "Invoice #{{ invoiceNumber }}" }
            }
          ]
        },
        {
          "id": "line-item",
          "type": "detail",
          "height": 20,
          "dataSource": "items",
          "elements": [
            {
              "id": "desc",
              "type": "text",
              "x": 0,
              "y": 3,
              "width": 350,
              "height": 14,
              "properties": { "content": "{{ item.description }}" }
            },
            {
              "id": "amount",
              "type": "text",
              "x": 360,
              "y": 3,
              "width": 172,
              "height": 14,
              "style": "right",
              "properties": { "content": "{{ item.total | money }}" }
            }
          ]
        },
        {
          "id": "grand-total",
          "type": "summary",
          "height": 30,
          "elements": [
            {
              "id": "total-value",
              "type": "text",
              "x": 360,
              "y": 8,
              "width": 172,
              "height": 18,
              "style": "right",
              "styleOverrides": { "fontWeight": "bold", "fontSize": 14 },
              "properties": { "content": "Total: {{ grandTotal | money }}" }
            }
          ]
        },
        {
          "id": "page-footer",
          "type": "pageFooter",
          "height": 20,
          "elements": [
            {
              "id": "page-num",
              "type": "text",
              "x": 0,
              "y": 5,
              "width": 532,
              "height": 12,
              "style": "footer",
              "properties": { "content": "Page {{ _pageNumber }} of {{ _totalPages }}" }
            }
          ]
        }
      ]
    }
  ],
  "fonts": [
    { "family": "Inter", "weight": 400, "style": "normal", "data": "AAWQABAAAT..." },
    { "family": "Inter", "weight": 400, "style": "italic", "data": "AAWQABgAAT..." },
    { "family": "Inter", "weight": 700, "style": "normal", "data": "AAWQABABAT..." },
    { "family": "Inter", "weight": 700, "style": "italic", "data": "AAWQABoBBT..." }
  ]
}
```

This template demonstrates a `pageHeader` rendered on every page, a `detail` band iterating
over the `items` array with the `money` filter, a `summary` for the grand total, a
`pageFooter` with `_pageNumber`/`_totalPages`, named styles with inline `styleOverrides`, and
a `dataSchema` with default values for preview rendering.

## Next Steps

- [Element Reference](elements.md) -- plugin-specific properties for each element type
- [Styling](styling.md) -- full style property documentation, gradients, borders, padding
- [Advanced Features](advanced-features.md) -- multi-column layout, bookmarks, cross-references
- [Getting Started](getting-started.md) -- CLI usage, rendering your first template
