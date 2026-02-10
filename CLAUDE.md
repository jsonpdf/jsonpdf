# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install              # Install dependencies
pnpm build                # Build all packages (tsc --build)
pnpm typecheck            # Type-check without emitting (tsc --build --noEmit)
pnpm lint                 # ESLint across all packages
pnpm format:check         # Prettier check
pnpm format               # Prettier auto-fix
pnpm test                 # Run all tests (vitest run)
pnpm examples             # Render all example templates to PDF
```

Run a single test file:

```bash
npx vitest run packages/renderer/__tests__/renderer.test.ts
```

CI runs: build → typecheck → lint → format:check → test → examples.

## Architecture

This is a **pnpm monorepo** (Node >=22, ESM-only) for designing PDF templates as JSON and rendering them to PDF.

### Package dependency graph

```
core → template → renderer → cli
core → plugins  → renderer → editor
```

- **@jsonpdf/core** — Shared TypeScript types, JSON Schema validation (ajv), unit/color utilities
- **@jsonpdf/template** — Immutable template factory and CRUD operations (add/update/remove/move sections, bands, elements, styles, fonts). All operations return new objects.
- **@jsonpdf/plugins** — Element type implementations (text, line, list, shape, image, container, table, barcode, chart, frame). Each plugin implements `measure()` and `render()`. Plugins receive resolved values and never touch LiquidJS.
- **@jsonpdf/renderer** — PDF generation pipeline: validate → resolve (LiquidJS expressions) → measure → layout (page breaks) → render (pdf-lib). Uses two-pass rendering for `_totalPages`.
- **@jsonpdf/cli** — CLI tool (`jsonpdf init|validate|render|sample-data`) built with commander
- **@jsonpdf/editor** — Visual drag-and-drop template designer (React 19 + Konva + Zustand), built as a Vite library

### Content model

**Template → Section[] → Band[] → Element[]**

- **Section**: groups bands, defines page config (size, orientation, margins, columns)
- **Band**: content flow unit with a type (title, pageHeader, detail, etc.), contains elements
- **Element**: visual primitive positioned absolutely within its band (x, y, width, height in points, top-left origin)

### Key conventions

- TypeScript strict mode with `strictTypeChecked` ESLint rules
- Prettier: semicolons, single quotes, trailing commas, 100 char width, 2-space indent
- Kebab-case file names, PascalCase types, camelCase functions/variables
- Tests live in `packages/*/__tests__/`
- Each package has `src/` → `dist/` with TypeScript composite project references
- Template operations are immutable — never mutate template objects directly
