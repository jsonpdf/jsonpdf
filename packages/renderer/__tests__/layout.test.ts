import { describe, it, expect, beforeAll } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { layoutTemplate } from '../src/layout.js';
import { PluginRegistry, textPlugin, linePlugin, listPlugin, fontKey } from '@jsonpdf/plugins';
import type { FontMap, Plugin } from '@jsonpdf/plugins';
import { createTemplate, addSection, addBand, addElement } from '@jsonpdf/template';

let fonts: FontMap;
let registry: PluginRegistry;

beforeAll(async () => {
  registry = new PluginRegistry();
  registry.register(textPlugin);
  registry.register(linePlugin);
  registry.register(listPlugin);

  const doc = await PDFDocument.create();
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  fonts = new Map();
  fonts.set(fontKey('Helvetica', 'normal', 'normal'), helvetica);
});

function getPlugin(type: string): Plugin {
  return registry.get(type);
}

describe('layoutTemplate', () => {
  it('returns empty pages for template with no sections', async () => {
    const t = createTemplate();
    const result = await layoutTemplate(t, fonts, getPlugin);
    expect(result.pages).toHaveLength(0);
  });

  it('returns empty pages for section with no body bands', async () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'ph', type: 'pageHeader', height: 50, elements: [] });

    const result = await layoutTemplate(t, fonts, getPlugin);
    expect(result.pages).toHaveLength(0);
  });

  it('lays out a single body band at Y=0', async () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });

    const result = await layoutTemplate(t, fonts, getPlugin);
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0]!.bands).toHaveLength(1);
    expect(result.pages[0]!.bands[0]!.offsetY).toBe(0);
    expect(result.pages[0]!.bands[0]!.measuredHeight).toBe(100);
  });

  it('stacks two body bands vertically', async () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 100, elements: [] });
    t = addBand(t, 'sec1', { id: 'b2', type: 'body', height: 50, elements: [] });

    const result = await layoutTemplate(t, fonts, getPlugin);
    expect(result.pages[0]!.bands).toHaveLength(2);
    expect(result.pages[0]!.bands[0]!.offsetY).toBe(0);
    expect(result.pages[0]!.bands[1]!.offsetY).toBe(100);
  });

  it('uses measured height for autoHeight band', async () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', {
      id: 'auto',
      type: 'body',
      height: 20,
      autoHeight: true,
      elements: [],
    });
    t = addElement(t, 'auto', {
      id: 'el1',
      type: 'text',
      x: 0,
      y: 0,
      width: 100,
      height: 20,
      properties: {
        content: 'Short text that will wrap to multiple lines in a very narrow element width',
      },
    });

    const result = await layoutTemplate(t, fonts, getPlugin);
    const band = result.pages[0]!.bands[0]!;
    // Measured height should be >= declared height
    expect(band.measuredHeight).toBeGreaterThanOrEqual(20);
  });

  it('skips non-body bands', async () => {
    let t = createTemplate();
    t = addSection(t, { id: 'sec1', bands: [] });
    t = addBand(t, 'sec1', { id: 'ph', type: 'pageHeader', height: 50, elements: [] });
    t = addBand(t, 'sec1', { id: 'body', type: 'body', height: 100, elements: [] });
    t = addBand(t, 'sec1', { id: 'pf', type: 'pageFooter', height: 30, elements: [] });

    const result = await layoutTemplate(t, fonts, getPlugin);
    expect(result.pages[0]!.bands).toHaveLength(1);
    expect(result.pages[0]!.bands[0]!.band.id).toBe('body');
  });
});
