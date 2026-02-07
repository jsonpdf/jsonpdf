import type { PDFDocument, PDFPage, PDFRef, PDFContext } from 'pdf-lib';
import { PDFName, PDFString, PDFNumber, PDFArray, PDFNull, PDFDict } from 'pdf-lib';

export interface BookmarkEntry {
  /** Display title in the PDF outline panel. */
  title: string;
  /** The PDF page this bookmark points to. */
  page: PDFPage;
  /** Y position in pdf-lib coordinates (from bottom of page). */
  top: number;
  /** X position in pdf-lib coordinates. */
  left: number;
  /** Nesting level: 0 = section, 1 = band. */
  level: number;
}

interface OutlineItem {
  ref: PDFRef;
  dict: PDFDict;
  entry: BookmarkEntry;
  children: OutlineItem[];
}

/**
 * Build a PDF outline (bookmarks panel) from collected entries.
 *
 * Level 0 entries become top-level items. Level 1+ entries become
 * children of the most recent lower-level entry. Items at the same
 * level are siblings.
 */
export function buildPdfOutline(doc: PDFDocument, entries: BookmarkEntry[]): void {
  if (entries.length === 0) return;

  const context = doc.context;

  // Build hierarchy using a stack
  const rootItems: OutlineItem[] = [];
  const stack: OutlineItem[] = [];

  for (const entry of entries) {
    const dest = createDestination(context, entry);
    const dict = context.obj({
      Title: PDFString.of(entry.title),
      Dest: dest,
    });
    const ref = context.register(dict);

    const item: OutlineItem = { ref, dict, entry, children: [] };

    // Pop stack until we find a parent at a lower level
    while (stack.length > 0 && stack[stack.length - 1].entry.level >= entry.level) {
      stack.pop();
    }

    if (stack.length > 0) {
      stack[stack.length - 1].children.push(item);
    } else {
      rootItems.push(item);
    }

    stack.push(item);
  }

  // Create outline root dictionary
  const outlineDict = context.obj({ Type: 'Outlines' });
  const outlineRef = context.register(outlineDict);

  // Recursively link items with Parent/Prev/Next/First/Last/Count
  const totalCount = linkItems(rootItems, outlineRef);

  outlineDict.set(PDFName.of('First'), rootItems[0].ref);
  outlineDict.set(PDFName.of('Last'), rootItems[rootItems.length - 1].ref);
  outlineDict.set(PDFName.of('Count'), PDFNumber.of(totalCount));

  // Set the outline on the document catalog
  doc.catalog.set(PDFName.of('Outlines'), outlineRef);
}

function linkItems(items: OutlineItem[], parentRef: PDFRef): number {
  let totalCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    item.dict.set(PDFName.of('Parent'), parentRef);

    if (i > 0) {
      item.dict.set(PDFName.of('Prev'), items[i - 1].ref);
    }
    if (i < items.length - 1) {
      item.dict.set(PDFName.of('Next'), items[i + 1].ref);
    }

    totalCount++;

    if (item.children.length > 0) {
      const childCount = linkItems(item.children, item.ref);
      item.dict.set(PDFName.of('First'), item.children[0].ref);
      item.dict.set(PDFName.of('Last'), item.children[item.children.length - 1].ref);
      item.dict.set(PDFName.of('Count'), PDFNumber.of(childCount));
      totalCount += childCount;
    }
  }

  return totalCount;
}

function createDestination(context: PDFContext, entry: BookmarkEntry): PDFArray {
  const arr = PDFArray.withContext(context);
  arr.push(entry.page.ref);
  arr.push(PDFName.of('XYZ'));
  arr.push(PDFNumber.of(entry.left));
  arr.push(PDFNumber.of(entry.top));
  arr.push(PDFNull);
  return arr;
}
