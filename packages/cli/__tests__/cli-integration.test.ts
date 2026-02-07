import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createProgram } from '../src/program.js';

describe('CLI integration', () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
  });

  it('init + validate + render round-trip', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'jsonpdf-integration-'));
    const templatePath = join(tmpDir, 'test.json');
    const outputPath = join(tmpDir, 'output.pdf');

    // Init
    const p1 = createProgram();
    p1.exitOverride();
    await p1.parseAsync(['node', 'jsonpdf', 'init', templatePath]);

    // Validate
    const p2 = createProgram();
    p2.exitOverride();
    await p2.parseAsync(['node', 'jsonpdf', 'validate', templatePath]);

    // Render
    const p3 = createProgram();
    p3.exitOverride();
    await p3.parseAsync(['node', 'jsonpdf', 'render', '-t', templatePath, '-o', outputPath]);

    const bytes = await readFile(outputPath);
    expect(bytes.slice(0, 5).toString()).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(100);
  });

  it('init + sample-data round-trip', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'jsonpdf-integration-'));
    const templatePath = join(tmpDir, 'test.json');
    const samplePath = join(tmpDir, 'sample.json');

    // Init
    const p1 = createProgram();
    p1.exitOverride();
    await p1.parseAsync(['node', 'jsonpdf', 'init', templatePath]);

    // Sample data
    const p2 = createProgram();
    p2.exitOverride();
    await p2.parseAsync(['node', 'jsonpdf', 'sample-data', templatePath, '-o', samplePath]);

    const content = await readFile(samplePath, 'utf-8');
    const data = JSON.parse(content);
    expect(data).toEqual({});
  });
});
