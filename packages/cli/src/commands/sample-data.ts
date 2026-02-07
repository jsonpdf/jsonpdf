import chalk from 'chalk';
import type { Template } from '@jsonpdf/core';
import { generateSampleData } from '@jsonpdf/template';
import { readJsonFile, writeOutputFile } from '../utils.js';

interface SampleDataOptions {
  output?: string;
  arrayLength?: string;
}

export async function sampleDataCommand(file: string, options: SampleDataOptions): Promise<void> {
  const template = await readJsonFile<Template>(file);
  const sample = generateSampleData(template.dataSchema, {
    arrayLength: options.arrayLength ? parseInt(options.arrayLength, 10) : 3,
  });

  const json = JSON.stringify(sample, null, 2) + '\n';

  if (options.output) {
    await writeOutputFile(options.output, json);
    console.log(chalk.green('\u2713') + ` Sample data written to ${options.output}`);
  } else {
    process.stdout.write(json);
  }
}
