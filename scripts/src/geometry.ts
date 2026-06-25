export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Overlap length of two 1-D segments [aStart, aStart+aLen) and [bStart, bStart+bLen). 0 if disjoint. */
export function overlap1D(aStart: number, aLen: number, bStart: number, bLen: number): number {
  const start = Math.max(aStart, bStart);
  const end = Math.min(aStart + aLen, bStart + bLen);
  return Math.max(0, end - start);
}

/** Do two rects overlap in BOTH axes? `tol` ignores touching edges / sub-pixel overlap. */
export function rectsOverlap(a: Rect, b: Rect, tol = 1): boolean {
  return overlap1D(a.x, a.w, b.x, b.w) > tol && overlap1D(a.y, a.h, b.y, b.h) > tol;
}

/** Median of a numeric array. Returns 0 for empty input. */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Axis-aligned bounding box of a non-empty set of rects. */
export function boundingBox(rects: Rect[]): Rect {
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.w));
  const bottom = Math.max(...rects.map((r) => r.y + r.h));
  return { x, y, w: right - x, h: bottom - y };
}
