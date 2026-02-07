import { describe, it, expect } from 'vitest';
import { generateId } from '../../src/utils/ids.js';

describe('generateId', () => {
  it('returns a string', () => {
    expect(typeof generateId()).toBe('string');
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it('includes prefix when provided', () => {
    const id = generateId('section');
    expect(id).toMatch(/^section_/);
  });

  it('generates valid UUID without prefix', () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});
