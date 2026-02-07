import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createTemplate, addSection, addBand, addElement } from '@jsonpdf/template';
import type { Template } from '@jsonpdf/core';
import { renderCommand } from '../src/commands/render.js';

describe('render command', () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
  });

  function buildTemplate(overrides?: Partial<Template>): Template {
    let template = createTemplate(overrides);
    template = addSection(template, { id: 'main', bands: [] });
    template = addBand(template, 'main', {
      id: 'body',
      type: 'body',
      height: 30,
      elements: [],
    });
    template = addElement(template, 'body', {
      id: 'txt',
      type: 'text',
      x: 0,
      y: 0,
      width: 100,
      height: 20,
      properties: { content: 'Hello' },
    });
    return template;
  }

  async function setup(
    template: Template,
    data?: Record<string, unknown>,
  ): Promise<{ templatePath: string; dataPath?: string; outputPath: string }> {
    tmpDir = await mkdtemp(join(tmpdir(), 'jsonpdf-test-'));
    const templatePath = join(tmpDir, 'template.json');
    await writeFile(templatePath, JSON.stringify(template));

    let dataPath: string | undefined;
    if (data) {
      dataPath = join(tmpDir, 'data.json');
      await writeFile(dataPath, JSON.stringify(data));
    }

    return { templatePath, dataPath, outputPath: join(tmpDir, 'output.pdf') };
  }

  it('renders a template to PDF', async () => {
    const { templatePath, outputPath } = await setup(buildTemplate());

    await renderCommand({ template: templatePath, output: outputPath });

    const bytes = await readFile(outputPath);
    expect(bytes.slice(0, 5).toString()).toBe('%PDF-');
  });

  it('renders with data', async () => {
    const template = buildTemplate({
      dataSchema: {
        type: 'object',
        properties: { title: { type: 'string' } },
      },
    });
    const { templatePath, dataPath, outputPath } = await setup(template, { title: 'Test' });

    await renderCommand({ template: templatePath, data: dataPath, output: outputPath });

    const bytes = await readFile(outputPath);
    expect(bytes.slice(0, 5).toString()).toBe('%PDF-');
  });

  it('errors on missing template file', async () => {
    await expect(
      renderCommand({ template: '/nonexistent/file.json', output: 'out.pdf' }),
    ).rejects.toThrow('Cannot read file');
  });

  it('errors on missing data file', async () => {
    const { templatePath } = await setup(buildTemplate());

    await expect(
      renderCommand({
        template: templatePath,
        data: '/nonexistent/data.json',
        output: join(tmpDir, 'out.pdf'),
      }),
    ).rejects.toThrow('Cannot read file');
  });

  it('uses default output filename', async () => {
    const { templatePath } = await setup(buildTemplate());
    const defaultOutput = join(tmpDir, 'default-output.pdf');

    await renderCommand({ template: templatePath, output: defaultOutput });

    const bytes = await readFile(defaultOutput);
    expect(bytes.slice(0, 5).toString()).toBe('%PDF-');
  });
});
