import { describe, it, expect } from 'vitest';
import { templateToPdf } from '../src/coordinate.js';

describe('templateToPdf', () => {
  it('translates origin (0,0) with margins', () => {
    // US Letter (612×792), margins 40 all sides
    const result = templateToPdf(0, 0, 792, 40, 40);
    expect(result.x).toBe(40);
    expect(result.y).toBe(752); // 792 - 40 - 0
  });

  it('translates element at (100, 50)', () => {
    const result = templateToPdf(100, 50, 792, 40, 40);
    expect(result.x).toBe(140); // 40 + 100
    expect(result.y).toBe(702); // 792 - 40 - 50
  });

  it('translates with no margins', () => {
    const result = templateToPdf(0, 0, 792, 0, 0);
    expect(result.x).toBe(0);
    expect(result.y).toBe(792);
  });

  it('translates bottom of content area', () => {
    // Content height = 792 - 40 - 40 = 712
    const result = templateToPdf(0, 712, 792, 40, 40);
    expect(result.x).toBe(40);
    expect(result.y).toBe(40); // Bottom margin
  });

  it('handles A4 dimensions', () => {
    const result = templateToPdf(0, 0, 842, 50, 50);
    expect(result.x).toBe(50);
    expect(result.y).toBe(792); // 842 - 50 - 0
  });
});
