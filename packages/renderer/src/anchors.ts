import type { LayoutResult } from './layout.js';

/**
 * Collect all anchor IDs from a layout result.
 * Returns a map from anchor ID to 1-based page number.
 *
 * Scans both band-level anchors (`band.anchor`) and element-level
 * anchors (`element.anchor`). If the same anchor ID appears multiple
 * times, the first occurrence wins.
 */
export function collectAnchors(
  layout: LayoutResult,
  options?: { warnOnDuplicates?: boolean },
): Map<string, number> {
  const warn = options?.warnOnDuplicates ?? false;
  const anchors = new Map<string, number>();

  for (const page of layout.pages) {
    const pageNumber = page.pageIndex + 1;

    for (const layoutBand of page.bands) {
      if (layoutBand.band.anchor) {
        if (!anchors.has(layoutBand.band.anchor)) {
          anchors.set(layoutBand.band.anchor, pageNumber);
        } else if (warn) {
          console.warn(
            `Duplicate anchor "${layoutBand.band.anchor}" on page ${String(pageNumber)}; first occurrence on page ${String(anchors.get(layoutBand.band.anchor))} used`,
          );
        }
      }

      for (const element of layoutBand.band.elements) {
        if (element.anchor) {
          if (!anchors.has(element.anchor)) {
            anchors.set(element.anchor, pageNumber);
          } else if (warn) {
            console.warn(
              `Duplicate anchor "${element.anchor}" on page ${String(pageNumber)}; first occurrence on page ${String(anchors.get(element.anchor))} used`,
            );
          }
        }
      }
    }
  }

  return anchors;
}
