# Element Types Reference

jsonpdf has 10 element types, each identified by a `type` field and configured through
plugin-specific `properties`. Every element also supports common fields such as `id`, `x`, `y`,
`width`, `height`, `style`, `styleOverrides`, `condition`, and `conditionalStyles`. Those common
properties are covered in [Template Guide](template-guide.md). This document focuses on the
`properties` object for each element type.

---

## text

Renders plain or rich text with word wrapping, alignment, and optional auto-height sizing.

### Properties

| Name         | Type          | Default | Description                                              |
| ------------ | ------------- | ------- | -------------------------------------------------------- |
| `content`    | `RichContent` | `""`    | Plain string or array of `StyledRun` objects (required). |
| `autoHeight` | `boolean`     | `false` | When true, the element grows vertically to fit its text. |

`RichContent` is either a plain `string` or an array of `StyledRun` objects. A plain string
supports Liquid expressions (e.g. `{{ name }}`). Each `StyledRun` has a required `text` field and
optional `style`, `styleOverrides`, `link`, and `footnote` fields. See [Styling](styling.md) for
full `StyledRun` details.

### Example -- plain text

```json
{
  "id": "greeting",
  "type": "text",
  "x": 0,
  "y": 0,
  "width": 400,
  "height": 20,
  "properties": {
    "content": "Hello {{ name }}, welcome to jsonpdf!"
  }
}
```

### Example -- rich text

```json
{
  "id": "rich-label",
  "type": "text",
  "x": 0,
  "y": 0,
  "width": 400,
  "height": 40,
  "properties": {
    "autoHeight": true,
    "content": [
      { "text": "Bold ", "styleOverrides": { "fontWeight": "bold" } },
      { "text": "normal " },
      { "text": "linked", "link": "https://example.com" }
    ]
  }
}
```

---

## line

Draws a horizontal or vertical line, optionally dashed.

### Properties

| Name          | Type                           | Default        | Description                                    |
| ------------- | ------------------------------ | -------------- | ---------------------------------------------- |
| `color`       | `string`                       | `"#000000"`    | Line color as a hex string.                    |
| `thickness`   | `number`                       | `1`            | Line thickness in points (must be > 0).        |
| `direction`   | `"horizontal"` \| `"vertical"` | `"horizontal"` | Drawing direction.                             |
| `dashPattern` | `number[]`                     | --             | Dash and gap lengths in points, e.g. `[4, 2]`. |

### Example -- solid horizontal divider

```json
{
  "id": "divider",
  "type": "line",
  "x": 0,
  "y": 30,
  "width": 500,
  "height": 1,
  "properties": {
    "color": "#CCCCCC",
    "thickness": 1
  }
}
```

### Example -- dashed line

```json
{
  "id": "dashed-separator",
  "type": "line",
  "x": 0,
  "y": 0,
  "width": 500,
  "height": 1,
  "properties": {
    "color": "#999999",
    "thickness": 0.5,
    "dashPattern": [4, 2]
  }
}
```

### Example -- vertical separator

```json
{
  "id": "vertical-rule",
  "type": "line",
  "x": 250,
  "y": 0,
  "width": 1,
  "height": 100,
  "properties": {
    "direction": "vertical",
    "color": "#000000",
    "thickness": 1
  }
}
```

---

## list

Renders bulleted, numbered, or lettered lists with optional nesting.

### Properties

| Name          | Type                                       | Default    | Description                               |
| ------------- | ------------------------------------------ | ---------- | ----------------------------------------- |
| `listType`    | `"bullet"` \| `"numbered"` \| `"lettered"` | `"bullet"` | Marker style for list items.              |
| `items`       | `(RichContent \| ListItem)[]`              | --         | Array of list items (required).           |
| `bulletStyle` | `string`                                   | `"\u2022"` | Custom bullet character for bullet lists. |
| `indent`      | `number`                                   | `20`       | Indentation per nesting level in points.  |
| `itemSpacing` | `number`                                   | `2`        | Vertical space between items in points.   |

