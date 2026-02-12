# Advanced Features

This guide covers jsonpdf's advanced capabilities for building complex, professional documents.
All coordinates and dimensions are in points (1 pt = 1/72 inch). Standard US Letter is
612 x 792 pt; A4 is 595 x 842 pt.

---

## Multi-Section Documents

A template can contain multiple sections, each with its own page configuration. This is useful
when different parts of a document need different page sizes, orientations, or margins -- for
example, a portrait cover page followed by landscape data tables.

Each section can override the template-level `page` properties: `width`, `height`, `orientation`,
and `margins`. Properties not specified in the section fall back to the template defaults.

```json
{
  "page": {
    "width": 612,
    "height": 792,
    "margins": { "top": 50, "right": 50, "bottom": 50, "left": 50 }
  },
  "sections": [
    {
      "id": "cover",
      "name": "Cover Page",
      "bands": [
        {
          "id": "cover-band",
          "type": "title",
          "height": 692,
          "elements": [
            {
              "id": "title-text",
              "type": "text",
              "x": 0,
              "y": 200,
              "width": 512,
              "height": 40,
              "properties": { "content": "Annual Report 2026" }
            }
          ]
        }
      ]
    },
    {
      "id": "data-tables",
      "name": "Financial Data",
      "page": {
        "width": 842,
        "height": 595,
        "orientation": "landscape",
        "margins": { "top": 30, "right": 30, "bottom": 30, "left": 30 }
      },
      "bands": [
        {
          "id": "table-band",
          "type": "body",
          "height": 500,
          "elements": [
            {
              "id": "data-table",
              "type": "table",
              "x": 0,
              "y": 0,
              "width": 782,
              "height": 500,
              "properties": {
                "columns": [
                  { "key": "quarter", "header": "Quarter", "width": 100 },
                  { "key": "revenue", "header": "Revenue", "flex": 1 },
                  { "key": "expenses", "header": "Expenses", "flex": 1 }
                ],
                "rows": "{{ financials }}"
              }
            }
          ]
        }
      ]
    }
  ]
}
```

---

## Multi-Column Layouts

Sections support multi-column layouts through the `columns` property. By default, every section
has one column. When `columns` is set to 2 or more, the available content width is divided among
the columns.

### Configuration properties

| Property       | Type     | Default  | Description                                         |
| -------------- | -------- | -------- | --------------------------------------------------- |
| `columns`      | integer  | `1`      | Number of columns                                   |
| `columnGap`    | number   | `0`      | Spacing between columns in points                   |
| `columnMode`   | string   | `"tile"` | `"tile"` or `"flow"`                                |
| `columnWidths` | number[] | equal    | Relative width ratios (length must match `columns`) |

### Column modes

- **tile** (default): Detail bands fill columns left-to-right, then move to the next row. Each
  detail iteration occupies the next column slot. Good for card-style layouts like product
  catalogs.
- **flow**: Text reflows across columns in newspaper style. Content fills the first column top to
  bottom, then continues at the top of the next column. Good for articles and newsletters.

### Asymmetric columns

The `columnWidths` property accepts an array of relative ratios. For example, `[1, 2]` creates
a two-column layout where the right column is twice as wide as the left.

### Band interaction with columns

- `pageHeader` and `pageFooter` bands span the full page width, ignoring column boundaries.
- `columnHeader` and `columnFooter` bands repeat for each column group.
- `detail` bands distribute across columns according to the column mode.

```json
{
  "id": "catalog-section",
  "name": "Product Catalog",
  "columns": 3,
  "columnGap": 12,
  "bands": [
    {
      "id": "page-hdr",
      "type": "pageHeader",
      "height": 30,
      "elements": [
        {
          "id": "hdr-text",
          "type": "text",
          "x": 0,
          "y": 5,
          "width": 535,
          "height": 20,
          "properties": { "content": "Product Catalog -- Page {{ _pageNumber }}" }
        }
      ]
    },
    {
      "id": "product-card",
      "type": "detail",
      "dataSource": "products",
      "height": 120,
      "elements": [
        {
          "id": "product-name",
          "type": "text",
          "x": 5,
          "y": 5,
          "width": 160,
          "height": 20,
          "styleOverrides": { "fontWeight": "bold" },
          "properties": { "content": "{{ item.name }}" }
        },
        {
          "id": "product-price",
          "type": "text",
          "x": 5,
          "y": 30,
          "width": 160,
          "height": 16,
          "properties": { "content": "{{ item.price | money }}" }
        },
        {
          "id": "product-desc",
          "type": "text",
          "x": 5,
          "y": 50,
          "width": 160,
          "height": 60,
          "styleOverrides": { "fontSize": 8, "color": "#666666" },
          "properties": { "content": "{{ item.description }}" }
        }
      ]
    },
    {
      "id": "page-ftr",
      "type": "pageFooter",
      "height": 20,
      "elements": [
        {
          "id": "ftr-text",
          "type": "text",
          "x": 0,
          "y": 0,
          "width": 535,
          "height": 16,
          "styleOverrides": { "textAlign": "center", "fontSize": 8 },
          "properties": { "content": "Page {{ _pageNumber }} of {{ _totalPages }}" }
        }
      ]
    }
  ]
}
```

