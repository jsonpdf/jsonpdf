import chalk from 'chalk';
import type { Template } from '@jsonpdf/core';
import { validateTemplate } from '@jsonpdf/template';
import { readJsonFile, formatErrors } from '../utils.js';

export async function validateCommand(file: string): Promise<void> {
  const template = await readJsonFile<Template>(file);
  const result = validateTemplate(template);

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
