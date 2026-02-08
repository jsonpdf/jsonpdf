import { describe, it, expect, beforeAll } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import type { FontMap } from '@jsonpdf/plugins';
import { fontKey } from '@jsonpdf/plugins';
import { measureFootnoteHeight, renderFootnotes, type FootnoteEntry } from '../src/footnotes.js';
import type { Style } from '@jsonpdf/core';

let fonts: FontMap;
let pdfDoc: PDFDocument;

beforeAll(async () => {
  pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  fonts = new Map();
  fonts.set(fontKey('Helvetica', 'normal', 'normal'), helvetica);
});

describe('measureFootnoteHeight', () => {
  const baseStyle: Style = { fontFamily: 'Helvetica', fontSize: 12 };

  it('returns 0 for empty entries', () => {
    expect(measureFootnoteHeight([], baseStyle)).toBe(0);
  });

  it('returns positive height for single footnote', () => {
    const entries: FootnoteEntry[] = [{ number: 1, content: 'A footnote.' }];
    const height = measureFootnoteHeight(entries, baseStyle);
    expect(height).toBeGreaterThan(0);
  });

  it('increases height with more footnotes', () => {
    const one: FootnoteEntry[] = [{ number: 1, content: 'First.' }];
    const two: FootnoteEntry[] = [
      { number: 1, content: 'First.' },
      { number: 2, content: 'Second.' },
    ];
    expect(measureFootnoteHeight(two, baseStyle)).toBeGreaterThan(
      measureFootnoteHeight(one, baseStyle),
    );
  });
});

describe('renderFootnotes', () => {
  const baseStyle: Style = { fontFamily: 'Helvetica', fontSize: 12 };

  it('renders without error for single footnote', async () => {
    const doc = await PDFDocument.create();
    const helvetica = await doc.embedFont(StandardFonts.Helvetica);
    const localFonts: FontMap = new Map();
    localFonts.set(fontKey('Helvetica', 'normal', 'normal'), helvetica);

    const page = doc.addPage([612, 792]);
    const entries: FootnoteEntry[] = [{ number: 1, content: 'Test footnote content.' }];
    // Should not throw
    renderFootnotes(page, entries, 40, 100, 500, baseStyle, localFonts);
  });

  it('renders nothing for empty entries', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([612, 792]);
    // Should not throw or draw anything
    renderFootnotes(page, [], 40, 100, 500, baseStyle, fonts);
  });

  it('renders multiple footnotes without error', async () => {
    const doc = await PDFDocument.create();
    const helvetica = await doc.embedFont(StandardFonts.Helvetica);
    const localFonts: FontMap = new Map();
    localFonts.set(fontKey('Helvetica', 'normal', 'normal'), helvetica);

    const page = doc.addPage([612, 792]);
    const entries: FootnoteEntry[] = [
      { number: 1, content: 'First footnote.' },
      { number: 2, content: 'Second footnote.' },
      { number: 3, content: [{ text: 'Rich ' }, { text: 'footnote.' }] },
    ];
    renderFootnotes(page, entries, 40, 150, 500, baseStyle, localFonts);
  });
});