---

## PDF Bookmarks

Bookmarks create an outline/table of contents in the PDF reader's sidebar. They are defined at
two levels:

- **Section `bookmark`**: Creates a level-0 (top-level) outline entry.
- **Band `bookmark`**: Creates a level-1 (nested) outline entry.

Both properties accept Liquid expressions, so bookmark titles can be dynamic.

```json
{
  "sections": [
    {
      "id": "intro",
      "bookmark": "Introduction",
      "bands": [
        {
          "id": "overview",
          "type": "body",
          "height": 200,
          "bookmark": "Overview",
          "elements": [
            {
              "id": "overview-text",
              "type": "text",
              "x": 0,
              "y": 0,
              "width": 512,
              "height": 200,
              "properties": { "content": "..." }
            }
          ]
        },
        {
          "id": "scope",
          "type": "body",
          "height": 150,
          "bookmark": "Scope",
          "elements": [
            {
              "id": "scope-text",
              "type": "text",
              "x": 0,
              "y": 0,
              "width": 512,
              "height": 150,
              "properties": { "content": "..." }
            }
          ]
        }
      ]
    },
    {
      "id": "department-data",
      "bookmark": "{{ departmentName }}",
      "bands": []
    }
  ]
}
```

The PDF reader sidebar will show:

```
- Introduction
  - Overview
  - Scope
- Sales Department
```

---

## Cross-References and Anchors

Anchors create named reference points that can be resolved to page numbers at render time.

- Set `anchor` on a band or element to create a named reference point.
- Use the `ref` Liquid filter to resolve an anchor ID to its 1-based page number:
  `{{ "anchor-id" | ref }}`.
- If the anchor does not exist, the filter returns `??`.

Anchors are collected during the first rendering pass, so `ref` values are accurate even when
they reference content that appears later in the document (forward references).

```json
{
  "sections": [
    {
      "id": "main",
      "bands": [
        {
          "id": "intro-band",
          "type": "body",
          "height": 100,
          "elements": [
            {
              "id": "intro-text",
              "type": "text",
              "x": 0,
              "y": 0,
              "width": 502,
              "height": 40,
              "properties": {
                "content": "Results are presented in Chapter 3 (page {{ \"ch3\" | ref }}). See also Appendix A (page {{ \"appendix\" | ref }})."
              }
            }
          ]
        },
        {
          "id": "ch3-band",
          "type": "body",
          "height": 300,
          "pageBreakBefore": true,
          "anchor": "ch3",
          "bookmark": "3. Results",
          "elements": [
            {
              "id": "ch3-title",
              "type": "text",
              "x": 0,
              "y": 0,
              "width": 502,
              "height": 24,
              "properties": { "content": "3. Results" }
            }
          ]
        },
        {
          "id": "appendix-band",
          "type": "body",
          "height": 200,
          "pageBreakBefore": true,
          "anchor": "appendix",
          "bookmark": "Appendix A",
          "elements": [
            {
              "id": "appendix-title",
              "type": "text",
              "x": 0,
              "y": 0,
              "width": 502,
              "height": 24,
              "properties": { "content": "Appendix A: Raw Data" }
            }
          ]
        }
      ]
    }
  ]
}
```

---

## Table of Contents

jsonpdf supports automatic table of contents generation through the built-in `_bookmarks` data
source. During the two-pass rendering pipeline, the first pass collects all bookmarks and their
page numbers. In the second pass, `_bookmarks` is injected as a data source that detail bands
can iterate over.

Each entry in `_bookmarks` has the following shape:

