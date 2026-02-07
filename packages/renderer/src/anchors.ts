import type { LayoutResult } from './layout.js';

/**
 * Collect all anchor IDs from a layout result.
 * Returns a map from anchor ID to 1-based page number.
 *
 * Scans both band-level anchors (`band.anchor`) and element-level
 * anchors (`element.anchor`). If the same anchor ID appears multiple
 * times, the first occurrence wins.
 */
export function collectAnchors(layout: LayoutResult): Map<string, number> {
  const anchors = new Map<string, number>();

  for (const page of layout.pages) {
    const pageNumber = page.pageIndex + 1;

    for (const layoutBand of page.bands) {
      if (layoutBand.band.anchor && !anchors.has(layoutBand.band.anchor)) {
        anchors.set(layoutBand.band.anchor, pageNumber);
      }

      for (const element of layoutBand.band.elements) {
        if (element.anchor && !anchors.has(element.anchor)) {
          anchors.set(element.anchor, pageNumber);
        }
      }
    }
  }

  return anchors;
}
