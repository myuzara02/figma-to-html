export type Role = "image" | "divider" | "text" | "container" | "unknown";

export interface RoleInput {
  type: string;
  rect: { w: number; h: number };
  hasChildren: boolean;
  assetVar?: string;
}

const DIVIDER_MAX_THICKNESS = 2;

/** Classify a node's semantic role from its Figma type, geometry, children, and any asset. */
export function detectRole(input: RoleInput): Role {
  // A thin vector is a divider line even if it carries its own SVG asset.
  if (input.type === "vector" && (input.rect.h <= DIVIDER_MAX_THICKNESS || input.rect.w <= DIVIDER_MAX_THICKNESS)) {
    return "divider";
  }
  if (input.assetVar) return "image";
  if (input.type === "vector") return "image";
  if (input.type === "text") return "text";
  if (input.type === "frame" || input.type === "group" || input.type === "instance") {
    return input.hasChildren ? "container" : "unknown";
  }
  return "unknown";
}