Each item in the `items` array can be either a plain `RichContent` value (string or styled runs)
or a `ListItem` object with `content` and optional `children` for nested sublists. A `ListItem` is
defined as `{ "content": RichContent, "children": ListItem[] }`.

### Example -- simple bullet list

```json
{
  "id": "features",
  "type": "list",
  "x": 20,
  "y": 0,
  "width": 400,
  "height": 80,
  "properties": {
    "listType": "bullet",
    "items": ["JSON-based templates", "Rich text support", "Data binding"]
  }
}
```

### Example -- numbered list

```json
{
  "id": "steps",
  "type": "list",
  "x": 20,
  "y": 0,
  "width": 400,
  "height": 80,
  "properties": {
    "listType": "numbered",
    "items": ["Design your template", "Provide your data", "Render to PDF"]
  }
}
```

### Example -- nested list with children

```json
{
  "id": "nested-list",
  "type": "list",
  "x": 20,
  "y": 0,
  "width": 400,
  "height": 120,
  "properties": {
    "listType": "bullet",
    "indent": 20,
    "itemSpacing": 4,
    "items": [
      {
        "content": "Fruits",
        "children": [{ "content": "Apples" }, { "content": "Bananas" }]
      },
      {
        "content": "Vegetables",
        "children": [{ "content": "Carrots" }, { "content": "Peas" }]
      }
    ]
  }
}
```

---

## shape

Draws a rectangle, circle, or ellipse with optional fill, stroke, and rounded corners.

### Properties

| Name           | Type                                  | Default | Description                                                              |
| -------------- | ------------------------------------- | ------- | ------------------------------------------------------------------------ |
| `shapeType`    | `"rect"` \| `"circle"` \| `"ellipse"` | --      | Shape to draw (required).                                                |
| `fill`         | `string`                              | --      | Fill color as a hex string.                                              |
| `stroke`       | `string`                              | --      | Stroke color as a hex string.                                            |
| `strokeWidth`  | `number`                              | `1`\*   | Stroke width in points. \*Defaults to 1 if `stroke` is set, otherwise 0. |
| `dashPattern`  | `number[]`                            | --      | Dash and gap lengths for the stroke.                                     |
| `borderRadius` | `number`                              | --      | Corner radius in points (rect only).                                     |

### Example -- filled rectangle

```json
{
  "id": "bg-box",
  "type": "shape",
  "x": 0,
  "y": 0,
  "width": 500,
  "height": 60,
  "properties": {
    "shapeType": "rect",
    "fill": "#E8F0FE"
  }
}
```

### Example -- bordered circle

```json
{
  "id": "avatar-frame",
  "type": "shape",
  "x": 20,
  "y": 10,
  "width": 80,
  "height": 80,
  "properties": {
    "shapeType": "circle",
    "stroke": "#333333",
    "strokeWidth": 2
  }
}
```

### Example -- rounded rectangle

```json
{
  "id": "card",
  "type": "shape",
  "x": 0,
  "y": 0,
  "width": 240,
  "height": 120,
  "properties": {
    "shapeType": "rect",
    "fill": "#FFFFFF",
    "stroke": "#DDDDDD",
    "strokeWidth": 1,
    "borderRadius": 8
  }
}
```

---

## image

Displays a raster or SVG image from a data URI.

### Properties

| Name  | Type                                             | Default     | Description                            |
| ----- | ------------------------------------------------ | ----------- | -------------------------------------- |
| `src` | `string`                                         | --          | Data URI of the image (required).      |
| `fit` | `"contain"` \| `"cover"` \| `"fill"` \| `"none"` | `"contain"` | How the image fits within the element. |

Images must be provided as data URIs (`data:image/png;base64,...` or `data:image/svg+xml,...`).
Supported formats are JPEG, PNG, and SVG. SVG images are rasterized automatically before
embedding.

**Fit modes:**

- **contain** -- scale to fit within bounds, preserving aspect ratio (letterboxed).
- **cover** -- scale to fill bounds, cropping any overflow while preserving aspect ratio.
- **fill** -- stretch to fill bounds exactly, ignoring aspect ratio.
- **none** -- render at natural size, centered within bounds, cropping any overflow.

