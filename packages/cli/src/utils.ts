import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import chalk from 'chalk';
import type { ValidationResult } from '@jsonpdf/core';

/** A user-facing error (clean message, no stack trace needed). */
export class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliError';
  }
}

/** Read and parse a JSON file. Throws CliError on failure. */
export async function readJsonFile<T = unknown>(filePath: string): Promise<T> {
  const absPath = resolve(filePath);
  let content: string;
  try {
    content = await readFile(absPath, 'utf-8');
  } catch {
    throw new CliError(`Cannot read file: ${absPath}`);
  }
  try {
    return JSON.parse(content) as T;
  } catch {
    throw new CliError(`Invalid JSON in file: ${absPath}`);
  }
}

/** Write bytes or string to a file. Throws CliError on failure. */
export async function writeOutputFile(filePath: string, data: Uint8Array | string): Promise<void> {
  const absPath = resolve(filePath);
  try {
    await writeFile(absPath, data);
  } catch {
    throw new CliError(`Cannot write file: ${absPath}`);
  }
}

/** Format validation errors for terminal output. */
export function formatErrors(result: ValidationResult): string {
  return result.errors
    .map((e) => `  ${chalk.red('\u2717')} ${chalk.dim(e.path)} ${e.message}`)
    .join('\n');
}
