import { boundingBox, median, type Rect } from "./geometry";
import type { LayoutDirection, Padding, Align, Sizing } from "./ir";
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

const CLOSE_TOL = 2;

function allClose(values: number[], tol = CLOSE_TOL): boolean {
  return Math.max(...values) - Math.min(...values) <= tol;
}

/** Cross-axis alignment of children (row/grid → Y, column → X). */
export function deriveAlign<T extends { rect: Rect }>(children: T[], layout: LayoutDirection): Align {
  if (children.length < 2) return "start";
  const cross: "x" | "y" = layout === "column" ? "x" : "y";
  const startOf = (r: Rect) => (cross === "y" ? r.y : r.x);
  const sizeOf = (r: Rect) => (cross === "y" ? r.h : r.w);
  const starts = children.map((c) => startOf(c.rect));
  const centers = children.map((c) => startOf(c.rect) + sizeOf(c.rect) / 2);
  const ends = children.map((c) => startOf(c.rect) + sizeOf(c.rect));
  if (allClose(starts)) return "start";
  if (allClose(centers)) return "center";
  if (allClose(ends)) return "end";
  return "stretch";
}

/** Main-axis distribution from leading vs trailing space (row/grid → X, column → Y). */
export function deriveJustify<T extends { rect: Rect }>(
  container: Rect,
  children: T[],
  layout: LayoutDirection,
): Align {
  if (children.length === 0) return "start";
  const main: "x" | "y" = layout === "column" ? "y" : "x";
  const startOf = (r: Rect) => (main === "y" ? r.y : r.x);
  const sizeOf = (r: Rect) => (main === "y" ? r.h : r.w);
  const cStart = main === "y" ? container.y : container.x;
  const cSize = main === "y" ? container.h : container.w;
  const sorted = [...children].sort((a, b) => startOf(a.rect) - startOf(b.rect));
  const first = sorted[0].rect;
  const last = sorted[sorted.length - 1].rect;
  const lead = startOf(first) - cStart;
  const trail = cStart + cSize - (startOf(last) + sizeOf(last));
  const JUSTIFY_TOL = 4;
  if (Math.abs(lead - trail) <= JUSTIFY_TOL) return "center";
  return lead < trail ? "start" : "end";
}

/** A child "fills" an axis when it spans the parent's content box on that axis, else "fixed". */
export function deriveSizing(
  child: Rect,
  parent: Rect,
  parentPadding: Padding,
): { width: Sizing; height: Sizing } {
  const contentW = parent.w - parentPadding.left - parentPadding.right;
  const contentH = parent.h - parentPadding.top - parentPadding.bottom;
  const SIZING_TOL = 2;
  return {
    width: Math.abs(child.w - contentW) <= SIZING_TOL ? "fill" : "fixed",
    height: Math.abs(child.h - contentH) <= SIZING_TOL ? "fill" : "fixed",
  };
}