### Example

```json
{
  "id": "logo",
  "type": "image",
  "x": 0,
  "y": 0,
  "width": 120,
  "height": 40,
  "properties": {
    "src": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
    "fit": "contain"
  }
}
```

---

## container

Groups child elements using one of four layout modes. Child elements are placed in the
element-level `elements` array, not inside `properties`.

### Properties

| Name          | Type                                                       | Default   | Description                          |
| ------------- | ---------------------------------------------------------- | --------- | ------------------------------------ |
| `layout`      | `"absolute"` \| `"horizontal"` \| `"vertical"` \| `"grid"` | --        | Layout mode for children (required). |
| `gap`         | `number`                                                   | `0`       | Spacing between children in points.  |
| `gridColumns` | `number`                                                   | `2`       | Number of columns for grid layout.   |
| `alignItems`  | `"start"` \| `"center"` \| `"end"`                         | `"start"` | Cross-axis alignment for children.   |

**Layout modes:**

- **absolute** -- children use their own `x` and `y` for positioning.
- **horizontal** -- children flow left to right, separated by `gap`.
- **vertical** -- children stack top to bottom, separated by `gap`.
- **grid** -- children fill a grid with `gridColumns` columns, separated by `gap`.

### Example -- horizontal row

```json
{
  "id": "button-row",
  "type": "container",
  "x": 0,
  "y": 0,
  "width": 400,
  "height": 30,
  "properties": {
    "layout": "horizontal",
    "gap": 10,
    "alignItems": "center"
  },
  "elements": [
    {
      "id": "label-a",
      "type": "text",
      "x": 0,
      "y": 0,
      "width": 100,
      "height": 20,
      "properties": { "content": "Item A" }
    },
    {
      "id": "label-b",
      "type": "text",
      "x": 0,
      "y": 0,
      "width": 100,
      "height": 20,
      "properties": { "content": "Item B" }
    }
  ]
}
```

### Example -- vertical stack

```json
{
  "id": "info-stack",
  "type": "container",
  "x": 0,
  "y": 0,
  "width": 300,
  "height": 100,
  "properties": {
    "layout": "vertical",
    "gap": 8
  },
  "elements": [
    {
      "id": "name",
      "type": "text",
      "x": 0,
      "y": 0,
      "width": 300,
      "height": 20,
      "properties": { "content": "{{ company.name }}" }
    },
    {
      "id": "address",
      "type": "text",
      "x": 0,
      "y": 0,
      "width": 300,
      "height": 20,
      "properties": { "content": "{{ company.address }}" }
    }
  ]
}
```

### Example -- 2-column grid

```json
{
  "id": "card-grid",
  "type": "container",
  "x": 0,
  "y": 0,
  "width": 500,
  "height": 200,
  "properties": {
    "layout": "grid",
    "gridColumns": 2,
    "gap": 12
  },
  "elements": [
    {
      "id": "cell-1",
      "type": "text",
      "x": 0,
      "y": 0,
      "width": 244,
      "height": 40,
      "properties": { "content": "Cell 1" }
    },
    {
      "id": "cell-2",
      "type": "text",
      "x": 0,
      "y": 0,
      "width": 244,
      "height": 40,
      "properties": { "content": "Cell 2" }
    },
    {
      "id": "cell-3",
      "type": "text",
      "x": 0,
      "y": 0,
      "width": 244,
      "height": 40,
      "properties": { "content": "Cell 3" }
    },
    {
      "id": "cell-4",
      "type": "text",
      "x": 0,
      "y": 0,
      "width": 244,
      "height": 40,
      "properties": { "content": "Cell 4" }
    }
  ]
}
```

---

## table

Renders a data table with column definitions, optional header, alternating row styles, and
automatic page-break splitting with header repeat.

### Properties

