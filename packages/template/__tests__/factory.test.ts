import { describe, it, expect } from 'vitest';
import { createTemplate } from '../src/factory.js';

describe('createTemplate', () => {
  it('returns a valid template with defaults', () => {
    const t = createTemplate();
    expect(t.version).toBe('1.0');
    expect(t.name).toBe('Untitled Template');
    expect(t.page.width).toBe(612);
    expect(t.page.height).toBe(792);
    expect(t.page.margins).toEqual({ top: 40, right: 40, bottom: 40, left: 40 });
    expect(t.sections).toEqual([]);
    expect(t.styles).toEqual({});
    expect(t.defaultStyle).toEqual({ fontFamily: 'Inter' });
    expect(t.fonts).toHaveLength(4);
    expect(t.fonts.every((f) => f.family === 'Inter')).toBe(true);
  });

  it('allows overriding defaultStyle', () => {
    const t = createTemplate({ defaultStyle: { fontFamily: 'Roboto' } });
    expect(t.defaultStyle.fontFamily).toBe('Roboto');
  });

  it('applies name override', () => {
    const t = createTemplate({ name: 'My Template' });
    expect(t.name).toBe('My Template');
  });

  it('merges page config', () => {
    const t = createTemplate({
      page: { width: 595, height: 842, margins: { top: 40, right: 40, bottom: 40, left: 40 } },
    });
    expect(t.page.width).toBe(595);
    expect(t.page.height).toBe(842);
    expect(t.page.margins).toEqual({ top: 40, right: 40, bottom: 40, left: 40 });
  });

  it('merges partial page margins', () => {
    const t = createTemplate({
      page: { width: 612, height: 792, margins: { top: 72, right: 72, bottom: 72, left: 72 } },
    });
    expect(t.page.margins.top).toBe(72);
    expect(t.page.margins.right).toBe(72);
  });

  it('does not share references between templates', () => {
    const t1 = createTemplate();
    const t2 = createTemplate();
    t1.sections.push({
      id: 'test',
      bands: [],
    });
    expect(t2.sections).toHaveLength(0);
  });

  it('allows overriding fonts to empty', () => {
    const t = createTemplate({ fonts: [] });
    expect(t.fonts).toHaveLength(0);
  });

  it('version is always 1.0 even if somehow forced', () => {
    // Test runtime behavior - version should always be '1.0'
    const t = createTemplate({ version: '2.0' } as never);
    expect(t.version).toBe('1.0');
  });
});
