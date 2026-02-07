import { describe, it, expect } from 'vitest';
import { parseColor, toHex } from '../../src/utils/colors.js';

describe('parseColor', () => {
  it('parses #RRGGBB format', () => {
    expect(parseColor('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(parseColor('#ffffff')).toEqual({ r: 1, g: 1, b: 1 });
    expect(parseColor('#FF0000')).toEqual({ r: 1, g: 0, b: 0 });
    expect(parseColor('#00ff00')).toEqual({ r: 0, g: 1, b: 0 });
    expect(parseColor('#0000ff')).toEqual({ r: 0, g: 0, b: 1 });
  });

  it('parses #RGB shorthand', () => {
    expect(parseColor('#000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(parseColor('#fff')).toEqual({ r: 1, g: 1, b: 1 });
    expect(parseColor('#f00')).toEqual({ r: 1, g: 0, b: 0 });
  });

  it('parses mid-range values', () => {
    const result = parseColor('#808080');
    expect(result.r).toBeCloseTo(128 / 255);
    expect(result.g).toBeCloseTo(128 / 255);
    expect(result.b).toBeCloseTo(128 / 255);
  });

  it('throws for missing # prefix', () => {
    expect(() => parseColor('000000')).toThrow('must start with #');
  });

  it('throws for invalid length', () => {
    expect(() => parseColor('#00')).toThrow('#RGB or #RRGGBB');
    expect(() => parseColor('#0000')).toThrow('#RGB or #RRGGBB');
    expect(() => parseColor('#0000000')).toThrow('#RGB or #RRGGBB');
  });

  it('throws for invalid hex characters', () => {
    expect(() => parseColor('#gggggg')).toThrow('Invalid color');
    expect(() => parseColor('#xyz')).toThrow('Invalid color');
  });
});

describe('toHex', () => {
  it('converts RGB to hex string', () => {
    expect(toHex({ r: 0, g: 0, b: 0 })).toBe('#000000');
    expect(toHex({ r: 1, g: 1, b: 1 })).toBe('#ffffff');
    expect(toHex({ r: 1, g: 0, b: 0 })).toBe('#ff0000');
  });

  it('rounds values correctly', () => {
    expect(toHex({ r: 128 / 255, g: 128 / 255, b: 128 / 255 })).toBe('#808080');
  });

  it('round-trips with parseColor', () => {
    const hex = '#2c3e50';
    expect(toHex(parseColor(hex))).toBe(hex);
  });

  it('clamps values above 1 to valid hex', () => {
    // Values > 1 should be clamped to 255 (0xff)
    expect(toHex({ r: 1.5, g: -0.5, b: 0.5 })).toMatch(/^#[0-9a-f]{6}$/);
    const result = toHex({ r: 1.5, g: -0.5, b: 0.5 });
    // r=1.5 should clamp to 1 (0xff), g=-0.5 should clamp to 0 (0x00), b=0.5 is valid
    expect(result).toBe('#ff0080');
  });

  it('converts black correctly', () => {
    expect(toHex({ r: 0, g: 0, b: 0 })).toBe('#000000');
  });

  it('converts white correctly', () => {
    expect(toHex({ r: 1, g: 1, b: 1 })).toBe('#ffffff');
  });
});
