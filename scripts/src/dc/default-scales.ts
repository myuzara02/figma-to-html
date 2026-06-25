import type { SpacingScale } from "./spacing";
import type { TypeScale } from "./type-style";
import type { ThemePalette } from "./color";
import type { MergeScales } from "./merge";

/** Lumos spacing values at desktop (max-clamp px), synced to lumos-foundation.css. */
export const DEFAULT_SPACING_SCALE: SpacingScale = [
  { token: "space--1", px: 8 },
  { token: "space--2", px: 12 },
  { token: "space--3", px: 16 },
  { token: "space--4", px: 24 },
  { token: "space--5", px: 32 },
  { token: "space--6", px: 40 },
  { token: "space--7", px: 48 },
  { token: "space--8", px: 64 },
];

/** Representative Lumos type-style tiers (px). Tunable starting defaults. */
export const DEFAULT_TYPE_SCALE: TypeScale = [
  { util: "u-text-style-display", px: 120 },
  { util: "u-text-style-h1", px: 64 },
  { util: "u-text-style-h2", px: 48 },
  { util: "u-text-style-h3", px: 36 },
  { util: "u-text-style-h4", px: 28 },
  { util: "u-text-style-h5", px: 22 },
  { util: "u-text-style-large", px: 20 },
  { util: "u-text-style-h6", px: 18 },
  { util: "u-text-style-main", px: 16 },
  { util: "u-text-style-small", px: 14 },
];

/**
 * Theme color anchors (light-theme defaults). The agent selects the actual theme
 * (u-theme-light/dark/brand) per design; these anchors let mapColor suggest the nearest var.
 */
export const DEFAULT_PALETTE: ThemePalette = [
  { var: "--_theme---background", rgba: { r: 255, g: 255, b: 255, a: 1 } },
  { var: "--_theme---text", rgba: { r: 17, g: 17, b: 17, a: 1 } },
  { var: "--_theme---background-2", rgba: { r: 240, g: 240, b: 240, a: 1 } },
  { var: "--_theme---border", rgba: { r: 200, g: 200, b: 200, a: 1 } },
];

export const DEFAULT_SCALES: MergeScales = {
  style: { typeScale: DEFAULT_TYPE_SCALE, palette: DEFAULT_PALETTE },
  spacing: DEFAULT_SPACING_SCALE,
};
