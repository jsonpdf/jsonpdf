/** Computed column geometry for multi-column layout. */
export interface ColumnLayout {
  /** Width of each column in points. */
  widths: number[];
  /** X-offset from the left margin for each column. */
  offsets: number[];
  /** Gap between columns. */
  gap: number;
}

/**
 * Compute column layout geometry.
 *
 * Equal columns: `width = (contentWidth - (columns - 1) * gap) / columns`
 * Asymmetric: `columnWidths` are ratios normalized to fill available space.
 * If `columnWidths.length` doesn't match `columns`, falls back to equal.
 */
export function computeColumnLayout(
  contentWidth: number,
  columns: number,
  columnGap: number,
  columnWidths?: number[],
): ColumnLayout {
  if (columns <= 1) {
    return { widths: [contentWidth], offsets: [0], gap: 0 };
  }

  const totalGap = (columns - 1) * columnGap;
  const availableWidth = Math.max(0, contentWidth - totalGap);

  let widths: number[];
  if (columnWidths && columnWidths.length === columns) {
    const totalRatio = columnWidths.reduce((sum, r) => sum + r, 0);
    widths = columnWidths.map((r) => (r / totalRatio) * availableWidth);
  } else {
    const w = availableWidth / columns;
    widths = Array.from({ length: columns }, () => w);
  }

  const offsets: number[] = [];
  let x = 0;
  for (let i = 0; i < columns; i++) {
    offsets.push(x);
    x += widths[i] + columnGap;
  }

  return { widths, offsets, gap: columnGap };
}
