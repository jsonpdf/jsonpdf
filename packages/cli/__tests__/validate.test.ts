import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createTemplate, addSection } from '@jsonpdf/template';
import { validateCommand } from '../src/commands/validate.js';

describe('validate command', () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  async function writeTemplate(data: unknown): Promise<string> {
    tmpDir = await mkdtemp(join(tmpdir(), 'jsonpdf-test-'));
    const filePath = join(tmpDir, 'template.json');
    await writeFile(filePath, JSON.stringify(data));
    return filePath;
  }

  it('prints success for a valid template', async () => {
    let template = createTemplate();
    template = addSection(template, { id: 'main', bands: [] });
    const filePath = await writeTemplate(template);

    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await validateCommand(filePath);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('valid'));
  });

  it('prints errors for an invalid template', async () => {
    const filePath = await writeTemplate({ version: '1.0' }); // missing required fields

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await validateCommand(filePath);
    expect(process.exitCode).toBe(1);
    expect(spy).toHaveBeenCalled();
    process.exitCode = undefined as unknown as number;
  });

  it('errors on non-existent file', async () => {
    await expect(validateCommand('/nonexistent/template.json')).rejects.toThrow('Cannot read file');
  });

  it('errors on invalid JSON', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'jsonpdf-test-'));
    const filePath = join(tmpDir, 'bad.json');
    await writeFile(filePath, 'not json');

    await expect(validateCommand(filePath)).rejects.toThrow('Invalid JSON');
  });
});
