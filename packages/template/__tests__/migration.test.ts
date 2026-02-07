import { describe, it, expect } from 'vitest';
import { migrateTemplate } from '../src/migration.js';
import { createTemplate } from '../src/factory.js';
import { addSection } from '../src/operations.js';

function makeValidTemplate() {
  return addSection(createTemplate({ name: 'Test' }), { id: 'sec1', bands: [] });
}

describe('migrateTemplate', () => {
  it('returns v1.0 template as-is', () => {
    const t = makeValidTemplate();
    const result = migrateTemplate(t);
    expect(result).toBe(t);
    expect(result.version).toBe('1.0');
  });

  it('throws for null input', () => {
    expect(() => migrateTemplate(null)).toThrow('non-null object');
  });

  it('throws for non-object input', () => {
    expect(() => migrateTemplate('not an object')).toThrow('non-null object');
  });

  it('throws for undefined input', () => {
    expect(() => migrateTemplate(undefined)).toThrow('non-null object');
  });

  it('throws for number input', () => {
    expect(() => migrateTemplate(42)).toThrow('non-null object');
  });

  it('throws for missing version', () => {
    expect(() => migrateTemplate({ name: 'test' })).toThrow('version string');
  });

  it('throws for non-string version', () => {
    expect(() => migrateTemplate({ version: 2 })).toThrow('version string');
  });

  it('throws for unknown version', () => {
    expect(() => migrateTemplate({ version: '2.0' })).toThrow('Unknown template version: 2.0');
  });

  it('throws for empty version string', () => {
    expect(() => migrateTemplate({ version: '' })).toThrow('Unknown template version: ');
  });

  it('throws for v1.0 template that fails schema validation', () => {
    // Template with version '1.0' but missing required fields
    expect(() => migrateTemplate({ version: '1.0' })).toThrow('Invalid template structure');
  });

  it('throws for v1.0 template with empty sections', () => {
    // createTemplate() produces an empty sections array which fails minItems: 1
    const t = createTemplate({ name: 'Test' });
    expect(() => migrateTemplate(t)).toThrow('Invalid template structure');
  });
});
