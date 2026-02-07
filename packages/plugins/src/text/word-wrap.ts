import type { PDFFont } from 'pdf-lib';

export interface WrapResult {
  /** Wrapped lines of text. */
  lines: string[];
  /** Total height of all lines. */
  height: number;
}

/** Options for widow/orphan control (plumbing for Phase 8). */
export interface WrapOptions {
  /** Minimum lines at the bottom of a column/page. */
  widows?: number;
  /** Minimum lines at the top of a column/page. */
  orphans?: number;
}

/**
 * Wrap text to fit within a given width.
 *
 * Splits on explicit newlines first, then wraps each paragraph.
 * Words longer than maxWidth are broken at character level.
 *
 * The `options` parameter accepts `widows`/`orphans` for future
 * cross-page line splitting (Phase 8). Currently accepted but unused.
 */
export function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
  lineHeight: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _options?: WrapOptions,
): WrapResult {
  if (text === '') {
    return { lines: [''], height: lineHeight };
  }

  if (maxWidth <= 0) {
    const paragraphs = text.split('\n');
    return { lines: paragraphs, height: paragraphs.length * lineHeight };
  }

  const paragraphs = text.split('\n');
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph === '') {
      lines.push('');
      continue;
    }

    const words = paragraph.split(/\s+/).filter((w) => w.length > 0);
    if (words.length === 0) {
      lines.push('');
      continue;
    }

    let currentLine = '';

    for (const word of words) {
      const wordWidth = font.widthOfTextAtSize(word, fontSize);

      if (wordWidth > maxWidth) {
        // Word is longer than maxWidth — break at character level
        if (currentLine) {
          lines.push(currentLine);
          currentLine = '';
        }
        currentLine = breakLongWord(word, font, fontSize, maxWidth, lines);
        continue;
      }

      if (currentLine === '') {
        currentLine = word;
      } else {
        const testLine = `${currentLine} ${word}`;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);
        if (testWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
    }

    if (currentLine !== '') {
      lines.push(currentLine);
    }
  }

  return { lines, height: lines.length * lineHeight };
}

/**
 * Break a word that exceeds maxWidth into lines at character boundaries.
 * Pushes complete lines to the `lines` array and returns the remainder.
 */
function breakLongWord(
  word: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
  lines: string[],
): string {
  let current = '';
  for (const char of word) {
    const test = current + char;
    const width = font.widthOfTextAtSize(test, fontSize);
    if (width > maxWidth && current.length > 0) {
      lines.push(current);
      current = char;
    } else {
      current = test;
    }
  }
  return current;
}

/** Measure the width of a text string. */
export function measureTextWidth(text: string, font: PDFFont, fontSize: number): number {
  return font.widthOfTextAtSize(text, fontSize);
}
