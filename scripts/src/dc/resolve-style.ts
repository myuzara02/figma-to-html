import type { StyleFacts } from "./tailwind";
import { mapColor, parseColor, type ThemePalette } from "./color";
import { mapTypeStyle, type TypeScale } from "./type-style";

export interface StyleInfo {
  textStyle?: string;
  textStyleResidualPx?: number;
  fontWeight?: string;
  colorVar?: string;
  colorDistance?: number;
  colorAlpha?: number;
  bgColorVar?: string;
  bgColorDistance?: number;
  bgColorAlpha?: number;
  lineHeight?: number;
  lineHeightPx?: number;
  letterSpacingPx?: number;
  textAlign?: "left" | "center" | "right";
}

export interface StyleScales {
  typeScale: TypeScale;
  palette: ThemePalette;
}

/** Turn raw StyleFacts into Lumos-ready StyleInfo: type-style tier, theme-var color (alpha preserved), and carried metrics. */
export function resolveStyle(facts: StyleFacts, scales: StyleScales): StyleInfo {
  const out: StyleInfo = {};

  if (facts.fontSizePx !== undefined) {
    const t = mapTypeStyle(facts.fontSizePx, scales.typeScale);
    out.textStyle = t.util;
    out.textStyleResidualPx = t.residualPx;
  }
  if (facts.fontWeight !== undefined) out.fontWeight = facts.fontWeight;

  if (facts.color !== undefined) {
    const match = mapColor(facts.color, scales.palette);
    if (match) {
      out.colorVar = match.themeVar;
      out.colorDistance = match.distance;
    }
    const parsed = parseColor(facts.color);
    if (parsed) out.colorAlpha = parsed.a;
  }

  if (facts.bgColor !== undefined) {
    const match = mapColor(facts.bgColor, scales.palette);
    if (match) {
      out.bgColorVar = match.themeVar;
      out.bgColorDistance = match.distance;
    }
    const parsed = parseColor(facts.bgColor);
    if (parsed) out.bgColorAlpha = parsed.a;
  }

  if (facts.lineHeight !== undefined) out.lineHeight = facts.lineHeight;
  if (facts.lineHeightPx !== undefined) out.lineHeightPx = facts.lineHeightPx;
  if (facts.letterSpacingPx !== undefined) out.letterSpacingPx = facts.letterSpacingPx;
  if (facts.textAlign !== undefined) out.textAlign = facts.textAlign;

  return out;
}
