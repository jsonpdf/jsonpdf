import { describe, it, expect, beforeAll } from 'vitest';
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFString, PDFNumber } from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';
import { buildPdfOutline, type BookmarkEntry } from '../src/bookmarks.js';

let doc: PDFDocument;
let page1: PDFPage;
let page2: PDFPage;
let page3: PDFPage;

beforeAll(async () => {
  doc = await PDFDocument.create();
  page1 = doc.addPage([612, 792]);
  page2 = doc.addPage([612, 792]);
  page3 = doc.addPage([612, 792]);
});

function getOutline(d: PDFDocument): PDFDict | undefined {
  const outlineRef = d.catalog.get(PDFName.of('Outlines'));
  if (!outlineRef) return undefined;
  return d.context.lookup(outlineRef) as PDFDict;
}

function getOutlineTitle(d: PDFDocument, item: PDFDict): string {
  const title = item.get(PDFName.of('Title'));
  if (title instanceof PDFString) return title.decodeText();
  return '';
}

describe('buildPdfOutline', () => {
  it('does nothing for empty entries', async () => {
    const testDoc = await PDFDocument.create();
    testDoc.addPage([612, 792]);
    buildPdfOutline(testDoc, []);
    expect(testDoc.catalog.get(PDFName.of('Outlines'))).toBeUndefined();
  });

  it('creates outline with a single top-level entry', async () => {
    const testDoc = await PDFDocument.create();
    const p = testDoc.addPage([612, 792]);

    buildPdfOutline(testDoc, [{ title: 'Chapter 1', page: p, top: 792, left: 0, level: 0 }]);

    const outline = getOutline(testDoc);
    expect(outline).toBeDefined();

    const count = outline!.get(PDFName.of('Count'));
    expect(count).toBeInstanceOf(PDFNumber);
    expect((count as PDFNumber).asNumber()).toBe(1);

    const first = testDoc.context.lookup(outline!.get(PDFName.of('First'))!) as PDFDict;
    expect(getOutlineTitle(testDoc, first)).toBe('Chapter 1');
  });

  it('creates outline with multiple top-level entries', async () => {
    const testDoc = await PDFDocument.create();
    const p1 = testDoc.addPage([612, 792]);
    const p2 = testDoc.addPage([612, 792]);

    buildPdfOutline(testDoc, [
      { title: 'Section A', page: p1, top: 792, left: 0, level: 0 },
      { title: 'Section B', page: p2, top: 792, left: 0, level: 0 },
    ]);

    const outline = getOutline(testDoc);
    expect(outline).toBeDefined();

    const count = (outline!.get(PDFName.of('Count')) as PDFNumber).asNumber();
    expect(count).toBe(2);

    // First item
    const first = testDoc.context.lookup(outline!.get(PDFName.of('First'))!) as PDFDict;
    expect(getOutlineTitle(testDoc, first)).toBe('Section A');

    // Last item
    const last = testDoc.context.lookup(outline!.get(PDFName.of('Last'))!) as PDFDict;
    expect(getOutlineTitle(testDoc, last)).toBe('Section B');

    // Verify Next/Prev links
    expect(first.get(PDFName.of('Next'))).toBeDefined();
    expect(first.get(PDFName.of('Prev'))).toBeUndefined();
    expect(last.get(PDFName.of('Prev'))).toBeDefined();
    expect(last.get(PDFName.of('Next'))).toBeUndefined();
  });

  it('nests level 1 entries under level 0', async () => {
    const testDoc = await PDFDocument.create();
    const p = testDoc.addPage([612, 792]);

    buildPdfOutline(testDoc, [
      { title: 'Chapter 1', page: p, top: 792, left: 0, level: 0 },
      { title: 'Section 1.1', page: p, top: 700, left: 72, level: 1 },
      { title: 'Section 1.2', page: p, top: 600, left: 72, level: 1 },
    ]);

    const outline = getOutline(testDoc);
    const count = (outline!.get(PDFName.of('Count')) as PDFNumber).asNumber();
    expect(count).toBe(3); // total count includes children

    // The chapter should have children
    const chapter = testDoc.context.lookup(outline!.get(PDFName.of('First'))!) as PDFDict;
    expect(getOutlineTitle(testDoc, chapter)).toBe('Chapter 1');

    const chapterFirst = testDoc.context.lookup(chapter.get(PDFName.of('First'))!) as PDFDict;
    expect(getOutlineTitle(testDoc, chapterFirst)).toBe('Section 1.1');

    const chapterLast = testDoc.context.lookup(chapter.get(PDFName.of('Last'))!) as PDFDict;
    expect(getOutlineTitle(testDoc, chapterLast)).toBe('Section 1.2');
  });

  it('handles mixed levels: section → band bookmarks', async () => {
    const testDoc = await PDFDocument.create();
    const p1 = testDoc.addPage([612, 792]);
    const p2 = testDoc.addPage([612, 792]);

    buildPdfOutline(testDoc, [
      { title: 'Introduction', page: p1, top: 792, left: 0, level: 0 },
      { title: 'Overview', page: p1, top: 700, left: 72, level: 1 },
      { title: 'Main Content', page: p2, top: 792, left: 0, level: 0 },
      { title: 'Details', page: p2, top: 700, left: 72, level: 1 },
    ]);

    const outline = getOutline(testDoc);
    const count = (outline!.get(PDFName.of('Count')) as PDFNumber).asNumber();
    expect(count).toBe(4);

    // First top-level: Introduction
    const first = testDoc.context.lookup(outline!.get(PDFName.of('First'))!) as PDFDict;
    expect(getOutlineTitle(testDoc, first)).toBe('Introduction');

    // Second top-level: Main Content
    const last = testDoc.context.lookup(outline!.get(PDFName.of('Last'))!) as PDFDict;
    expect(getOutlineTitle(testDoc, last)).toBe('Main Content');
  });

  it('creates a valid PDF that can be saved', async () => {
    const testDoc = await PDFDocument.create();
    const p = testDoc.addPage([612, 792]);

    buildPdfOutline(testDoc, [
      { title: 'Bookmark A', page: p, top: 792, left: 0, level: 0 },
      { title: 'Sub Bookmark', page: p, top: 600, left: 72, level: 1 },
    ]);

    const bytes = await testDoc.save();
    expect(bytes.byteLength).toBeGreaterThan(0);

    const header = new TextDecoder().decode(new Uint8Array(bytes).slice(0, 5));
    expect(header).toBe('%PDF-');
  });

  it('destination points to correct page', async () => {
    const testDoc = await PDFDocument.create();
    const p1 = testDoc.addPage([612, 792]);
    const p2 = testDoc.addPage([612, 792]);

    buildPdfOutline(testDoc, [
      { title: 'Page 2 Bookmark', page: p2, top: 500, left: 36, level: 0 },
    ]);

    const outline = getOutline(testDoc);
    const item = testDoc.context.lookup(outline!.get(PDFName.of('First'))!) as PDFDict;
    const dest = item.get(PDFName.of('Dest'));
    expect(dest).toBeInstanceOf(PDFArray);

    // First element of Dest array should be the page reference
    const destArray = dest as PDFArray;
    expect(destArray.get(0)).toBe(p2.ref);
  });
});
