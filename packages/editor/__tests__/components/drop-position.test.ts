import { describe, it, expect } from 'vitest';
import { computeDropPosition } from '../../src/components/outline/OutlineNode';

describe('computeDropPosition', () => {
  const rect = { top: 100, height: 40 };

  it('returns "before" for top half of element', () => {
    expect(computeDropPosition(110, rect, 'element')).toBe('before');
  });

  it('returns "after" for bottom half of element', () => {
    expect(computeDropPosition(130, rect, 'element')).toBe('after');
  });

  it('returns "after" at exact midpoint of element', () => {
    expect(computeDropPosition(120, rect, 'element')).toBe('after');
  });

  it('returns "inside" for band regardless of position', () => {
    expect(computeDropPosition(105, rect, 'band')).toBe('inside');
    expect(computeDropPosition(120, rect, 'band')).toBe('inside');
    expect(computeDropPosition(135, rect, 'band')).toBe('inside');
  });

  it('handles zero-height element gracefully', () => {
    const zeroRect = { top: 100, height: 0 };
    // NaN from 0/0 is not < 0.5, so returns 'after'
    expect(computeDropPosition(100, zeroRect, 'element')).toBe('after');
  });

  it('returns "before" for top half of section', () => {
    expect(computeDropPosition(110, rect, 'section')).toBe('before');
  });

  it('returns "after" for bottom half of section', () => {
    expect(computeDropPosition(130, rect, 'section')).toBe('after');
  });
});
