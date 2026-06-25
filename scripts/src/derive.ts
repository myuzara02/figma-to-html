import { boundingBox, median, type Rect } from "./geometry";
import type { LayoutDirection, Padding } from "./ir";
import { bandByAxis } from "./banding";

/** Gaps between consecutive items sorted along an axis (clamped at 0). */
function consecutiveGaps<T extends { rect: Rect }>(items: T[], axis: "x" | "y"): number[] {
  const start = (r: Rect) => (axis === "x" ? r.x : r.y);
  const size = (r: Rect) => (axis === "x" ? r.w : r.h);
  const sorted = [...items].sort((a, b) => start(a.rect) - start(b.rect));
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].rect;
    const cur = sorted[i].rect;
    gaps.push(Math.max(0, start(cur) - (start(prev) + size(prev))));
  }
  return gaps;
}

export function deriveGap<T extends { rect: Rect }>(
  children: T[],
  layout: LayoutDirection,
): { gap: number; rowGap?: number } {
  if (layout === "row") return { gap: median(consecutiveGaps(children, "x")) };
  if (layout === "column") return { gap: median(consecutiveGaps(children, "y")) };
  if (layout === "grid") {
    const rows = bandByAxis(children, "y");
    const colGaps = rows.flatMap((r) => consecutiveGaps(r, "x"));
    const rowReps = rows.map((r) => r[0]); // one representative per row band
    return { gap: median(colGaps), rowGap: median(consecutiveGaps(rowReps, "y")) };
  }
  return { gap: 0 };
}

/** Padding = container rect minus children bounding box (each side clamped at 0). */
export function derivePadding(container: Rect, children: { rect: Rect }[]): Padding {
  const bb = boundingBox(children.map((c) => c.rect));
  return {
    left: Math.max(0, bb.x - container.x),
    top: Math.max(0, bb.y - container.y),
    right: Math.max(0, container.x + container.w - (bb.x + bb.w)),
    bottom: Math.max(0, container.y + container.h - (bb.y + bb.h)),
  };
}
