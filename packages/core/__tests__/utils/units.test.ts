import { describe, it, expect } from 'vitest';
import { mmToPoints, inchesToPoints, pointsToMm, pointsToInches } from '../../src/utils/units.js';

describe('unit conversions', () => {
  it('converts inches to points (1 inch = 72 points)', () => {
    expect(inchesToPoints(1)).toBe(72);
    expect(inchesToPoints(8.5)).toBe(612);
    expect(inchesToPoints(11)).toBe(792);
  });

  it('converts points to inches', () => {
    expect(pointsToInches(72)).toBe(1);
    expect(pointsToInches(612)).toBe(8.5);
  });

  it('converts mm to points', () => {
    expect(mmToPoints(25.4)).toBeCloseTo(72, 1);
    expect(mmToPoints(210)).toBeCloseTo(595.28, 0);
    expect(mmToPoints(297)).toBeCloseTo(841.89, 0);
  });

  it('converts points to mm', () => {
    expect(pointsToMm(72)).toBeCloseTo(25.4, 1);
  });

  it('round-trips inches', () => {
    expect(pointsToInches(inchesToPoints(3.5))).toBeCloseTo(3.5);
  });

  it('round-trips mm', () => {
    expect(pointsToMm(mmToPoints(100))).toBeCloseTo(100, 5);
  });

  it('handles zero', () => {
    expect(mmToPoints(0)).toBe(0);
    expect(inchesToPoints(0)).toBe(0);
    expect(pointsToMm(0)).toBe(0);
    expect(pointsToInches(0)).toBe(0);
  });
});