| Field        | Type   | Description                                                 |
| ------------ | ------ | ----------------------------------------------------------- |
| `title`      | string | The bookmark title text                                     |
| `pageNumber` | number | 1-based page number where the bookmark appears              |
| `level`      | number | Nesting level: 0 for sections, 1 for bands                  |
| `anchorId`   | string | Anchor ID for internal links (derived from section/band id) |

Combine `_bookmarks` with the `link` property on styled runs to create clickable TOC entries
that navigate to the bookmarked location.

```json
{
  "sections": [
    {
      "id": "toc-section",
      "bookmark": "Table of Contents",
      "bands": [
        {
          "id": "toc-heading",
          "type": "title",
          "height": 40,
          "elements": [
            {
              "id": "toc-title",
              "type": "text",
              "x": 0,
              "y": 10,
              "width": 502,
              "height": 24,
              "styleOverrides": { "fontSize": 16, "fontWeight": "bold" },
              "properties": { "content": "Table of Contents" }
            }
          ]
        },
        {
          "id": "toc-entry",
          "type": "detail",
          "dataSource": "_bookmarks",
          "height": 22,
          "elements": [
            {
              "id": "toc-item-title",
              "type": "text",
              "x": 20,
              "y": 2,
              "width": 380,
              "height": 18,
              "styleOverrides": { "fontSize": 10 },
              "properties": {
                "content": [
                  {
                    "text": "{{ item.title }}",
                    "link": "#{{ item.anchorId }}"
                  }
                ]
              },
              "conditionalStyles": [
                {
                  "condition": "item.level == 0",
                  "styleOverrides": { "fontWeight": "bold", "fontSize": 11 }
                }
              ]
            },
            {
              "id": "toc-item-page",
              "type": "text",
              "x": 400,
              "y": 2,
              "width": 102,
              "height": 18,
              "styleOverrides": { "textAlign": "right", "fontSize": 10 },
              "properties": {
                "content": [
                  {
                    "text": "{{ item.pageNumber }}",
                    "link": "#{{ item.anchorId }}"
                  }
                ]
              }
            }
          ]
        }
      ]
    },
    {
      "id": "chapter-1",
      "bookmark": "Chapter 1",
      "bands": [
        {
          "id": "ch1-body",
          "type": "body",
          "height": 600,
          "anchor": "ch1",
          "bookmark": "Background",
          "elements": []
        }
      ]
    }
  ]
}
```

The `condition` property on the detail band can filter entries -- for example,
`"condition": "item.level == 1"` shows only band-level bookmarks, omitting section-level
entries from the TOC listing.

---

## Internal Links

Styled runs support internal navigation through the `link` property. When the link value starts
with `#`, it is treated as an internal anchor reference. Clicking the link in a PDF reader
navigates to the page containing that anchor.

Combine internal links with the `ref` filter to show both a clickable link and the target page
number.

```json
{
  "id": "cross-ref-text",
  "type": "text",
  "x": 0,
  "y": 0,
  "width": 502,
  "height": 30,
  "properties": {
    "content": [
      { "text": "For details, see " },
      {
        "text": "Chapter 3 (page {{ \"ch3\" | ref }})",
        "link": "#ch3",
        "styleOverrides": { "color": "#0066cc", "textDecoration": "underline" }
      },
      { "text": "." }
    ]
  }
}
```

External links work the same way but use a full URL instead of an anchor reference:

```json
{
  "text": "Visit our website",
  "link": "https://example.com"
}
```

---

## Footnotes

Styled runs can include footnotes via the `footnote` property. Footnotes are rendered at the
bottom of the page with automatic superscript numbering (1, 2, 3...) and a separator line
above the footnote area.

The `footnote` property accepts `RichContent` -- either a plain string or an array of styled
runs -- so footnotes can include their own formatting.

```json
{
  "id": "history-text",
  "type": "text",
  "x": 0,
  "y": 0,
  "width": 502,
  "height": 60,
  "styleOverrides": { "fontSize": 10, "lineHeight": 1.6 },
  "properties": {
    "content": [
      { "text": "The invention of the printing press by " },
      {
        "text": "Gutenberg",
        "footnote": "Johannes Gutenberg (c. 1400-1468), a German goldsmith, invented the movable type printing press around 1440."
      },
      { "text": " transformed the production of books. Manuscripts that were once copied in a " },
      {
        "text": "scriptorium",
        "footnote": [
          { "text": "A " },
          {
            "text": "scriptorium",
            "styleOverrides": { "fontStyle": "italic" }
          },
          { "text": " was a room in medieval monasteries devoted to copying manuscripts." }
        ]
      },
      { "text": " could now be printed in hundreds of copies." }
    ]
  }
}
```

