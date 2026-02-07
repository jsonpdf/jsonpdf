import { resolve } from 'node:path';
import { watch } from 'node:fs';
import chalk from 'chalk';
import type { Template } from '@jsonpdf/core';
import { renderPdf } from '@jsonpdf/renderer';
import { readJsonFile, writeOutputFile } from '../utils.js';

interface RenderOptions {
  template: string;
  data?: string;
  output: string;
  watch?: boolean;
}

async function doRender(
  templatePath: string,
  dataPath: string | undefined,
  outputPath: string,
): Promise<void> {
  const template = await readJsonFile<Template>(templatePath);
  const data = dataPath ? await readJsonFile<Record<string, unknown>>(dataPath) : undefined;

  const start = performance.now();
  const result = await renderPdf(template, { data });
  const elapsed = (performance.now() - start).toFixed(0);

  await writeOutputFile(outputPath, result.bytes);
  console.log(
    chalk.green('\u2713') +
      ` Rendered ${String(result.pageCount)} page(s) to ${resolve(outputPath)} ${chalk.dim(`(${elapsed}ms)`)}`,
  );
}

export async function renderCommand(options: RenderOptions): Promise<void> {
  await doRender(options.template, options.data, options.output);

  if (!options.watch) return;

  console.log(chalk.dim('Watching for changes... (press Ctrl+C to stop)'));

  const filesToWatch = [resolve(options.template)];
  if (options.data) filesToWatch.push(resolve(options.data));

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const DEBOUNCE_MS = 300;

  const triggerRender = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      doRender(options.template, options.data, options.output).catch((err: unknown) => {
        console.error(
          chalk.red('\u2717') +
            ` Render failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    }, DEBOUNCE_MS);
  };

  for (const filePath of filesToWatch) {
    watch(filePath, { persistent: true }, (eventType) => {
      if (eventType === 'change') {
        console.log(chalk.dim(`\nFile changed: ${filePath}`));
        triggerRender();
      }
    });
  }
}
