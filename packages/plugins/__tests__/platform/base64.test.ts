import { describe, it, expect } from 'vitest';
import { uint8ArrayToBase64 } from '../../src/platform/base64.js';

describe('uint8ArrayToBase64', () => {
  it('returns empty string for empty array', () => {
    expect(uint8ArrayToBase64(new Uint8Array([]))).toBe('');
  });

  it('round-trips "Hello"', () => {
    const bytes = new TextEncoder().encode('Hello');
    const base64 = uint8ArrayToBase64(bytes);
    expect(atob(base64)).toBe('Hello');
  });

  it('encodes binary data correctly', () => {
    const bytes = new Uint8Array([0x00, 0xff, 0x80, 0x7f]);
    const base64 = uint8ArrayToBase64(bytes);
    // Verify round-trip
    const decoded = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    expect(decoded).toEqual(bytes);
  });

  it('handles large arrays without stack overflow', () => {
    const bytes = new Uint8Array(100_000);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = i % 256;
    }
    const base64 = uint8ArrayToBase64(bytes);
    expect(base64.length).toBeGreaterThan(0);
    // Verify round-trip of first few bytes
    const decoded = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    expect(decoded[0]).toBe(0);
    expect(decoded[255]).toBe(255);
    expect(decoded.length).toBe(100_000);
  });
});
