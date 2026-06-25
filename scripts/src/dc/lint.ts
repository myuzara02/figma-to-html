import { snapSpacing } from "./spacing";
import { parseColor, mapColor, type Rgba } from "./color";
import { DEFAULT_SPACING_SCALE, DEFAULT_PALETTE } from "./default-scales";

export type Severity = "error" | "flag";

export interface LintIssue {
  rule: string;
  match: string;
  severity: Severity;
  suggestion?: string;
}

/** A px value within this many px of a spacing token must use the token. */
const SPACING_SNAP_TOL_PX = 2;

/** max(r,g,b) - min(r,g,b) at or below this = an achromatic neutral the theme covers. */
const NEUTRAL_CHROMA_TOL = 12;
/** Properties whose color is a solid fill the theme palette can express. */
const FILL_PROPS = new Set(["color", "background", "background-color", "border-color", "outline-color", "fill", "stroke"]);

function chroma(c: Rgba): number {
  return Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
}

/** A declaration whose values are inherently raw (shadows, blurs, gradients). */
function isDecorative(prop: string, value: string): boolean {
  if (prop === "box-shadow" || prop === "text-shadow") return true;
  return /\b(?:blur|drop-shadow)\(/.test(value) || /-?gradient\(/.test(value);
}

function pxIssue(match: string, px: number, decorative: boolean): LintIssue {
  if (decorative) return { rule: "no-px", match, severity: "flag" };
  const snap = snapSpacing(px, DEFAULT_SPACING_SCALE);
  if (Math.abs(snap.residualPx) <= SPACING_SNAP_TOL_PX) {
    return { rule: "no-px", match, severity: "error", suggestion: `use var(--_spacing---${snap.token})` };
  }
  return { rule: "no-px", match, severity: "flag" };
}

function colorIssue(rule: string, match: string, prop: string, decorative: boolean): LintIssue {
  const c = parseColor(match);
  const isFill = FILL_PROPS.has(prop) || prop.startsWith("border");
  if (decorative || !isFill || !c || chroma(c) > NEUTRAL_CHROMA_TOL) {
    return { rule, match, severity: "flag" };
  }
  const m = mapColor(match, DEFAULT_PALETTE);
  let suggestion: string | undefined;
  if (m) {
    suggestion =
      c.a < 1
        ? `use color-mix(in hsl, var(${m.themeVar}) ${Math.round(c.a * 100)}%, transparent)`
        : `use var(${m.themeVar})`;
  }
  return { rule, match, severity: "error", suggestion };
}

const DECL_RE = /([a-zA-Z-]+)\s*:\s*([^;{}]+)/g;
const PX_RE = /\b(\d+(?:\.\d+)?)px\b/g;
const HEX_RE = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3}(?:[0-9a-fA-F]{2})?)?\b/g;
const RGBA_RE = /rgba?\([^)]*\)/g;

/** Deterministic two-tier Lumos output checks. Never throws. */
export function lintLumos(html: string): LintIssue[] {
  const issues: LintIssue[] = [];

  const styleBlocks = html.match(/<style>[\s\S]*?<\/style>/g) ?? [];
  for (const block of styleBlocks) {
    for (const decl of block.matchAll(DECL_RE)) {
      const prop = decl[1].toLowerCase();
      const value = decl[2];
      const dec = isDecorative(prop, value);
      for (const m of value.matchAll(PX_RE)) issues.push(pxIssue(m[0], Number(m[1]), dec));
      for (const m of value.matchAll(HEX_RE)) issues.push(colorIssue("no-hex", m[0], prop, dec));
      for (const m of value.matchAll(RGBA_RE)) issues.push(colorIssue("raw-color", m[0], prop, dec));
    }
  }

  for (const _ of html.matchAll(/\sstyle\s*=\s*"/g)) {
    issues.push({ rule: "no-inline-style", match: "style=", severity: "error" });
  }
  for (const m of html.matchAll(/class\s*=\s*"([^"]*)"/g)) {
    for (const cls of m[1].split(/\s+/).filter(Boolean)) {
      const isUtility = cls.startsWith("u-") || cls.startsWith("is-") || cls.startsWith("w-");
      const underscores = (cls.match(/_/g) ?? []).length;
      if (!isUtility && underscores > 3) {
        issues.push({ rule: "max-3-underscores", match: cls, severity: "error" });
      }
    }
  }

  return issues;
}
