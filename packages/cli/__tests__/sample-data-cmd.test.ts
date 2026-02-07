import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createTemplate, addSection } from '@jsonpdf/template';
import type { Template } from '@jsonpdf/core';
import { sampleDataCommand } from '../src/commands/sample-data.js';

describe('sample-data command', () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  async function writeTemplate(template: Template): Promise<string> {
    tmpDir = await mkdtemp(join(tmpdir(), 'jsonpdf-test-'));
    const filePath = join(tmpDir, 'template.json');
    await writeFile(filePath, JSON.stringify(template));
    return filePath;
  }

  it('outputs sample data to stdout', async () => {
    let template = createTemplate({
      dataSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          count: { type: 'integer' },
        },
      },
    });
    template = addSection(template, { id: 'main', bands: [] });
    const filePath = await writeTemplate(template);

    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await sampleDataCommand(filePath, {});

    const output = spy.mock.calls[0][0] as string;
    const data = JSON.parse(output);
    expect(data.name).toBe('sample_name');
    expect(data.count).toBe(0);
  });

  it('writes sample data to file with --output', async () => {
    let template = createTemplate({
      dataSchema: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { type: 'string' } },
        },
      },
    });
    template = addSection(template, { id: 'main', bands: [] });
    const filePath = await writeTemplate(template);
    const outputPath = join(tmpDir, 'sample.json');

    await sampleDataCommand(filePath, { output: outputPath });

    const content = await readFile(outputPath, 'utf-8');
    const data = JSON.parse(content);
    expect(data.items).toHaveLength(3);
  });

  it('respects --array-length option', async () => {
    let template = createTemplate({
      dataSchema: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { type: 'number' } },
        },
      },
    });
    template = addSection(template, { id: 'main', bands: [] });
    const filePath = await writeTemplate(template);

    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await sampleDataCommand(filePath, { arrayLength: '5' });

    const output = spy.mock.calls[0][0] as string;
    const data = JSON.parse(output);
    expect(data.items).toHaveLength(5);
  });
});
