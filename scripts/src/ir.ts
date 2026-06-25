import type { Rect } from "./geometry";

export type LayoutDirection = "row" | "column" | "grid" | "stack";
export type Sizing = "fill" | "hug" | "fixed";
export type Align = "start" | "center" | "end" | "stretch";

export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** A normalized Figma node: absolute rect plus optional children (the tree Figma already gives). */
export interface InputNode {
  id: string;
  name?: string;
  rect: Rect;
  children?: InputNode[];
}

export interface LayoutBox {
  id: string;
  name?: string;
  rect: Rect;
  layout: LayoutDirection;
  /** Main-axis gap (column gap for row/grid, row gap for column). */
  gap: number;
  /** Grid only: gap between rows. */
  rowGap?: number;
  padding: Padding;
  /** Cross-axis alignment of children. */
  align: Align;
  /** Main-axis distribution (start | center | end). */
  justify: Align;
  sizing: { width: Sizing; height: Sizing };
  /** Confidence of the layout classification, in [0, 1]. */
  confidence: number;
  children: LayoutBox[];
}

/** Build a childless box with neutral defaults (used for leaf nodes). */
export function leafBox(node: InputNode): LayoutBox {
  return {
    id: node.id,
    name: node.name,
    rect: node.rect,
    layout: "stack",
    gap: 0,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    align: "start",
    justify: "start",
    sizing: { width: "fixed", height: "fixed" },
    confidence: 1,
    children: [],
  };
}
