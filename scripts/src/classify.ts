import { rectsOverlap, type Rect } from "./geometry";
import type { LayoutDirection } from "./ir";
import { bandByAxis } from "./banding";

export interface Classification {
  layout: LayoutDirection;
  confidence: number;
}

/** True if any two items overlap in both axes. */
export function anyOverlap<T extends { rect: Rect }>(items: T[], tol = 1): boolean {
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (rectsOverlap(items[i].rect, items[j].rect, tol)) return true;
    }
  }
  return false;
}

/**
 * Classify how a node's direct children are arranged.
 * Priority: trivial (<=1) → overlap (stack) → single band (row/column) → regular matrix (grid) → stack.
 */
export function classifyArrangement<T extends { rect: Rect }>(children: T[], tol = 1): Classification {
  if (children.length <= 1) return { layout: "column", confidence: 1 };
  if (anyOverlap(children, tol)) return { layout: "stack", confidence: 0.3 };

  const rows = bandByAxis(children, "y", tol); // vertical bands
  const cols = bandByAxis(children, "x", tol); // horizontal bands
  const nRows = rows.length;
  const nCols = cols.length;

  if (nRows === 1) return { layout: "row", confidence: 0.9 };
  if (nCols === 1) return { layout: "column", confidence: 0.9 };

  const regular = rows.every((r) => r.length === nCols) && nRows * nCols === children.length;
  if (regular) return { layout: "grid", confidence: 0.85 };

  return { layout: "stack", confidence: 0.4 };
}
