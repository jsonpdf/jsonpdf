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

| Package | Description |
|---------|-------------|
| `@jsonpdf/core` | Shared types, utilities, JSON Schema validation via `ajv` |
| `@jsonpdf/template` | Template factory, validation, manipulation helpers |
| `@jsonpdf/plugins` | Element type implementations (text, image, line, container, list, table, chart, etc.) |
| `@jsonpdf/renderer` | PDF generation pipeline: validate, resolve (LiquidJS), measure, layout, render |
| `@jsonpdf/cli` | Command line tool for template management and rendering |
| `@jsonpdf/editor` | Visual drag-and-drop template designer (React + Konva) |

## CLI Usage

```sh
jsonpdf init template.json           # scaffold a new template
jsonpdf validate template.json       # validate template schema
jsonpdf render -t template.json -d data.json -o output.pdf
jsonpdf sample-data template.json    # generate sample data from dataSchema
jsonpdf render --watch -t template.json -d data.json -o output.pdf
```

## Tech Stack

| Library | Purpose |
|---------|---------|
| TypeScript | Type safety across all packages |
| pnpm workspaces | Monorepo management |
| Vitest | Testing |
| pdf-lib | PDF generation (pure JS, works in browser + Node) |
| @pdf-lib/fontkit | Font embedding and subsetting |
| liquidjs | Template expressions, filters, conditionals |
| ajv | JSON Schema validation |
| @resvg/resvg-js | SVG rasterization for embedding in PDFs |
| fontsource | Open source font loading |
| commander | CLI argument parsing |
| chalk | CLI terminal styling |
| bwip-js | Barcode and QR code generation |
| React + Konva | Editor canvas and UI |
| vega-lite | Chart rendering |

## Implementation Roadmap

### Phase 0: Project Scaffolding
- [ ] Initialize monorepo (pnpm workspaces, TypeScript config, path aliases)
- [ ] Configure tooling (ESLint, Prettier, Vitest)
- [ ] Set up CI/CD (GitHub Actions)
- [ ] Create package structure for all 6 packages

### Phase 1: Core Types + Static Rendering
- [ ] `@jsonpdf/core` — TypeScript interfaces, utilities, JSON Schema validation
- [ ] `@jsonpdf/template` — Template factory, validation, basic add helpers (full manipulation API in Phase 6)
- [ ] `@jsonpdf/plugins` — Text plugin (word wrapping, font measurement, multi-line)
- [ ] `@jsonpdf/plugins` — Line plugin (solid and dashed via `dashPattern`)
- [ ] `@jsonpdf/plugins` — List plugin (bullet, numbered, lettered with nesting and RichContent items)
- [ ] `@jsonpdf/renderer` — Single-page rendering with `body` bands, standard fonts (no data binding yet)
- [ ] End-to-end test: static text on a page renders to valid PDF

### Phase 2: Data Binding + Multi-Page
- [ ] Renderer — LiquidJS integration and custom filters (`money`, `date`, etc.)
- [ ] Renderer — Layout engine: two-pass measure + render
- [ ] Renderer — Detail bands: iterate over `dataSource` arrays
- [ ] Renderer — Column headers: repeat after page breaks
- [ ] Renderer — Page headers/footers with `_pageNumber` and `_totalPages`
- [ ] Renderer — Conditional bands (`condition` property)
- [ ] Renderer — `pageBreakBefore` on bands
- [ ] Renderer — `lastPageFooter`, `summary`, `noData` bands
- [ ] Renderer — Multi-section support with per-section page config
- [ ] Renderer — Group bands (`groupHeader`, `groupFooter` with `groupBy`)
- [ ] End-to-end test: invoice with 100+ line items renders correctly across pages

### Phase 3: More Plugins + Advanced Features
- [ ] Image plugin (URL, file path, base64, fit modes, SVG rasterization via resvg-js)
- [ ] Container plugin (horizontal, vertical, absolute, grid layout)
- [ ] Shape plugin (rectangle, circle, ellipse with fill, stroke, dashPattern)
- [ ] Font loading via fontsource
- [ ] Renderer — Element rotation support
- [ ] Renderer — Conditional element styles (`conditionalStyles`)
- [ ] Renderer — Hyperlinks (`link` on StyledRun) and PDF bookmarks (`bookmark` on Section/Band)
- [ ] Renderer — Cross-references (`anchor` on Element/Band, `{{ ref("id") }}` Liquid function)
- [ ] Renderer — Widow/orphan control (`widows`, `orphans` in Style)
- [ ] Renderer — Multi-column sections (`columns`, `columnGap`)
- [ ] Renderer — Asymmetric column widths (`columnWidths` on Section)
- [ ] Renderer — Variable page height (`autoHeight` on PageConfig)

### Phase 4: CLI
- [ ] `jsonpdf init` — scaffold template
- [ ] `jsonpdf validate` — validate template
- [ ] `jsonpdf render` — render PDF
- [ ] `jsonpdf sample-data` — generate sample data from dataSchema
- [ ] Watch mode (`--watch`)

### Phase 5: Advanced Plugins
- [ ] Table plugin (columns, headers, borders, auto page-break)
- [ ] Chart plugin (Vega-Lite → image → PDF)
- [ ] Barcode/QR plugin
- [ ] Frame plugin (nested band container for side-by-side repeating content)

### Phase 6: Editor MVP
- [ ] `@jsonpdf/template` — Full manipulation API (update, remove, move, clone, queries)
- [ ] Canvas rendering (pages, bands, elements)
- [ ] Element selection, drag, resize
- [ ] Property panel (auto-generated from propsSchema)
- [ ] Band/section management
- [ ] Template import/export (JSON)
- [ ] Live PDF preview

### Phase 7: Editor Full
- [ ] Undo/redo
- [ ] Copy/paste, multi-select
- [ ] Alignment guides and snapping
- [ ] Zoom and pan
- [ ] Style manager
- [ ] Data schema editor with sample data generation
- [ ] Template gallery / starter templates

### Phase 8: Long-Form Document Support
- [ ] Renderer — Auto-generated Table of Contents (`_bookmarks` built-in data source)
- [ ] Renderer — Footnotes (`footnote` on StyledRun, dynamic per-page space reservation)
- [ ] Renderer — Text reflow across columns (`columnMode: "flow"` on Section)
- [ ] Style — Gradient fills (linear, radial) on `backgroundColor`

## License

[MIT](LICENSE)
