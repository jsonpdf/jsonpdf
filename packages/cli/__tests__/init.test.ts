import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validateTemplate } from '@jsonpdf/template';
import { initCommand } from '../src/commands/init.js';

describe('init command', () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
  });

  async function setup(): Promise<string> {
    tmpDir = await mkdtemp(join(tmpdir(), 'jsonpdf-test-'));
    return join(tmpDir, 'template.json');
  }

  it('creates a valid template file', async () => {
    const filePath = await setup();
    await initCommand(filePath, {});

    const content = await readFile(filePath, 'utf-8');
    const template = JSON.parse(content);
    expect(template.version).toBe('1.0');
    expect(template.sections).toHaveLength(1);
    expect(template.sections[0].bands).toHaveLength(1);
    expect(template.sections[0].bands[0].elements).toHaveLength(1);
  });

  it('output passes validateTemplate', async () => {
    const filePath = await setup();
    await initCommand(filePath, {});

    const content = await readFile(filePath, 'utf-8');
    const template = JSON.parse(content);
    const result = validateTemplate(template);
    expect(result.valid).toBe(true);
  });

  it('applies --name option', async () => {
    const filePath = await setup();
    await initCommand(filePath, { name: 'My Invoice' });

    const content = await readFile(filePath, 'utf-8');
    const template = JSON.parse(content);
    expect(template.name).toBe('My Invoice');
  });

  it('errors when file already exists', async () => {
    const filePath = await setup();
    await writeFile(filePath, '{}');

    await expect(initCommand(filePath, {})).rejects.toThrow('File already exists');
  });
});