| Name                | Type                       | Default     | Description                                           |
| ------------------- | -------------------------- | ----------- | ----------------------------------------------------- |
| `columns`           | `TableColumn[]`            | --          | Column definitions (required, at least one).          |
| `rows`              | `Record<string, string>[]` | --          | Row data array (required).                            |
| `showHeader`        | `boolean`                  | `true`      | Whether to render the header row.                     |
| `headerStyle`       | `string`                   | --          | Named style for the header row.                       |
| `rowStyle`          | `string`                   | --          | Named style for body rows.                            |
| `alternateRowStyle` | `string`                   | --          | Named style for even-indexed rows (striped effect).   |
| `borderWidth`       | `number`                   | `0.5`       | Cell border width in points.                          |
| `borderColor`       | `string`                   | `"#000000"` | Cell border color as a hex string.                    |
| `cellPadding`       | `number`                   | `4`         | Uniform cell padding in points.                       |
| `headerRepeat`      | `boolean`                  | `true`      | Repeat the header when the table splits across pages. |

**TableColumn fields:**

| Name     | Type                                | Default  | Description                                   |
| -------- | ----------------------------------- | -------- | --------------------------------------------- |
| `key`    | `string`                            | --       | Data key in each row object (required).       |
| `header` | `string`                            | `key`    | Column header label.                          |
| `width`  | `number`                            | --       | Fixed width in points.                        |
| `flex`   | `number`                            | `1`      | Flex factor for distributing remaining space. |
| `align`  | `"left"` \| `"center"` \| `"right"` | `"left"` | Horizontal alignment for cell content.        |

Columns without a `width` share the remaining space proportionally based on their `flex` value.

### Example

```json
{
  "id": "invoice-items",
  "type": "table",
  "x": 0,
  "y": 0,
  "width": 500,
  "height": 200,
  "style": "body-text",
  "properties": {
    "columns": [
      { "key": "description", "header": "Description", "flex": 3 },
      { "key": "qty", "header": "Qty", "width": 50, "align": "center" },
      { "key": "price", "header": "Price", "width": 80, "align": "right" },
      { "key": "total", "header": "Total", "width": 80, "align": "right" }
    ],
    "rows": [
      { "description": "Widget A", "qty": "10", "price": "$5.00", "total": "$50.00" },
      { "description": "Widget B", "qty": "3", "price": "$12.50", "total": "$37.50" },
      { "description": "Service Fee", "qty": "1", "price": "$15.00", "total": "$15.00" }
    ],
    "showHeader": true,
    "headerStyle": "table-header",
    "alternateRowStyle": "table-alt-row",
    "borderWidth": 0.5,
    "borderColor": "#CCCCCC",
    "cellPadding": 6,
    "headerRepeat": true
  }
}
```

---

## barcode

Generates a barcode or QR code image from a string value using bwip-js. The barcode is rendered
as a rasterized image and scaled to fit within the element bounds.

### Properties

| Name              | Type      | Default     | Description                                                  |
| ----------------- | --------- | ----------- | ------------------------------------------------------------ |
| `value`           | `string`  | --          | Data to encode (required, non-empty).                        |
| `format`          | `string`  | --          | Barcode format identifier (required).                        |
| `barColor`        | `string`  | `"#000000"` | Bar/module color as a hex string.                            |
| `backgroundColor` | `string`  | `"#FFFFFF"` | Background color as a hex string.                            |
| `includeText`     | `boolean` | `false`     | Show human-readable text below the barcode (linear only).    |
| `textSize`        | `number`  | --          | Font size for the human-readable text in points.             |
| `scale`           | `number`  | `3`         | Module scale factor (higher = larger raster before fitting). |
| `moduleHeight`    | `number`  | `10`        | Bar height in mm for linear barcodes (ignored for 2D).       |
| `padding`         | `number`  | `2`         | Quiet zone padding in modules.                               |

**Supported formats (19 total):**

- **2D:** `qrcode`, `datamatrix`, `pdf417`, `azteccode`, `azteccodecompact`, `maxicode`
- **Linear:** `code128`, `code39`, `ean13`, `ean8`, `upca`, `upce`, `itf14`, `codabar`,
  `interleaved2of5`, `code93`, `isbn`, `issn`, `gs1-128`

