# @jsonpdf/renderer

PDF generation pipeline for jsonpdf — takes a template and data, produces a PDF.

## Pipeline

```
Template + Data
  → Validate (schema check)
  → Resolve (LiquidJS expressions → concrete values)
  → Measure (compute element sizes via plugins)
  → Layout (page breaks, columns, band placement)
  → Render (draw to PDF via pdf-lib)
  → PDF bytes
```

The renderer uses **two-pass rendering** to support `_totalPages` — the first pass computes the page count, then the second pass renders with the final value available.

## Features

- LiquidJS expression binding with dot-path data resolution
- Conditional bands (show/hide based on expressions)
- Data-driven band iteration (`dataSource` property)
- Multi-section layouts with independent page configurations
- Multi-column layouts
- Footnotes
- PDF bookmarks/outlines
- Anchor links
- Gradient fills
- Font embedding with weight/style variants

## Usage

```ts
import { renderPdf } from '@jsonpdf/renderer';

const result = await renderPdf(template, data, {
  fonts: fontMap,
});

// result.pdf — Uint8Array of PDF bytes
// result.pages — number of pages rendered
```

## Exports

| Category    | Exports                                                                     |
| ----------- | --------------------------------------------------------------------------- |
| Main        | `renderPdf`, `RenderOptions`, `RenderResult`                                |
| Expressions | `createExpressionEngine`, `ExpressionEngine`                                |
| Data        | `validateData`, `resolveDotPath`, `buildScope`                              |
| Layout      | `mergePageConfig`, `LayoutBand`, `LayoutPage`, `LayoutResult`               |
| Bands       | `BandInstance`, `ExpandedSection`                                           |
| Fonts       | `embedFonts`, `collectFontSpecs`, `mapWeight`, `FontSpec`                   |
| Bookmarks   | `collectAnchors`, `buildPdfOutline`, `BookmarkEntry`                        |
| Columns     | `computeColumnLayout`, `ColumnLayout`                                       |
| Platform    | `initBrowser` (re-exported from `@jsonpdf/plugins`)                         |
