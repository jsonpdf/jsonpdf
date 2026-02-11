import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPdf } from '../src/renderer.js';
import type { Template } from '@jsonpdf/core';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const EXAMPLES_DIR = resolve(__dirname, '../../../examples');

interface ExampleSpec {
  name: string;
  expectedPages: number;
}

const EXAMPLES: ExampleSpec[] = [
  { name: 'certificate', expectedPages: 1 },
  { name: 'dashboard', expectedPages: 1 },
  { name: 'event-ticket', expectedPages: 1 },
  { name: 'financial-statement', expectedPages: 2 },
  { name: 'invoice', expectedPages: 2 },
  { name: 'longform-showcase', expectedPages: 7 },
  { name: 'newsletter', expectedPages: 1 },
  { name: 'pay-stub', expectedPages: 1 },
  { name: 'product-catalog', expectedPages: 2 },
  { name: 'resume', expectedPages: 1 },
  { name: 'sales-report', expectedPages: 2 },
  { name: 'shipping-label', expectedPages: 1 },
  { name: 'technical-report', expectedPages: 6 },
  { name: 'text-showcase', expectedPages: 1 },
  { name: 'travel-itinerary', expectedPages: 2 },
];

describe('example rendering', () => {
  for (const { name, expectedPages } of EXAMPLES) {
    it(`renders ${name} (${expectedPages} page${expectedPages > 1 ? 's' : ''})`, async () => {
      const dir = join(EXAMPLES_DIR, name);
      const templateJson = await readFile(join(dir, 'template.json'), 'utf8');
      const dataJson = await readFile(join(dir, 'data.json'), 'utf8');

      const template: Template = JSON.parse(templateJson) as Template;
      const data = JSON.parse(dataJson) as Record<string, unknown>;

      const result = await renderPdf(template, { data });

      // Valid PDF bytes
      expect(result.bytes).toBeInstanceOf(Uint8Array);
      expect(result.bytes.length).toBeGreaterThan(0);

      // PDF header
      const header = new TextDecoder().decode(result.bytes.slice(0, 5));
      expect(header).toBe('%PDF-');

      // Expected page count
      expect(result.pageCount).toBe(expectedPages);
    }, 30_000);
  }
});
