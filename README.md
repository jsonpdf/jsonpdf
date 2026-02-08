# JsonPDF

An open source developer tool for designing templates and rendering PDFs using JSON data.

JsonPDF lets you define PDF templates as JSON, bind them to data, and render pixel-perfect PDFs. Templates can be authored by hand, via the CLI, or through a visual drag-and-drop editor.

## Architecture

JsonPDF uses a three-level content hierarchy inspired by [JasperReports](https://community.jaspersoft.com/downloads/community-edition/):

```
Template
├── page (default page config: size, orientation, margins)
├── dataSchema (JSON Schema defining expected input data)
├── styles (reusable named styles)
├── fonts (font declarations)
└── sections[] (groups of bands sharing a page config)
    ├── page? (overrides default page config for this section)
    └── bands[] (content flow within the section)
        ├── type (title, pageHeader, detail, etc.)
        ├── height / autoHeight
        ├── condition? (Liquid expression)
        ├── dataSource? (dot-path to array for detail bands)
        └── elements[] (visual primitives)
            ├── type (text, image, table, line, etc.)
            ├── x, y, width, height (absolute position within band)
            ├── style? (reference to named style)
            ├── styleOverrides? (inline overrides)
            └── properties (plugin-specific props)
```

**Sections** define page configuration (size, orientation, margins) — enabling mixed layouts within a single document. **Bands** define content flow; the renderer creates pages automatically. **Elements** are visual primitives positioned absolutely within their band.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full schema, type definitions, band types, plugin interface, and a complete invoice example.

## Packages

```
                ┌────────┐
                │  core  │
                └────┬───┘
                     │
             ┌───────┴───────┐
             │               │
       ┌─────▼────┐    ┌─────▼────┐
       │ template │    │ plugins  │
       └─────┬────┘    └─────┬────┘
             │               │
             └───────┬───────┘
                     │
               ┌─────▼────┐
               │ renderer │
               └─────┬────┘
                     │
             ┌───────┴───────┐
             │               │
        ┌────▼───┐      ┌────▼───┐
        │  cli   │      │ editor │
        └────────┘      └────────┘
```

Additionally, `cli` and `editor` both depend on `template` directly (for init/validate and the manipulation API, respectively).

| Package             | Description                                                                           |
| ------------------- | ------------------------------------------------------------------------------------- |
| `@jsonpdf/core`     | Shared types, utilities, JSON Schema validation via `ajv`                             |
| `@jsonpdf/template` | Template factory, validation, manipulation helpers                                    |
| `@jsonpdf/plugins`  | Element type implementations (text, image, line, container, list, table, chart, etc.) |
| `@jsonpdf/renderer` | PDF generation pipeline: validate, resolve (LiquidJS), measure, layout, render        |
| `@jsonpdf/cli`      | Command line tool for template management and rendering                               |
| `@jsonpdf/editor`   | Visual drag-and-drop template designer (React + Konva)                                |

## CLI Usage

```sh
jsonpdf init template.json           # scaffold a new template
jsonpdf validate template.json       # validate template schema
jsonpdf render -t template.json -d data.json -o output.pdf
jsonpdf sample-data template.json    # generate sample data from dataSchema
jsonpdf render --watch -t template.json -d data.json -o output.pdf
```

## Tech Stack

| Library          | Purpose                                           |
| ---------------- | ------------------------------------------------- |
| TypeScript       | Type safety across all packages                   |
| pnpm workspaces  | Monorepo management                               |
| Vitest           | Testing                                           |
| pdf-lib          | PDF generation (pure JS, works in browser + Node) |
| @pdf-lib/fontkit | Font embedding and subsetting                     |
| liquidjs         | Template expressions, filters, conditionals       |
| ajv              | JSON Schema validation                            |
| @resvg/resvg-js  | SVG rasterization for embedding in PDFs           |
| fontsource       | Open source font loading                          |
| commander        | CLI argument parsing                              |
| chalk            | CLI terminal styling                              |
| bwip-js          | Barcode and QR code generation                    |
| React + Konva    | Editor canvas and UI                              |
| vega-lite        | Chart rendering                                   |

## Implementation Roadmap

### Phase 0: Project Scaffolding

- [x] Initialize monorepo (pnpm workspaces, TypeScript config, path aliases)
- [x] Configure tooling (ESLint, Prettier, Vitest)
- [x] Set up CI/CD (GitHub Actions)
- [x] Create package structure for all 6 packages

### Phase 1: Core Types + Static Rendering

- [x] `@jsonpdf/core` — TypeScript interfaces, utilities, JSON Schema validation
- [x] `@jsonpdf/template` — Template factory, validation, basic add helpers (full manipulation API in Phase 9)
- [x] `@jsonpdf/plugins` — Text plugin (word wrapping, font measurement, multi-line)
- [x] `@jsonpdf/plugins` — Line plugin (solid and dashed via `dashPattern`)
- [x] `@jsonpdf/plugins` — List plugin (bullet, numbered, lettered with nesting and RichContent items)
- [x] `@jsonpdf/renderer` — Single-page rendering with `body` bands, standard fonts (no data binding yet)
- [x] End-to-end test: static text on a page renders to valid PDF

### Phase 2: Data Binding + Multi-Page

- [x] Renderer — LiquidJS integration and custom filters (`money`, `date`, etc.)
- [x] Renderer — Layout engine: two-pass measure + render
- [x] Renderer — Detail bands: iterate over `dataSource` arrays
- [x] Renderer — Column headers: repeat after page breaks
- [x] Renderer — Page headers/footers with `_pageNumber` and `_totalPages`
- [x] Renderer — Conditional bands (`condition` property)
- [x] Renderer — `pageBreakBefore` on bands
- [x] Renderer — `lastPageFooter`, `summary`, `noData` bands
- [x] Renderer — Multi-section support with per-section page config
- [x] Renderer — Group bands (`groupHeader`, `groupFooter` with `groupBy`)
- [x] End-to-end test: invoice with 100+ line items renders correctly across pages

### Phase 3: More Plugins + Advanced Features

- [x] Image plugin (URL, file path, base64, fit modes: contain, cover, fill, none)
- [x] Shape plugin (rectangle, circle, ellipse with fill, stroke, dashPattern, borderRadius)
- [x] Font loading via fontkit (custom TTF/OTF/WOFF embedding with subsetting)
- [x] Renderer — Element rotation support
- [x] Renderer — Conditional element styles (`conditionalStyles`) — completed in Phase 2
- [x] Renderer — Hyperlinks (`link` on StyledRun) and PDF bookmarks (`bookmark` on Section/Band)
- [x] Renderer — Cross-references (`anchor` on Element/Band, `{{ "id" | ref }}` Liquid filter)
- [x] Renderer — Widow/orphan control (`widows`, `orphans` in Style) — plumbing only, full implementation in Phase 7
- [x] Renderer — Multi-column sections (`columns`, `columnGap`) — tile mode
- [x] Renderer — Asymmetric column widths (`columnWidths` on Section)
- [x] Renderer — Variable page height (`autoHeight` on PageConfig)

### Phase 4: CLI

- [x] `jsonpdf init` — scaffold template
- [x] `jsonpdf validate` — validate template
- [x] `jsonpdf render` — render PDF
- [x] `jsonpdf sample-data` — generate sample data from dataSchema
- [x] Watch mode (`--watch`)

### Phase 5: Advanced Plugins

- [x] Container plugin (horizontal, vertical, absolute, grid layout)
- [x] Table plugin (columns, headers, borders, auto page-break)
- [x] Barcode/QR plugin (bwip-js, 19 formats, two-level caching)
- [x] SVG support in image plugin (@resvg/resvg-js rasterization)
- [x] Chart plugin (Vega-Lite → SVG → image plugin)
- [x] Frame plugin (nested band container for side-by-side repeating content)

### Phase 6: Text & Style Rendering

- [x] Text — `textDecoration`: underline, line-through, underline+line-through
- [x] Text — `letterSpacing`: inter-character spacing in text rendering
- [x] Text — `textAlign: "justify"`: full justification with word spacing
- [x] Style — `opacity` (0–1): graphics state transparency on any element
- [x] Style — Individual borders (`borderTop`, `borderRight`, `borderBottom`, `borderLeft`) on all elements
- [x] Style — `borderRadius` on container and image elements (currently shape-only)
- [x] Layout — `columnFooter` float mode (`float: true` sits under last detail row)

### Phase 7: Long-Form Document Support

- [x] Text — Widow/orphan control (full implementation with `splitWrappedText()` in text plugin)
- [x] Renderer — Footnotes (`footnote` on StyledRun, per-page separator line + superscript markers)
- [x] Renderer — Text reflow across columns (`columnMode: "flow"` with band splitting)
- [x] Renderer — Auto-generated Table of Contents (`_bookmarks` built-in data source)
- [x] Style — Gradient fills (linear, radial) on `backgroundColor` via PDF shading patterns
- [x] List plugin — Support `textAlign: "justify"`, `"center"`, `"right"` for list item content
- [x] Layout — Per-band `float` on columnFooter (`computeColumnFooterOffsets()`)

### Phase 8: Example Updates

- [x] Update existing examples to showcase Phase 6–7 features (newsletter gradient masthead, technical-report auto-TOC)
- [x] Add new examples for long-form documents (`longform-showcase`: footnotes, TOC, column flow, gradients, list alignment)

### Phase 9: Editor MVP

- [x] `@jsonpdf/template` — Full manipulation API (update, remove, move, clone, queries)
- [x] Editor scaffolding (React + Konva + Zustand + CSS Modules, Vite library build)
- [x] Canvas rendering (pages with margin guides, bands with type labels, 11 element type renderers)
- [x] Element click-to-select, drag-to-move, resize handles (8-point), selection overlay on separate Layer
- [x] Band click selection with highlight, band height resize via drag handle
- [x] Keyboard shortcuts (Delete, Escape, Arrow nudge 1pt / Shift+Arrow 10pt)
- [x] Property panel (context-sensitive panels for template, section, band, element properties + style overrides)
- [ ] Outline panel (hierarchical tree of sections, bands, elements with click-to-select)
- [ ] Band/section management (add, remove, reorder)
- [ ] Template import/export (JSON)
- [ ] Live PDF preview

### Phase 10: Editor Full

- [ ] Undo/redo
- [ ] Copy/paste, multi-select
- [ ] Alignment guides and snapping
- [ ] Zoom and pan
- [ ] Style manager
- [ ] Data schema editor with sample data generation
- [ ] Template gallery / starter templates

## License

[MIT](LICENSE)
