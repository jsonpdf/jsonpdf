# @jsonpdf/cli

Command-line tool for creating, validating, and rendering jsonpdf templates.

## Installation

```bash
pnpm add @jsonpdf/cli@alpha
```

## Commands

### `jsonpdf init`

Scaffold a new template project with a starter template and sample data file.

### `jsonpdf validate <template>`

Validate a template file against the JSON Schema. Reports errors with paths and messages.

### `jsonpdf render <template> [data]`

Render a template to PDF. Accepts an optional data file for binding expressions.

### `jsonpdf sample-data <template>`

Generate sample data from the template's data schema — useful for previewing templates without real data.

### `jsonpdf editor [template]`

Launch the visual drag-and-drop template editor in the browser. Opens a local Vite dev server with the editor UI.

## Usage

```bash
# Create a new template
jsonpdf init my-report

# Validate it
jsonpdf validate my-report/template.json

# Render with data
jsonpdf render my-report/template.json my-report/data.json -o output.pdf

# Open the visual editor
jsonpdf editor my-report/template.json
```

## Exports

The package also exports its internals for programmatic use:

```ts
import { createProgram, run } from '@jsonpdf/cli';
```
