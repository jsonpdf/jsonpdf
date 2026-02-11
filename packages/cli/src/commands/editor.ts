import { resolve } from 'node:path';
import chalk from 'chalk';
import type { Template } from '@jsonpdf/core';
import type { Plugin } from 'vite';
import { validateTemplate } from '@jsonpdf/template';
import { CliError, readJsonFile, formatErrors } from '../utils.js';

interface EditorOptions {
  port?: string;
}

const ENTRY_ID = '/@jsonpdf-editor-entry.js';
const RESOLVED_ENTRY_ID = '\0@jsonpdf-editor-entry.js';
const TEMPLATE_ID = 'virtual:jsonpdf-template';
const RESOLVED_TEMPLATE_ID = '\0virtual:jsonpdf-template';

const INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>JsonPDF Editor</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body, #root { height: 100%; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${ENTRY_ID}"></script>
  </body>
</html>`;

function buildEntrySource(hasTemplate: boolean): string {
  const imports = [
    `import { createElement, StrictMode } from 'react';`,
    `import { createRoot } from 'react-dom/client';`,
    `import { initBrowser } from '@jsonpdf/renderer';`,
    `import { EditorShell, useEditorStore } from '@jsonpdf/editor';`,
    `import '@jsonpdf/editor/styles.css';`,
    `import interFontUrl from '@fontsource/inter/files/inter-latin-400-normal.woff2?url';`,
  ];
  if (hasTemplate) imports.push(`import initialTemplate from '${TEMPLATE_ID}';`);

  const loadTemplate = hasTemplate
    ? [
        `const result = useEditorStore.getState().importTemplate(JSON.stringify(initialTemplate));`,
        `if (!result.success) console.error('Failed to load template:', result.error);`,
      ]
    : [];

  const body = [
    `async function boot() {`,
    `  try {`,
    `    const wasmUrl = new URL('@resvg/resvg-wasm/index_bg.wasm', import.meta.url);`,
    `    const [fontRes, wasmRes] = await Promise.all([fetch(interFontUrl), fetch(wasmUrl)]);`,
    `    const fontBuf = new Uint8Array(await fontRes.arrayBuffer());`,
    `    await initBrowser(wasmRes, [fontBuf]);`,
    `  } catch (err) {`,
    `    console.warn('Failed to initialize resvg WASM — PDF preview may not work:', err);`,
    `  }`,
    ...loadTemplate.map((l) => `  ${l}`),
    `  createRoot(document.getElementById('root')).render(`,
    `    createElement(StrictMode, null, createElement(EditorShell))`,
    `  );`,
    `}`,
    ``,
    `boot();`,
  ];

  return [...imports, '', ...body, ''].join('\n');
}

function editorPlugin(templateJson: string | null): Plugin {
  const hasTemplate = templateJson !== null;
  return {
    name: 'jsonpdf-editor',
    configureServer(server) {
      return () => {
        server.middlewares.use((req, res, next) => {
          const url = req.url ?? '/';
          if (url === '/' || url === '/index.html') {
            server.transformIndexHtml(url, INDEX_HTML).then(
              (html) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'text/html');
                res.end(html);
              },
              (e: unknown) => {
                next(e);
              },
            );
            return;
          }
          next();
        });
      };
    },
    resolveId(id) {
      if (id === ENTRY_ID) return RESOLVED_ENTRY_ID;
      if (id === TEMPLATE_ID) return RESOLVED_TEMPLATE_ID;
    },
    load(id) {
      if (id === RESOLVED_ENTRY_ID) return buildEntrySource(hasTemplate);
      if (id === RESOLVED_TEMPLATE_ID && hasTemplate) {
        return `export default ${templateJson};`;
      }
    },
  };
}

export async function editorCommand(
  templatePath: string | undefined,
  options: EditorOptions,
): Promise<void> {
  let templateJson: string | null = null;

  if (templatePath) {
    const template = await readJsonFile<Template>(templatePath);
    const result = validateTemplate(template);
    if (!result.valid) {
      throw new CliError(
        `Invalid template: ${String(result.errors.length)} error(s)\n${formatErrors(result)}`,
      );
    }
    templateJson = JSON.stringify(template);
  }

  const port = parseInt(options.port ?? '5173', 10);

  // Resolve from dist/commands/ → package root so Vite finds node_modules
  const cliRoot = resolve(import.meta.dirname, '../..');

  let createServer: (typeof import('vite'))['createServer'];
  try {
    ({ createServer } = await import('vite'));
  } catch {
    throw new CliError('The "editor" command requires Vite. Run: npm install vite react react-dom');
  }

  const server = await createServer({
    configFile: false,
    root: cliRoot,
    appType: 'custom',
    plugins: [editorPlugin(templateJson)],
    server: { port, open: true },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'],
    },
  });

  await server.listen();
  server.printUrls();
  console.log(chalk.dim('\nPress Ctrl+C to stop'));
}
