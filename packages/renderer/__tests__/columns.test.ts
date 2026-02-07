import { describe, it, expect } from 'vitest';
import { computeColumnLayout } from '../src/columns.js';

describe('computeColumnLayout', () => {
  it('returns single column for columns <= 1', () => {
    const result = computeColumnLayout(400, 1, 0);
    expect(result.widths).toEqual([400]);
    expect(result.offsets).toEqual([0]);
    expect(result.gap).toBe(0);
  });

  it('computes 2 equal columns with no gap', () => {
    const result = computeColumnLayout(400, 2, 0);
    expect(result.widths).toEqual([200, 200]);
    expect(result.offsets).toEqual([0, 200]);
    expect(result.gap).toBe(0);
  });

  it('computes 3 equal columns with gap', () => {
    // contentWidth=320, columns=3, gap=10
    // totalGap = 2 * 10 = 20, available = 300
    // width = 100 each
    const result = computeColumnLayout(320, 3, 10);
    expect(result.widths).toEqual([100, 100, 100]);
    expect(result.offsets).toEqual([0, 110, 220]);
    expect(result.gap).toBe(10);
  });

  it('computes asymmetric column widths from ratios', () => {
    // contentWidth=300, columns=2, gap=0, ratios=[1, 2]
    // totalRatio=3, widths=[100, 200]
    const result = computeColumnLayout(300, 2, 0, [1, 2]);
    expect(result.widths).toEqual([100, 200]);
    expect(result.offsets).toEqual([0, 100]);
  });

  it('computes asymmetric columns with gap', () => {
    // contentWidth=310, columns=2, gap=10, ratios=[1, 2]
    // available = 310 - 10 = 300, widths=[100, 200]
    const result = computeColumnLayout(310, 2, 10, [1, 2]);
    expect(result.widths).toEqual([100, 200]);
    expect(result.offsets).toEqual([0, 110]);
  });

  it('falls back to equal when columnWidths length does not match columns', () => {
    const result = computeColumnLayout(400, 2, 0, [1, 2, 3]);
    expect(result.widths).toEqual([200, 200]);
    expect(result.offsets).toEqual([0, 200]);
  });

  it('handles gap larger than content width gracefully', () => {
    // contentWidth=50, columns=2, gap=100
    // totalGap=100, available=max(0, 50-100)=0
    const result = computeColumnLayout(50, 2, 100);
    expect(result.widths).toEqual([0, 0]);
    expect(result.offsets).toEqual([0, 100]);
  });
});
