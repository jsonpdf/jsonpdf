import { resolve } from 'node:path';
import { access } from 'node:fs/promises';
import chalk from 'chalk';
import { createTemplate, addSection, addBand, addElement } from '@jsonpdf/template';
import { writeOutputFile, CliError } from '../utils.js';

export async function initCommand(file: string, options: { name?: string }): Promise<void> {
  const absPath = resolve(file);

  // Guard against overwriting
  try {
    await access(absPath);
    throw new CliError(`File already exists: ${absPath}`);
  } catch (err) {
    if (err instanceof CliError) throw err;
    // File doesn't exist — proceed
  }

  // Build a minimal renderable template
  let template = createTemplate(options.name ? { name: options.name } : undefined);
  template = addSection(template, { id: 'main', bands: [] });
  template = addBand(template, 'main', {
    id: 'body-band',
    type: 'body',
    height: 40,
    elements: [],
  });
  template = addElement(template, 'body-band', {
    id: 'hello',
    type: 'text',
    x: 0,
    y: 10,
    width: 200,
    height: 20,
    properties: { content: 'Hello, jsonpdf!' },
  });

  const json = JSON.stringify(template, null, 2) + '\n';
  await writeOutputFile(absPath, json);
  console.log(chalk.green('\u2713') + ` Template created: ${absPath}`);
}
