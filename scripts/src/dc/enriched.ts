import type { Rect } from "../geometry";
import type { Role } from "./role";
import type { StyleInfo } from "./resolve-style";
import type { LayoutDirection } from "../ir";

export interface LayoutInfo {
  layout: LayoutDirection;
  source: "autolayout" | "inferred";
  gap?: { token: string; residualPx: number };
  align?: string;
  justify?: string;
  confidence: number;
}

export interface AssetRef {
  var: string;
  url?: string;
}

export interface EnrichedNode {
  id: string;
  name: string;
  role: Role;
  rect: Rect;
  text?: string;
  style?: StyleInfo;
  asset?: AssetRef;
  layout: LayoutInfo;
  children: EnrichedNode[];
}