In the rendered PDF, "Gutenberg" and "scriptorium" will display superscript markers (1 and 2),
and the corresponding footnote text will appear at the bottom of the page.

---

## Grouping

Detail bands support grouping through the `groupBy` property. When set, the data source is
partitioned by the specified property path. Group transitions trigger `groupHeader` and
`groupFooter` bands.

- **`groupBy`** on a detail band: A dot-path expression identifying the grouping key
  (e.g., `"department"` or `"address.city"`).
- **`groupHeader`** band: Renders once when the `groupBy` value changes. The current group key
  is available as `{{ _groupKey }}`.
- **`groupFooter`** band: Renders before the `groupBy` value changes (i.e., at the end of each
  group).

The `groupHeader` and `groupFooter` bands must be siblings of the detail band within the same
section.

```json
{
  "id": "report-section",
  "bands": [
    {
      "id": "dept-header",
      "type": "groupHeader",
      "height": 28,
      "backgroundColor": "#1a1a2e",
      "bookmark": "{{ _groupKey }}",
      "elements": [
        {
          "id": "dept-name",
          "type": "text",
          "x": 10,
          "y": 6,
          "width": 512,
          "height": 16,
          "styleOverrides": { "fontWeight": "bold", "color": "#ffffff" },
          "properties": { "content": "{{ _groupKey }}" }
        }
      ]
    },
    {
      "id": "order-detail",
      "type": "detail",
      "dataSource": "orders",
      "groupBy": "department",
      "height": 24,
      "elements": [
        {
          "id": "order-id",
          "type": "text",
          "x": 15,
          "y": 4,
          "width": 180,
          "height": 16,
          "properties": { "content": "{{ item.orderId }}" }
        },
        {
          "id": "order-amount",
          "type": "text",
          "x": 400,
          "y": 4,
          "width": 112,
          "height": 16,
          "styleOverrides": { "textAlign": "right" },
          "properties": { "content": "{{ item.amount | money }}" }
        }
      ]
    },
    {
      "id": "dept-footer",
      "type": "groupFooter",
      "height": 10,
      "elements": [
        {
          "id": "dept-separator",
          "type": "line",
          "x": 0,
          "y": 5,
          "width": 532,
          "height": 1,
          "properties": { "color": "#e0e0e0", "thickness": 1 }
        }
      ]
    }
  ]
}
```

Given input data like:

```json
{
  "orders": [
    { "orderId": "ORD-001", "department": "Engineering", "amount": 1500 },
    { "orderId": "ORD-002", "department": "Engineering", "amount": 2300 },
    { "orderId": "ORD-003", "department": "Marketing", "amount": 800 }
  ]
}
```

The renderer outputs a "Engineering" group header, two detail rows, a group footer separator,
then a "Marketing" group header, one detail row, and another group footer.

---

## Conditional Rendering

Both bands and elements support a `condition` property that controls whether they are rendered.
The value is a raw Liquid expression (without `{{ }}` delimiters). When the expression evaluates
to a falsy value, the band or element is skipped entirely.

### Band condition

```json
{
  "id": "premium-banner",
  "type": "body",
  "height": 40,
  "condition": "customer.isPremium",
  "elements": [
    {
      "id": "premium-text",
      "type": "text",
      "x": 0,
      "y": 10,
      "width": 512,
      "height": 20,
      "styleOverrides": { "fontWeight": "bold", "color": "#d4af37" },
      "properties": { "content": "Premium Member Benefits Included" }
    }
  ]
}
```

### Element condition

```json
{
  "id": "sale-badge",
  "type": "shape",
  "x": 120,
  "y": 15,
  "width": 55,
  "height": 20,
  "condition": "item.onSale",
  "properties": {
    "shapeType": "rect",
    "fill": "#dc2626",
    "cornerRadius": 4
  }
}
```

### noData band

The `noData` band type renders only when the associated detail band's `dataSource` is empty.
This is useful for displaying a fallback message.

```json
[
  {
    "id": "line-items",
    "type": "detail",
    "dataSource": "items",
    "height": 24,
    "elements": [
      {
        "id": "item-name",
        "type": "text",
        "x": 0,
        "y": 4,
        "width": 300,
        "height": 16,
        "properties": { "content": "{{ item.name }}" }
      }
    ]
  },
  {
    "id": "no-items",
    "type": "noData",
    "height": 40,
    "elements": [
      {
        "id": "no-items-text",
        "type": "text",
        "x": 0,
        "y": 10,
        "width": 512,
        "height": 20,
        "styleOverrides": { "fontSize": 12, "fontStyle": "italic" },
        "properties": { "content": "No line items" }
      }
    ]
  }
]
```

