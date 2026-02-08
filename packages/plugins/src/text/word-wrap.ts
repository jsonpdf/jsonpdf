import type { PDFFont } from 'pdf-lib';

export interface WrapResult {
  /** Wrapped lines of text. */
  lines: string[];
  /** Total height of all lines. */
  height: number;
  /** Number of words per line (parallel to lines). */
  wordsPerLine: number[];
  /** Whether each line is the last in its paragraph (parallel to lines). */
  isLastInParagraph: boolean[];
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
  _options?: WrapOptions,
  letterSpacing?: number,
): WrapResult {
  if (text === '') {
    return {
      lines: [''],
      height: lineHeight,
      wordsPerLine: [0],
      isLastInParagraph: [true],
    };
  }

  if (maxWidth <= 0) {
    const paragraphs = text.split('\n');
    return {
      lines: paragraphs,
      height: paragraphs.length * lineHeight,
      wordsPerLine: paragraphs.map((p) => p.split(/\s+/).filter((w) => w.length > 0).length),
      isLastInParagraph: paragraphs.map(() => true),
    };
  }

  const paragraphs = text.split('\n');
  const lines: string[] = [];
  const wordsPerLine: number[] = [];
  const isLastInParagraph: boolean[] = [];

  for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
    const paragraph = paragraphs[pIdx];

    if (paragraph === '') {
      lines.push('');
      wordsPerLine.push(0);
      isLastInParagraph.push(true);
      continue;
    }

    const words = paragraph.split(/\s+/).filter((w) => w.length > 0);
    if (words.length === 0) {
      lines.push('');
      wordsPerLine.push(0);
      isLastInParagraph.push(true);
      continue;
    }

    let currentLine = '';
    let currentWordCount = 0;

    for (const word of words) {
      const wordWidth = measureTextWidth(word, font, fontSize, letterSpacing);

      if (wordWidth > maxWidth) {
        // Word is longer than maxWidth — break at character level
        if (currentLine) {
          lines.push(currentLine);
          wordsPerLine.push(currentWordCount);
          isLastInParagraph.push(false);
          currentLine = '';
          currentWordCount = 0;
        }
        currentLine = breakLongWord(
          word,
          font,
          fontSize,
          maxWidth,
          lines,
          wordsPerLine,
          isLastInParagraph,
          letterSpacing,
        );
        currentWordCount = 1;
        continue;
      }

      if (currentLine === '') {
        currentLine = word;
        currentWordCount = 1;
      } else {
        const testLine = `${currentLine} ${word}`;
        const testWidth = measureTextWidth(testLine, font, fontSize, letterSpacing);
        if (testWidth <= maxWidth) {
          currentLine = testLine;
          currentWordCount++;
        } else {
          lines.push(currentLine);
          wordsPerLine.push(currentWordCount);
          isLastInParagraph.push(false);
          currentLine = word;
          currentWordCount = 1;
        }
      }
    }

    if (currentLine !== '') {
      lines.push(currentLine);
      wordsPerLine.push(currentWordCount);
      isLastInParagraph.push(true);
    }
  }

  return { lines, height: lines.length * lineHeight, wordsPerLine, isLastInParagraph };
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
  wordsPerLine: number[],
  isLastInParagraph: boolean[],
  letterSpacing?: number,
): string {
  let current = '';
  for (const char of word) {
    const test = current + char;
    const width = measureTextWidth(test, font, fontSize, letterSpacing);
    if (width > maxWidth && current.length > 0) {
      lines.push(current);
      wordsPerLine.push(1);
      isLastInParagraph.push(false);
      current = char;
    } else {
      current = test;
    }
  }
  return current;
}

/** Measure the width of a text string, accounting for optional letter spacing. */
export function measureTextWidth(
  text: string,
  font: PDFFont,
  fontSize: number,
  letterSpacing?: number,
): number {
  const base = font.widthOfTextAtSize(text, fontSize);
  if (letterSpacing && text.length > 1) {
    return base + letterSpacing * (text.length - 1);
  }
  return base;
}
