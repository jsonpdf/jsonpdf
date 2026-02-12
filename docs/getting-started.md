# Getting Started with jsonpdf

jsonpdf lets you design PDF templates as JSON and render them to PDF with dynamic data.
This guide walks you through installation, creating your first template, rendering it,
and exploring the key features.

## 1. Installation

Install the CLI globally:

```sh
npm install -g @jsonpdf/cli
```

Verify the installation:

```sh
jsonpdf --version
```

## 2. Your First Template

Scaffold a new template with the `init` command:

```sh
jsonpdf init template.json
```

This creates a minimal template that renders a single page with "Hello, jsonpdf!" text.
Here is a simplified version of the generated file:

```json
{
  "version": "1.0",
  "name": "Untitled Template",
  "page": {
    "width": 612,
    "height": 792,
    "margins": { "top": 40, "right": 40, "bottom": 40, "left": 40 }
  },
  "dataSchema": {
    "type": "object",
    "properties": {}
  },
  "defaultStyle": {
    "fontFamily": "Inter"
  },
  "styles": {},
  "sections": [
    {
      "id": "main",
      "bands": [
        {
          "id": "body-band",
          "type": "body",
          "height": 40,
          "elements": [
            {
              "id": "hello",
              "type": "text",
              "x": 0,
              "y": 10,
              "width": 200,
              "height": 20,
              "properties": { "content": "Hello, jsonpdf!" }
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

### Top-level fields

| Field          | Description                                                                          |
| -------------- | ------------------------------------------------------------------------------------ |
| `version`      | Template format version. Always `"1.0"`.                                             |
| `name`         | Display name for the template.                                                       |
| `page`         | Default page size, orientation, and margins (in points; 1 pt = 1/72 inch).           |
| `dataSchema`   | JSON Schema (draft 2020-12) describing the shape of input data.                      |
| `defaultStyle` | Base style applied to all elements. `fontFamily` is required.                        |
| `styles`       | Named style definitions that elements can reference by key.                          |
| `fonts`        | Font declarations with embedded base64 data. Includes Inter (4 variants) by default. |
| `sections`     | Ordered list of sections, each containing bands with elements.                       |

## 3. Rendering a PDF

Render the template to a PDF file:

```sh
jsonpdf render -t template.json -o output.pdf
```

Open `output.pdf` to see the result. You can also watch for changes and re-render
automatically:

```sh
jsonpdf render -t template.json -o output.pdf --watch
```

## 4. Adding Data

Templates become powerful when you bind them to data. Create a `data.json` file:

```json
{
  "recipient": "Alice",
  "amount": 1250.0,
  "date": "February 11, 2026"
}
```

Update your template's `dataSchema` to describe this data:

```json
{
  "dataSchema": {
    "type": "object",
    "properties": {
      "recipient": { "type": "string" },
      "amount": { "type": "number" },
      "date": { "type": "string" }
    }
  }
}
```

Then use `{{ }}` expressions in element content to reference the data. For example,
replace the "Hello, jsonpdf!" text element with:

```json
{
  "id": "greeting",
  "type": "text",
  "x": 0,
  "y": 10,
  "width": 400,
  "height": 20,
  "properties": {
    "content": "Payment of ${{ amount }} received from {{ recipient }} on {{ date }}."
  }
}
```

Render with data:

```sh
jsonpdf render -t template.json -d data.json -o output.pdf
```

Expressions use [LiquidJS](https://liquidjs.com/) syntax, so you can use filters,
conditionals, and loops:

```
{{ amount | round: 2 }}
{{ recipient | upcase }}
```

## 5. Using the Visual Editor

jsonpdf ships with a browser-based visual editor for designing templates interactively:

```sh
jsonpdf editor template.json
```

This launches a local dev server (default port 5173) and opens the editor in your
browser. You can drag and drop elements, edit styles, and preview the rendered PDF
in real time. Start without a template to create one from scratch:

```sh
jsonpdf editor
```

## 6. Generating Sample Data

If your template has a `dataSchema`, you can generate sample data automatically:

```sh
jsonpdf sample-data template.json -o sample.json
```

This reads the `dataSchema` and produces a JSON file with placeholder values matching
the schema. Array fields default to 3 items; override with `--array-length`:

```sh
jsonpdf sample-data template.json -o sample.json --array-length 5
```

You can then render with the generated sample data:

```sh
jsonpdf render -t template.json -d sample.json -o output.pdf
```

## 7. Examples

The repository includes 15 example templates in the `examples/` directory, each
demonstrating different features:

| Template              | Description                                                                 |
| --------------------- | --------------------------------------------------------------------------- |
| `certificate`         | Landscape certificate with custom fonts, shapes, and rotation               |
| `dashboard`           | Operations dashboard with charts, tables, and conditional styles            |
| `event-ticket`        | Compact ticket with QR code, tear line, and conditional VIP badge           |
| `financial-statement` | Annual financial statement with income and balance sheet tables             |
| `invoice`             | Multi-page invoice with line items, page headers/footers, and data binding  |
| `longform-showcase`   | Multi-page document with gradients, column flow, footnotes, and TOC         |
| `newsletter`          | Newsletter with custom fonts, containers, lists, and rich text              |
| `pay-stub`            | Employee pay stub with frame plugin for side-by-side layout                 |
| `product-catalog`     | Multi-page catalog with cards, conditional styles, and image placeholders   |
| `resume`              | Professional resume with numbered lists, rich text, and multiple body bands |
| `sales-report`        | Sales report with charts, grouped data by department, and bookmarks         |
| `shipping-label`      | 4x6 shipping label with barcodes and conditional FRAGILE marking            |
| `technical-report`    | Multi-page report with cross-references, TOC, images, and noData band       |
| `text-showcase`       | Single-page showcase of text styling: justification, decoration, opacity    |
| `travel-itinerary`    | Travel itinerary with images, container grid layout, and ordered lists      |

Render any example:

```sh
cd examples/invoice
jsonpdf render -t template.json -d data.json -o invoice.pdf
```

Or render all examples at once from the repository root:

```sh
pnpm examples
```

## 8. What's Next

Dive deeper into jsonpdf with these guides:

- [Template Guide](template-guide.md) -- Sections, bands, and the content model
- [Element Reference](elements.md) -- All element types and their properties
- [Styling](styling.md) -- Default styles, named styles, and conditional styles
- [Advanced Features](advanced-features.md) -- Expressions, page breaks, columns, and more
- [CLI Reference](cli-reference.md) -- Full command-line usage
- [Rendering API](rendering-api.md) -- Using the renderer programmatically
- [Architecture](architecture.md) -- Package structure and design decisions