---

## Auto-Height

Auto-height allows bands, text elements, and pages to grow dynamically to fit their content.

### Band auto-height

When `autoHeight` is set on a band, the band height expands to accommodate its tallest element.
The declared `height` acts as the minimum height.

```json
{
  "id": "notes-band",
  "type": "body",
  "height": 40,
  "autoHeight": true,
  "elements": [
    {
      "id": "notes-text",
      "type": "text",
      "x": 0,
      "y": 0,
      "width": 512,
      "height": 20,
      "properties": {
        "content": "{{ notes }}",
        "autoHeight": true
      }
    }
  ]
}
```

### Text element auto-height

Setting `autoHeight: true` in a text element's `properties` causes the element height to grow
to fit all wrapped text. This is typically combined with band-level `autoHeight` so the band
expands to match.

```json
{
  "id": "description",
  "type": "text",
  "x": 0,
  "y": 0,
  "width": 400,
  "height": 20,
  "properties": {
    "content": "{{ item.longDescription }}",
    "autoHeight": true
  }
}
```

### Page auto-height

Setting `autoHeight: true` on the page configuration causes the page height to grow to fit all
content, producing a single continuous page. This is useful for receipts, labels, or any
document where a fixed page height is undesirable.

```json
{
  "page": {
    "width": 288,
    "height": 0,
    "autoHeight": true,
    "margins": { "top": 10, "right": 10, "bottom": 10, "left": 10 }
  }
}
```

When `autoHeight` is enabled on the page, automatic page breaks are suppressed. All content
flows onto a single page whose height is determined by the total content.

---

## Element Rotation

Elements can be rotated clockwise around their center using the `rotation` property, specified
in degrees.

Common use cases include watermark text, rotated labels, and decorative elements.

```json
{
  "id": "watermark",
  "type": "text",
  "x": 90,
  "y": 180,
  "width": 432,
  "height": 100,
  "rotation": 335,
  "styleOverrides": {
    "fontSize": 72,
    "color": "#cccccc",
    "textAlign": "center",
    "opacity": 0.3
  },
  "properties": {
    "content": "DRAFT"
  }
}
```

Rotation is often combined with `condition` to show the watermark only in certain states:

```json
{
  "id": "fragile-stamp",
  "type": "text",
  "x": 200,
  "y": 170,
  "width": 100,
  "height": 30,
  "rotation": 340,
  "condition": "fragile",
  "styleOverrides": {
    "fontSize": 18,
    "fontWeight": "bold",
    "color": "#dc2626"
  },
  "properties": { "content": "FRAGILE" }
}
```

---

## Page Break Control

### Explicit page breaks

The `pageBreakBefore` property on a band forces a new page before the band is rendered. This is
useful for starting chapters or major sections on a fresh page.

```json
{
  "id": "chapter-2",
  "type": "body",
  "height": 300,
  "pageBreakBefore": true,
  "anchor": "ch2",
  "bookmark": "2. Methodology",
  "elements": [
    {
      "id": "ch2-title",
      "type": "text",
      "x": 0,
      "y": 5,
      "width": 502,
      "height": 24,
      "styleOverrides": { "fontSize": 18, "fontWeight": "bold" },
      "properties": { "content": "2. Methodology" }
    }
  ]
}
```

### Automatic page breaks

When content overflows the available page height, jsonpdf automatically inserts a page break.
After a page break:

- `pageHeader` bands are rendered at the top of the new page.
- `columnHeader` bands repeat at the top of each column on the new page.
- `pageFooter` bands are rendered at the bottom of every page (except the last page if a
  `lastPageFooter` is defined).

### Table header repeat

Table elements support a `headerRepeat` property (default `true`). When a table splits across
pages, the header row is automatically repeated at the top of the continuation. Set
`headerRepeat: false` to disable this behavior.

```json
{
  "id": "long-table",
  "type": "table",
  "x": 0,
  "y": 0,
  "width": 502,
  "height": 500,
  "properties": {
    "columns": [
      { "key": "id", "header": "ID", "width": 60 },
      { "key": "name", "header": "Name", "flex": 2 },
      { "key": "status", "header": "Status", "flex": 1 }
    ],
    "rows": "{{ records }}",
    "headerRepeat": true
  }
}
```
