import { describe, it, expect } from 'vitest';
import {
  isSvgBytes,
  parseSvgDimensions,
  rasterizeSvg,
  DEFAULT_SVG_SCALE,
} from '../../src/image/svg-rasterizer.js';

// ── Test fixtures ──

const TINY_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><rect width="100" height="50" fill="red"/></svg>';

const VIEWBOX_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><circle cx="100" cy="50" r="40" fill="blue"/></svg>';

const XML_SVG =
  '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="green"/></svg>';

const BOM_SVG =
  '\uFEFF<svg xmlns="http://www.w3.org/2000/svg" width="60" height="40"><rect width="60" height="40" fill="yellow"/></svg>';

function toBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// ── isSvgBytes ──

describe('isSvgBytes', () => {
  it('detects SVG starting with <svg', () => {
    expect(isSvgBytes(toBytes(TINY_SVG))).toBe(true);
  });

  it('detects SVG starting with <?xml', () => {
    expect(isSvgBytes(toBytes(XML_SVG))).toBe(true);
  });

  it('detects SVG with leading whitespace', () => {
    expect(isSvgBytes(toBytes('  \n\t' + TINY_SVG))).toBe(true);
  });

  it('detects SVG with BOM', () => {
    expect(isSvgBytes(toBytes(BOM_SVG))).toBe(true);
  });

  it('returns false for PNG bytes', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(isSvgBytes(png)).toBe(false);
  });

  it('returns false for JPEG bytes', () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    expect(isSvgBytes(jpeg)).toBe(false);
  });

  it('returns false for empty bytes', () => {
    expect(isSvgBytes(new Uint8Array([]))).toBe(false);
  });

  it('returns false for random text', () => {
    expect(isSvgBytes(toBytes('Hello, world!'))).toBe(false);
  });
});

// ── parseSvgDimensions ──

describe('parseSvgDimensions', () => {
  it('extracts width and height from attributes', () => {
    expect(parseSvgDimensions(TINY_SVG)).toEqual({ width: 100, height: 50 });
  });

  it('extracts dimensions from viewBox when no width/height', () => {
    expect(parseSvgDimensions(VIEWBOX_SVG)).toEqual({ width: 200, height: 100 });
  });

  it('prefers width/height attributes over viewBox', () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50" viewBox="0 0 200 100"><rect/></svg>';
    expect(parseSvgDimensions(svg)).toEqual({ width: 100, height: 50 });
  });

  it('handles units (px, pt) by stripping suffix', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="120px" height="80pt"><rect/></svg>';
    expect(parseSvgDimensions(svg)).toEqual({ width: 120, height: 80 });
  });

  it('returns 300x150 for SVG with no dimensions', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
    expect(parseSvgDimensions(svg)).toEqual({ width: 300, height: 150 });
  });

  it('handles float values in viewBox', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 99.5 50.25"><rect/></svg>';
    expect(parseSvgDimensions(svg)).toEqual({ width: 99.5, height: 50.25 });
  });

  it('returns default for non-SVG input', () => {
    expect(parseSvgDimensions('not an svg')).toEqual({ width: 300, height: 150 });
  });
});

// ── rasterizeSvg ──

describe('rasterizeSvg', () => {
  it('produces PNG bytes with correct magic header', () => {
    const { pngBytes } = rasterizeSvg(TINY_SVG);
    // PNG magic: 0x89 0x50 0x4E 0x47
    expect(pngBytes[0]).toBe(0x89);
    expect(pngBytes[1]).toBe(0x50);
    expect(pngBytes[2]).toBe(0x4e);
    expect(pngBytes[3]).toBe(0x47);
    expect(pngBytes.length).toBeGreaterThan(8);
  });

  it('returns intrinsic dimensions (pre-scale)', () => {
    const { width, height } = rasterizeSvg(TINY_SVG);
    expect(width).toBe(100);
    expect(height).toBe(50);
  });

  it('defaults to 2x scale', () => {
    expect(DEFAULT_SVG_SCALE).toBe(2);
  });

  it('respects custom scale factor', () => {
    const result1x = rasterizeSvg(TINY_SVG, 1);
    const result3x = rasterizeSvg(TINY_SVG, 3);
    // Both return same intrinsic dimensions
    expect(result1x.width).toBe(100);
    expect(result3x.width).toBe(100);
    // But 3x PNG should be larger in bytes than 1x
    expect(result3x.pngBytes.length).toBeGreaterThan(result1x.pngBytes.length);
  });

  it('handles viewBox-only SVG', () => {
    const { pngBytes, width, height } = rasterizeSvg(VIEWBOX_SVG);
    expect(pngBytes[0]).toBe(0x89); // PNG
    expect(width).toBe(200);
    expect(height).toBe(100);
  });

  it('throws descriptive error for invalid SVG', () => {
    expect(() => rasterizeSvg('not valid svg')).toThrow('Failed to rasterize SVG');
  });
});
