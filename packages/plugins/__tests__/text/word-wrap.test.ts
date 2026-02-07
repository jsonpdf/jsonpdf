import { describe, it, expect, beforeAll } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import type { PDFFont } from 'pdf-lib';
import { wrapText, measureTextWidth, type WrapOptions } from '../../src/text/word-wrap.js';

let font: PDFFont;
const fontSize = 12;
const lineHeight = 14.4; // 12 * 1.2

beforeAll(async () => {
  const doc = await PDFDocument.create();
  font = await doc.embedFont(StandardFonts.Helvetica);
});

describe('wrapText', () => {
  it('handles empty string', () => {
    const result = wrapText('', font, fontSize, 500, lineHeight);
    expect(result.lines).toEqual(['']);
    expect(result.height).toBe(lineHeight);
  });

  it('keeps single word that fits', () => {
    const result = wrapText('Hello', font, fontSize, 500, lineHeight);
    expect(result.lines).toEqual(['Hello']);
    expect(result.height).toBe(lineHeight);
  });

  it('keeps single line that fits', () => {
    const result = wrapText('Hello World', font, fontSize, 500, lineHeight);
    expect(result.lines).toEqual(['Hello World']);
    expect(result.height).toBe(lineHeight);
  });

  it('wraps text to multiple lines', () => {
    const narrowWidth = font.widthOfTextAtSize('Hello World', fontSize) - 1;
    const result = wrapText('Hello World', font, fontSize, narrowWidth, lineHeight);
    expect(result.lines).toEqual(['Hello', 'World']);
    expect(result.height).toBe(lineHeight * 2);
  });

  it('wraps many words', () => {
    const text = 'The quick brown fox jumps over the lazy dog';
    const result = wrapText(text, font, fontSize, 100, lineHeight);
    expect(result.lines.length).toBeGreaterThan(1);
    // All words should be present across lines
    const rejoined = result.lines.join(' ');
    expect(rejoined).toBe(text);
  });

  it('handles explicit newlines', () => {
    const result = wrapText('Line 1\nLine 2\nLine 3', font, fontSize, 500, lineHeight);
    expect(result.lines).toEqual(['Line 1', 'Line 2', 'Line 3']);
    expect(result.height).toBe(lineHeight * 3);
  });

  it('handles empty lines from consecutive newlines', () => {
    const result = wrapText('A\n\nB', font, fontSize, 500, lineHeight);
    expect(result.lines).toEqual(['A', '', 'B']);
    expect(result.height).toBe(lineHeight * 3);
  });

  it('breaks long words at character level', () => {
    const longWord = 'A'.repeat(100);
    const result = wrapText(longWord, font, fontSize, 50, lineHeight);
    expect(result.lines.length).toBeGreaterThan(1);
    // All characters preserved
    expect(result.lines.join('')).toBe(longWord);
  });

  it('handles trailing newline', () => {
    const result = wrapText('Hello\n', font, fontSize, 500, lineHeight);
    expect(result.lines).toEqual(['Hello', '']);
  });

  it('handles leading newline', () => {
    const result = wrapText('\nHello', font, fontSize, 500, lineHeight);
    expect(result.lines).toEqual(['', 'Hello']);
  });

  it('handles multiple spaces between words', () => {
    const result = wrapText('Hello    World', font, fontSize, 500, lineHeight);
    // Multiple spaces collapsed to single space between words
    expect(result.lines).toEqual(['Hello World']);
  });

  it('handles text with only whitespace', () => {
    const result = wrapText('   ', font, fontSize, 500, lineHeight);
    expect(result.lines).toEqual(['']);
    expect(result.height).toBe(lineHeight);
  });

  it('handles zero-width maxWidth without infinite loop', () => {
    const result = wrapText('Hello', font, fontSize, 0, lineHeight);
    // Should still return a result without hanging
    expect(result.lines).toBeDefined();
    expect(Array.isArray(result.lines)).toBe(true);
  });

  it('wraps with very narrow width (1 char at a time)', () => {
    const singleCharWidth = font.widthOfTextAtSize('A', fontSize) + 1;
    const result = wrapText('ABC', font, fontSize, singleCharWidth, lineHeight);
    // Should break into individual characters
    expect(result.lines.length).toBeGreaterThanOrEqual(3);
    expect(result.lines.join('')).toBe('ABC');
  });

  it('handles unicode characters (emoji) - throws for unsupported encoding', () => {
    const emojiText = 'Hello 👋 World 🌍';
    // Standard fonts like Helvetica don't support emoji (WinAnsi encoding only)
    // This tests that the error is caught/thrown appropriately
    expect(() => {
      wrapText(emojiText, font, fontSize, 500, lineHeight);
    }).toThrow();
  });

  it('handles CJK characters - throws for unsupported encoding', () => {
    const cjkText = '你好世界 こんにちは 안녕하세요';
    // Standard fonts like Helvetica don't support CJK (WinAnsi encoding only)
    // This tests that the error is caught/thrown appropriately
    expect(() => {
      wrapText(cjkText, font, fontSize, 500, lineHeight);
    }).toThrow();
  });

  it('trailing spaces do not cause extra lines', () => {
    const result = wrapText('Hello   ', font, fontSize, 500, lineHeight);
    // Trailing spaces should not create empty lines
    expect(result.lines).toEqual(['Hello']);
    expect(result.height).toBe(lineHeight);
  });
});

describe('wrapText: widow/orphan options (plumbing)', () => {
  it('accepts WrapOptions with widows and orphans', () => {
    const opts: WrapOptions = { widows: 3, orphans: 2 };
    const result = wrapText('Hello World', font, fontSize, 500, lineHeight, opts);
    expect(result.lines).toEqual(['Hello World']);
    expect(result.height).toBe(lineHeight);
  });

  it('produces same result with and without options', () => {
    const text = 'The quick brown fox jumps over the lazy dog';
    const without = wrapText(text, font, fontSize, 100, lineHeight);
    const withOpts = wrapText(text, font, fontSize, 100, lineHeight, { widows: 2, orphans: 2 });
    expect(withOpts.lines).toEqual(without.lines);
    expect(withOpts.height).toBe(without.height);
  });

  it('accepts undefined options', () => {
    const result = wrapText('Hello', font, fontSize, 500, lineHeight, undefined);
    expect(result.lines).toEqual(['Hello']);
  });

  it('accepts empty options object', () => {
    const result = wrapText('Hello', font, fontSize, 500, lineHeight, {});
    expect(result.lines).toEqual(['Hello']);
  });
});

describe('measureTextWidth', () => {
  it('returns positive width for non-empty text', () => {
    expect(measureTextWidth('Hello', font, fontSize)).toBeGreaterThan(0);
  });

  it('returns zero for empty string', () => {
    expect(measureTextWidth('', font, fontSize)).toBe(0);
  });

  it('wider text returns larger width', () => {
    const w1 = measureTextWidth('Hi', font, fontSize);
    const w2 = measureTextWidth('Hello World', font, fontSize);
    expect(w2).toBeGreaterThan(w1);
  });
});
