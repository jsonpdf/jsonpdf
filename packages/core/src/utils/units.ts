const MM_PER_POINT = 25.4 / 72;
const POINTS_PER_INCH = 72;

/** Convert millimeters to points (1 point = 1/72 inch). */
export function mmToPoints(mm: number): number {
  return mm / MM_PER_POINT;
}

/** Convert inches to points. */
export function inchesToPoints(inches: number): number {
  return inches * POINTS_PER_INCH;
}

/** Convert points to millimeters. */
export function pointsToMm(points: number): number {
  return points * MM_PER_POINT;
}

/** Convert points to inches. */
export function pointsToInches(points: number): number {
  return points / POINTS_PER_INCH;
}
