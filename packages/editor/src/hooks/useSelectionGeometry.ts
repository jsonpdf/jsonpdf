import { useMemo } from 'react';
import type { Element } from '@jsonpdf/core';
import type { DesignPage } from '../layout';

export interface SelectionGeometry {
  /** Absolute x on the Stage (includes CANVAS_PADDING + margins + element.x). */
  x: number;
  /** Absolute y on the Stage (includes page offset + margins + band offset + element.y). */
  y: number;
  width: number;
  height: number;
  rotation: number;
}

/**
 * Walk the element tree in a band to find the target element and accumulate
 * parent container offsets along the path.
 */
function findElementWithOffsets(
  elements: Element[],
  targetId: string,
  offsetX: number,
  offsetY: number,
): { element: Element; offsetX: number; offsetY: number } | null {
  for (const el of elements) {
    if (el.id === targetId) {
      return { element: el, offsetX, offsetY };
    }
    if (el.elements) {
      const found = findElementWithOffsets(el.elements, targetId, offsetX + el.x, offsetY + el.y);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Compute the absolute Stage-coordinate geometry of the selected element.
 * Returns null when nothing is selected or the element isn't found.
 */
export function useSelectionGeometry(
  selectedElementId: string | null,
  pages: DesignPage[],
  pageXOffsets: number[],
  pageYOffsets: number[],
): SelectionGeometry | null {
  return useMemo(() => {
    if (!selectedElementId) return null;

    for (let pi = 0; pi < pages.length; pi++) {
      const page = pages[pi];
      const { margins } = page.pageConfig;

      for (const db of page.bands) {
        const found = findElementWithOffsets(db.band.elements, selectedElementId, 0, 0);
        if (found) {
          return {
            x: pageXOffsets[pi] + margins.left + found.offsetX + found.element.x,
            y: pageYOffsets[pi] + margins.top + db.offsetY + found.offsetY + found.element.y,
            width: found.element.width,
            height: found.element.height,
            rotation: found.element.rotation ?? 0,
          };
        }
      }
    }

    return null;
  }, [selectedElementId, pages, pageXOffsets, pageYOffsets]);
}
