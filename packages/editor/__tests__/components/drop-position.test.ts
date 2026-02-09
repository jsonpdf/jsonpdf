import { describe, it, expect } from 'vitest';
import { computeDropPosition } from '../../src/components/outline/OutlineNode';

describe('computeDropPosition', () => {
  const rect = { top: 100, height: 40 };

  it('returns "before" for top half of element', () => {
    expect(computeDropPosition(110, rect, 'element', 'element')).toBe('before');
  });

  it('returns "after" for bottom half of element', () => {
    expect(computeDropPosition(130, rect, 'element', 'element')).toBe('after');
  });

  it('returns "after" at exact midpoint of element', () => {
    expect(computeDropPosition(120, rect, 'element', 'element')).toBe('after');
  });

  it('returns "inside" for element dropping on band regardless of position', () => {
    expect(computeDropPosition(105, rect, 'band', 'element')).toBe('inside');
    expect(computeDropPosition(120, rect, 'band', 'element')).toBe('inside');
    expect(computeDropPosition(135, rect, 'band', 'element')).toBe('inside');
  });

  it('returns before/after for band dropping on band', () => {
    expect(computeDropPosition(110, rect, 'band', 'band')).toBe('before');
    expect(computeDropPosition(130, rect, 'band', 'band')).toBe('after');
  });

  it('handles zero-height element gracefully', () => {
    const zeroRect = { top: 100, height: 0 };
    // NaN from 0/0 is not < 0.5, so returns 'after'
    expect(computeDropPosition(100, zeroRect, 'element', 'element')).toBe('after');
  });

  it('returns "before" for top half of section', () => {
    expect(computeDropPosition(110, rect, 'section', 'section')).toBe('before');
  });

  it('returns "after" for bottom half of section', () => {
    expect(computeDropPosition(130, rect, 'section', 'section')).toBe('after');
  });
});