### Example -- QR code

```json
{
  "id": "website-qr",
  "type": "barcode",
  "x": 0,
  "y": 0,
  "width": 100,
  "height": 100,
  "properties": {
    "value": "https://example.com",
    "format": "qrcode",
    "scale": 4,
    "padding": 2
  }
}
```

### Example -- Code 128 barcode

```json
{
  "id": "product-barcode",
  "type": "barcode",
  "x": 0,
  "y": 0,
  "width": 200,
  "height": 60,
  "properties": {
    "value": "ABC-12345-XYZ",
    "format": "code128",
    "includeText": true,
    "textSize": 10,
    "moduleHeight": 12,
    "barColor": "#000000",
    "backgroundColor": "#FFFFFF"
  }
}
```

---

## chart

Renders a chart from a Vega-Lite specification. The chart is compiled to SVG via Vega-Lite,
rasterized at a configurable scale, and embedded as an image.

### Properties

| Name         | Type                                             | Default     | Description                                              |
| ------------ | ------------------------------------------------ | ----------- | -------------------------------------------------------- |
| `spec`       | `object`                                         | --          | Vega-Lite specification object (required).               |
| `dataSource` | `array`                                          | --          | Data array injected as `spec.data.values`.               |
| `fit`        | `"contain"` \| `"cover"` \| `"fill"` \| `"none"` | `"contain"` | How the chart image fits within the element bounds.      |
| `scale`      | `number`                                         | `2`         | SVG rasterization scale factor (2 = HiDPI).              |
| `background` | `string`                                         | --          | Background color override (overrides `spec.background`). |

When `dataSource` is provided, its values are injected into the Vega-Lite spec as
`spec.data.values`, allowing you to bind chart data from your template data context.

### Example -- bar chart

```json
{
  "id": "sales-chart",
  "type": "chart",
  "x": 0,
  "y": 0,
  "width": 400,
  "height": 250,
  "properties": {
    "spec": {
      "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
      "width": 360,
      "height": 200,
      "mark": "bar",
      "encoding": {
        "x": { "field": "category", "type": "nominal", "title": "Category" },
        "y": { "field": "amount", "type": "quantitative", "title": "Amount" },
        "color": { "field": "category", "type": "nominal", "legend": null }
      }
    },
    "dataSource": [
      { "category": "Q1", "amount": 120 },
      { "category": "Q2", "amount": 180 },
      { "category": "Q3", "amount": 150 },
      { "category": "Q4", "amount": 210 }
    ],
    "fit": "contain",
    "scale": 2,
    "background": "#FFFFFF"
  }
}
```

---

## frame

Embeds a nested sequence of bands within an element. Frames support all band types and data
binding, making them useful for placing independent repeating content side by side (e.g. two
tables in a multi-column layout). Each band in the frame follows the same structure as
section-level bands.

### Properties

| Name    | Type     | Default | Description                              |
| ------- | -------- | ------- | ---------------------------------------- |
| `bands` | `Band[]` | --      | Array of nested band objects (required). |

Each band must include `id`, `type`, `height`, and `elements`, matching the standard band
structure defined in the template content model.

### Example

```json
{
  "id": "sidebar-frame",
  "type": "frame",
  "x": 0,
  "y": 0,
  "width": 250,
  "height": 300,
  "properties": {
    "bands": [
      {
        "id": "sidebar-header",
        "type": "body",
        "height": 30,
        "elements": [
          {
            "id": "sidebar-title",
            "type": "text",
            "x": 0,
            "y": 0,
            "width": 250,
            "height": 24,
            "style": "heading",
            "properties": { "content": "Sidebar" }
          }
        ]
      },
      {
        "id": "sidebar-items",
        "type": "detail",
        "height": 20,
        "dataSource": "sidebarItems",
        "elements": [
          {
            "id": "sidebar-item-text",
            "type": "text",
            "x": 0,
            "y": 0,
            "width": 250,
            "height": 18,
            "properties": { "content": "{{ item.label }}" }
          }
        ]
      }
    ]
  }
}
```
