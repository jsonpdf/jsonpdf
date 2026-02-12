# CLI Reference

The `jsonpdf` CLI provides commands for scaffolding, validating, rendering, and visually editing
PDF templates.

## Installation

```sh
npm install -g @jsonpdf/cli
```

Or use without installing:

```sh
npx @jsonpdf/cli <command>
```

## jsonpdf init

Scaffold a new template file.

```sh
jsonpdf init <file> [options]
```

| Argument / Option | Description                                    |
| ----------------- | ---------------------------------------------- |
| `<file>`          | Output file path (must not already exist)      |
| `--name <name>`   | Template name (default: `"Untitled Template"`) |

The generated template contains a single section with a `body` band and a "Hello, jsonpdf!" text
element — a minimal starting point you can render immediately.

```sh
jsonpdf init invoice.json --name "Invoice Template"
```

## jsonpdf validate

Validate a template against the JSON Schema.

```sh
jsonpdf validate <file>
```

| Argument | Description        |
| -------- | ------------------ |
| `<file>` | Template JSON file |

Prints validation errors with JSON Pointer paths, or a success message when valid.

```sh
jsonpdf validate invoice.json
```

## jsonpdf render

Render a template to PDF.

```sh
jsonpdf render [options]
```

| Option                  | Description                                        |
| ----------------------- | -------------------------------------------------- |
| `-t, --template <file>` | Template JSON file (required)                      |
| `-d, --data <file>`     | Data JSON file                                     |
| `-o, --output <file>`   | Output PDF file (default: `output.pdf`)            |
| `-w, --watch`           | Watch for file changes and re-render automatically |

When `--data` is omitted, the template renders with an empty data scope (useful for static
templates or templates with schema defaults).

```sh
# Basic render
jsonpdf render -t invoice.json -d data.json -o invoice.pdf

# Watch mode — re-renders when template or data file changes
jsonpdf render -t invoice.json -d data.json -o invoice.pdf --watch
```

## jsonpdf sample-data

Generate sample data from the template's `dataSchema`.

```sh
jsonpdf sample-data <file> [options]
```

| Argument / Option     | Description                                           |
| --------------------- | ----------------------------------------------------- |
| `<file>`              | Template JSON file                                    |
| `-o, --output <file>` | Output JSON file (default: stdout)                    |
| `--array-length <n>`  | Number of items to generate for arrays (default: `3`) |

The generator walks the JSON Schema recursively, producing realistic sample values based on type,
format, enum, const, and default constraints.

```sh
# Print to stdout
jsonpdf sample-data invoice.json

# Write to file with 5 array items
jsonpdf sample-data invoice.json -o sample.json --array-length 5
```

## jsonpdf editor

Launch the visual drag-and-drop template editor in the browser.

```sh
jsonpdf editor [template] [options]
```

| Argument / Option   | Description                           |
| ------------------- | ------------------------------------- |
| `[template]`        | Template JSON file to open (optional) |
| `-p, --port <port>` | Dev server port (default: `5173`)     |

Opens a local Vite dev server and your default browser. Changes made in the editor can be exported
back to JSON.

```sh
jsonpdf editor invoice.json -p 3000
```

## See Also

- [Getting Started](getting-started.md) — tutorial walkthrough
- [Rendering API](rendering-api.md) — programmatic rendering in Node.js and the browser
