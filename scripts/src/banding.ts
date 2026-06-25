import type { Rect } from "./geometry";

export type Axis = "x" | "y";

/**
 * Group items into bands along an axis. Items whose spans overlap on that axis land in the
 * same band. Bands are ordered by position; items within a band are ordered by their start.
 * axis "y" → rows (group by vertical overlap); axis "x" → columns (group by horizontal overlap).
 */
export function bandByAxis<T extends { rect: Rect }>(items: T[], axis: Axis, tol = 1): T[][] {
  const start = (r: Rect) => (axis === "y" ? r.y : r.x);
  const size = (r: Rect) => (axis === "y" ? r.h : r.w);
  const sorted = [...items].sort((a, b) => start(a.rect) - start(b.rect));

  const bands: T[][] = [];
  let current: T[] = [];
  let bandEnd = -Infinity;

  for (const item of sorted) {
    const s = start(item.rect);
    const e = s + size(item.rect);
    if (current.length === 0 || s < bandEnd - tol) {
      current.push(item);
      bandEnd = Math.max(bandEnd, e);
    } else {
      bands.push(current);
      current = [item];
      bandEnd = e;
    }
  }
  if (current.length) bands.push(current);
  return bands;
}
