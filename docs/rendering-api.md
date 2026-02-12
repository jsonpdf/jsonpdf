# Rendering API

Use `@jsonpdf/renderer` to generate PDFs programmatically in Node.js or the browser — no CLI
required.

## Node.js

Install the renderer and its dependencies:

```sh
npm install @jsonpdf/renderer @jsonpdf/plugins @jsonpdf/core
```

Render a template to PDF bytes:

```ts
import { readFileSync, writeFileSync } from 'node:fs';
import { renderPdf } from '@jsonpdf/renderer';

const template = JSON.parse(readFileSync('template.json', 'utf-8'));
const data = JSON.parse(readFileSync('data.json', 'utf-8'));

const result = await renderPdf(template, { data });

writeFileSync('output.pdf', result.bytes);
console.log(`Rendered ${result.pageCount} page(s)`);
```

### RenderOptions

| Property         | Type                      | Description                                                                                |
| ---------------- | ------------------------- | ------------------------------------------------------------------------------------------ |
| `data`           | `Record<string, unknown>` | Input data for template expressions                                                        |
| `skipValidation` | `boolean`                 | Skip schema validation before rendering (default: `false`)                                 |
| `registry`       | `PluginRegistry`          | Custom plugin registry. When omitted, a default registry with all built-in plugins is used |

### RenderResult

| Property    | Type         | Description                   |
| ----------- | ------------ | ----------------------------- |
| `bytes`     | `Uint8Array` | The rendered PDF file         |
| `pageCount` | `number`     | Number of pages in the output |

## Browser

The renderer works in the browser with one extra initialization step — the SVG rasterizer uses
WebAssembly and must be loaded before rendering.

```ts
import { renderPdf, initBrowser } from '@jsonpdf/renderer';
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm?url';

// Call once before any rendering
await initBrowser(fetch(resvgWasm));

const result = await renderPdf(template, { data });

// Display in an iframe
const blob = new Blob([result.bytes], { type: 'application/pdf' });
iframe.src = URL.createObjectURL(blob);
```

### initBrowser

```ts
function initBrowser(resvgWasm?: Response | ArrayBuffer, fontBuffers?: Uint8Array[]): Promise<void>;
```

| Parameter     | Description                                                                         |
| ------------- | ----------------------------------------------------------------------------------- |
| `resvgWasm`   | The `@resvg/resvg-wasm` WASM binary — pass a `fetch()` Response or an `ArrayBuffer` |
| `fontBuffers` | Optional font file buffers for SVG text rendering (e.g. sans-serif fallback)        |

This function is a no-op in Node.js, so isomorphic code can call it unconditionally.

## Building Templates Programmatically

Use `@jsonpdf/template` to create and manipulate templates in code:

```ts
import { createTemplate, addSection, addBand, addElement } from '@jsonpdf/template';
import { renderPdf } from '@jsonpdf/renderer';

let template = createTemplate({ name: 'My Report' });

template = addSection(template, {});

template = addBand(template, template.sections[0].id, {
  type: 'detail',
  height: 30,
  dataSource: 'items',
});

template = addElement(template, template.sections[0].bands[0].id, {
  type: 'text',
  x: 0,
  y: 0,
  width: 200,
  height: 20,
  properties: { content: '{{ item.name }}' },
});

const result = await renderPdf(template, {
  data: { items: [{ name: 'Widget' }, { name: 'Gadget' }] },
});
```

All template operations are **immutable** — they return a new template object, leaving the original
unchanged. This makes it safe to maintain history (undo/redo) or branch templates.

### Available Operations

| Category | Functions                                                                       |
| -------- | ------------------------------------------------------------------------------- |
| Factory  | `createTemplate`                                                                |
| Add      | `addSection`, `addBand`, `addElement`, `addStyle`, `addFont`                    |
| Update   | `updateSection`, `updateBand`, `updateElement`, `updateStyle`, `updateTemplate` |
| Remove   | `removeSection`, `removeBand`, `removeElement`, `removeStyle`, `removeFont`     |
| Move     | `moveSection`, `moveBand`, `moveElement`, `reorderElement`                      |
| Clone    | `cloneSection`, `cloneBand`, `cloneElement`, `deepCloneWithNewIds`              |
| Queries  | `findSection`, `findBand`, `findElement`, `findFont`, `getElementsByType`       |

See the [`@jsonpdf/template` README](../packages/template/README.md) for the full list.

## Validation

Validate a template or data before rendering:

```ts
import { validateTemplateSchema } from '@jsonpdf/core';
import { validateData } from '@jsonpdf/renderer';

// Validate template structure
const templateResult = validateTemplateSchema(template);
if (!templateResult.valid) {
  console.error(templateResult.errors);
}

// Validate data against the template's dataSchema
const dataResult = validateData(data, template.dataSchema);
if (!dataResult.valid) {
  console.error(dataResult.errors);
}
```

## Sample Data Generation

Generate test data from a template's schema:

```ts
import { generateSampleData } from '@jsonpdf/template';

const sampleData = generateSampleData(template.dataSchema, {
  arrayLength: 5,
});
```

## Custom Filters

Register custom Liquid filters on the expression engine:

```ts
import { createExpressionEngine } from '@jsonpdf/renderer';

const engine = createExpressionEngine();
engine.registerFilter('uppercase', (value: unknown) => String(value).toUpperCase());
```

The built-in filters (`money`, `pad`, `ref`) are registered automatically during rendering.

## See Also

- [CLI Reference](cli-reference.md) — command-line rendering
- [Template Guide](template-guide.md) — template structure and data binding
- [Element Reference](elements.md) — all element types and their properties
