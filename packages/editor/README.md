# @jsonpdf/editor

Visual drag-and-drop template designer for jsonpdf, built with React, Konva, and Zustand.

## Features

- **Canvas editor** — Drag, resize, and position elements on a WYSIWYG canvas with snap-to-grid and alignment guides
- **Element palette** — Add text, images, shapes, lines, lists, tables, containers, barcodes, charts, and frames
- **Property panels** — Edit template, section, band, and element properties through a form-based sidebar
- **Style manager** — Create and manage reusable named styles
- **Font manager** — Add and configure font families with weight/style variants
- **Data schema editor** — Define the JSON Schema for template data binding
- **PDF preview** — Live PDF rendering with editable sample data
- **Code view** — Edit the raw JSON template with Monaco Editor
- **Undo/redo** — Full history via Zustand temporal middleware
- **Keyboard shortcuts** — Copy, paste, delete, undo/redo, and more

## Usage

The editor is packaged as a Vite library and consumed by `@jsonpdf/cli` via the `jsonpdf editor` command. It can also be embedded in any React application:

```tsx
import { EditorShell, useEditorStore } from '@jsonpdf/editor';
import '@jsonpdf/editor/dist/index.css';

function App() {
  return <EditorShell />;
}
```

## Exports

| Category | Exports                                                     |
| -------- | ----------------------------------------------------------- |
| Main     | `EditorShell`, `EditorState`, `Tool`, `useEditorStore`      |
| Canvas   | `TemplateCanvas`, `CANVAS_PADDING`                          |
| Layout   | `computeDesignLayout`, `DesignPage`, `DesignBand`           |
| Code     | `CodeLayout`, `TemplateEditor`, `TemplateEditorHandle`      |
| Preview  | `PreviewLayout`, `PdfViewer`, `DataEditor`, `usePdfPreview` |

## Tech stack

- [React 19](https://react.dev/) — UI framework
- [Konva](https://konvajs.org/) + [react-konva](https://github.com/konvajs/react-konva) — 2D canvas rendering
- [Zustand](https://zustand-demo.pmnd.rs/) — State management with temporal middleware for undo/redo
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) — JSON template code editing
- [Vite](https://vite.dev/) — Build tooling (library mode)
