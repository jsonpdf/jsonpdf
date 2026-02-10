import chalk from 'chalk';
import type { Template } from '@jsonpdf/core';
import { validateTemplate } from '@jsonpdf/template';
import {
  textPlugin,
  linePlugin,
  listPlugin,
  shapePlugin,
  imagePlugin,
  containerPlugin,
  tablePlugin,
  barcodePlugin,
  chartPlugin,
  framePlugin,
} from '@jsonpdf/plugins';
import { readJsonFile, formatErrors } from '../utils.js';

const pluginSchemas = [
  textPlugin,
  linePlugin,
  listPlugin,
  shapePlugin,
  imagePlugin,
  containerPlugin,
  tablePlugin,
  barcodePlugin,
  chartPlugin,
  framePlugin,
].map((p) => ({ type: p.type, propsSchema: p.propsSchema }));

export async function validateCommand(file: string): Promise<void> {
  const template = await readJsonFile<Template>(file);
  const result = validateTemplate(template, pluginSchemas);

  if (result.valid) {
    console.log(chalk.green('\u2713') + ' Template is valid');
  } else {
    console.error(
      chalk.red('\u2717') + ` Template has ${String(result.errors.length)} error(s):\n`,
    );
    console.error(formatErrors(result));
    process.exitCode = 1;
  }
}
