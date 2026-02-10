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

/** Resolve a single element's absolute stage-coordinate geometry. */
function findElementStageGeometry(
  targetId: string,
  pages: DesignPage[],
  pageXOffsets: number[],
  pageYOffsets: number[],
): { x: number; y: number; width: number; height: number; rotation: number } | null {
  for (let pi = 0; pi < pages.length; pi++) {
    const page = pages[pi];
    const { margins } = page.pageConfig;

    for (const db of page.bands) {
      const found = findElementWithOffsets(db.band.elements, targetId, 0, 0);
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
}

/**
 * Compute the absolute Stage-coordinate geometry of the selected element(s).
 * For a single element returns its exact bounds and rotation.
 * For multiple elements returns the enclosing bounding box with rotation 0.
 * Returns null when nothing is selected or no elements are found.
 */
export function useSelectionGeometry(
  selectedElementIds: string[],
  pages: DesignPage[],
  pageXOffsets: number[],
  pageYOffsets: number[],
): SelectionGeometry | null {
  return useMemo(() => {
    if (selectedElementIds.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let singleRotation = 0;
    let found = false;

    for (const id of selectedElementIds) {
      const geo = findElementStageGeometry(id, pages, pageXOffsets, pageYOffsets);
      if (geo) {
        found = true;
        minX = Math.min(minX, geo.x);
        minY = Math.min(minY, geo.y);
        maxX = Math.max(maxX, geo.x + geo.width);
        maxY = Math.max(maxY, geo.y + geo.height);
        if (selectedElementIds.length === 1) singleRotation = geo.rotation;
      }
    }

    if (!found) return null;

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      rotation: singleRotation,
    };
  }, [selectedElementIds, pages, pageXOffsets, pageYOffsets]);
}
