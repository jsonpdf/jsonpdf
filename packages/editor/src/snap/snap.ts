import type { Element } from '@jsonpdf/core';

export interface SnapLine {
  orientation: 'horizontal' | 'vertical';
  position: number;
}

export interface SnapResult {
  x: number;
  y: number;
  guides: SnapLine[];
}

export interface SnapTargets {
  vertical: number[];
  horizontal: number[];
}

const DEFAULT_THRESHOLD = 5;

/**
 * Collect snap target lines from sibling elements and band boundaries.
 * All coordinates are band-local (same space as element x/y).
 */
export function collectSnapTargets(
  elements: readonly Element[],
  selectedIds: readonly string[],
  contentWidth: number,
  bandHeight: number,
): SnapTargets {
  const vertical: number[] = [0, contentWidth];
  const horizontal: number[] = [0, bandHeight];
  const excluded = new Set(selectedIds);

  for (const el of elements) {
    if (excluded.has(el.id)) continue;
    if (el.rotation) continue;

    const left = el.x;
    const right = el.x + el.width;
    const centerX = el.x + el.width / 2;
    const top = el.y;
    const bottom = el.y + el.height;
    const centerY = el.y + el.height / 2;

    vertical.push(left, centerX, right);
    horizontal.push(top, centerY, bottom);
  }

  return { vertical, horizontal };
}

/** Find the closest snap target for one axis. Returns the delta to apply and the matched target, or null if nothing is within threshold. */
function snapAxis(
  edges: number[],
  targets: number[],
  threshold: number,
): { delta: number; target: number } | null {
  let bestDelta = Infinity;
  let bestEdge = 0;
  let bestTarget = 0;

  for (const edge of edges) {
    for (const target of targets) {
      const d = Math.abs(edge - target);
      if (d < bestDelta) {
        bestDelta = d;
        bestEdge = edge;
        bestTarget = target;
      }
    }
  }

  if (bestDelta <= threshold) {
    return { delta: bestTarget - bestEdge, target: bestTarget };
  }
  return null;
}

/**
 * Snap a dragged element (or bounding box) to nearby targets.
 * Returns the snapped position and active guide lines.
 */
export function snapPosition(
  x: number,
  y: number,
  width: number,
  height: number,
  targets: SnapTargets,
  threshold = DEFAULT_THRESHOLD,
): SnapResult {
  const guides: SnapLine[] = [];

  // Horizontal edges of the dragged rect
  const xEdges = [x, x + width / 2, x + width];
  const yEdges = [y, y + height / 2, y + height];

  let snappedX = x;
  let snappedY = y;

  const xSnap = snapAxis(xEdges, targets.vertical, threshold);
  if (xSnap) {
    snappedX = x + xSnap.delta;
    guides.push({ orientation: 'vertical', position: xSnap.target });
  }

  const ySnap = snapAxis(yEdges, targets.horizontal, threshold);
  if (ySnap) {
    snappedY = y + ySnap.delta;
    guides.push({ orientation: 'horizontal', position: ySnap.target });
  }

  return { x: snappedX, y: snappedY, guides };
}

export interface SnapSizeResult {
  x: number;
  y: number;
  width: number;
  height: number;
  guides: SnapLine[];
}

type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

/**
 * Snap the moving edge(s) during a resize operation.
 * Only the edges being dragged by the handle are snapped.
 */
export function snapSize(
  x: number,
  y: number,
  width: number,
  height: number,
  handlePosition: HandlePosition,
  targets: SnapTargets,
  threshold = DEFAULT_THRESHOLD,
): SnapSizeResult {
  const guides: SnapLine[] = [];
  let newX = x;
  let newY = y;
  let newW = width;
  let newH = height;

  // Snap moving horizontal edge(s)
  if (handlePosition.includes('w')) {
    const leftEdge = [x];
    const snap = snapAxis(leftEdge, targets.vertical, threshold);
    if (snap) {
      const delta = snap.delta;
      newX = x + delta;
      newW = width - delta;
      guides.push({ orientation: 'vertical', position: snap.target });
    }
  } else if (handlePosition.includes('e')) {
    const rightEdge = [x + width];
    const snap = snapAxis(rightEdge, targets.vertical, threshold);
    if (snap) {
      newW = width + snap.delta;
      guides.push({ orientation: 'vertical', position: snap.target });
    }
  }

  // Snap moving vertical edge(s)
  if (handlePosition.includes('n')) {
    const topEdge = [y];
    const snap = snapAxis(topEdge, targets.horizontal, threshold);
    if (snap) {
      const delta = snap.delta;
      newY = y + delta;
      newH = height - delta;
      guides.push({ orientation: 'horizontal', position: snap.target });
    }
  } else if (handlePosition.includes('s')) {
    const bottomEdge = [y + height];
    const snap = snapAxis(bottomEdge, targets.horizontal, threshold);
    if (snap) {
      newH = height + snap.delta;
      guides.push({ orientation: 'horizontal', position: snap.target });
    }
  }

  // Clamp minimum size
  if (newW < 1) {
    newW = 1;
    if (handlePosition.includes('w')) newX = x + width - 1;
  }
  if (newH < 1) {
    newH = 1;
    if (handlePosition.includes('n')) newY = y + height - 1;
  }

  return { x: newX, y: newY, width: newW, height: newH, guides };
}
