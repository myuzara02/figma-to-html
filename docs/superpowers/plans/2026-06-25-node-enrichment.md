# Node Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the deterministic per-node enrichment functions the merger needs — `detectRole` (Figma type + design-context facts → semantic role), `mapTypeStyle` (font px → nearest Lumos `u-text-style-*`), and `resolveStyle` (raw `StyleFacts` → a Lumos-ready `StyleInfo` with theme-var color + preserved alpha + type style).

**Architecture:** Pure TypeScript functions under `scripts/src/dc/`, no I/O. They turn the raw facts produced by the Plan #2 parsers (`MetaNode.type`, `DCFacts`, `parseTailwind` output) into the semantic + Lumos-mapped per-node values the agent translator will consume. Scales (type scale, theme palette) are **injected parameters** — source-agnostic, exactly like the Plan #1 primitives. This is the deterministic core of module 6 (the merger); the tree walk + autolayout-vs-inference layout resolution + inference-engine fallback are deferred to Plan #4. See `docs/superpowers/specs/2026-06-25-design-context-to-lumos-design.md`.

**Tech Stack:** Node.js, TypeScript (strict), Vitest. Extends the existing `scripts/` project.

## Global Constraints

- Language: **Node.js + TypeScript (strict)**. Pure functions — no I/O, no network, no external deps.
- Modules live in `scripts/src/dc/`; tests in `scripts/test/dc/`. All commands run from `scripts/`.
- Scales (type scale, palette) are **injected parameters**, never hardcoded (source-agnostic).
- Reuse the Plan #1 primitives — `mapColor` / `parseColor` from `./color`. Do not duplicate color logic.
- **Color alpha must be preserved** (`StyleInfo.colorAlpha`) — Lumos fades via `color-mix`, so opacity must survive (final-review accuracy note).
- Stage only the files named in each task's commit step — never `git add -A`/`git add .`.

---

### Task 1: Role detection

**Files:**
- Create: `scripts/src/dc/role.ts`
- Test: `scripts/test/dc/role.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Role = "image" | "divider" | "text" | "container" | "unknown"`
  - `interface RoleInput { type: string; rect: { w: number; h: number }; hasChildren: boolean; assetVar?: string }`
  - `detectRole(input: RoleInput): Role`

Rule order matters: a **thin vector is a divider even if it carries an asset** (the divider line's own SVG), so the thin-vector check comes before the asset check.

- [ ] **Step 1: Write the failing tests**

Create `scripts/test/dc/role.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { detectRole } from "../../src/dc/role";

describe("detectRole", () => {
  it("classifies a zero-height vector as a divider even when it has an asset", () => {
    // real case: node 4388:3415 is a Vector 6 with h=0 carrying the line's SVG asset
    expect(detectRole({ type: "vector", rect: { w: 440, h: 0 }, hasChildren: false, assetVar: "imgVector6" })).toBe("divider");
  });
  it("classifies an element with an asset as an image", () => {
    expect(detectRole({ type: "frame", rect: { w: 200, h: 200 }, hasChildren: false, assetVar: "imgPhoto" })).toBe("image");
  });
  it("classifies a non-thin vector with no asset as an image", () => {
    expect(detectRole({ type: "vector", rect: { w: 100, h: 100 }, hasChildren: false })).toBe("image");
  });
  it("classifies a text node as text", () => {
    expect(detectRole({ type: "text", rect: { w: 330, h: 70 }, hasChildren: false })).toBe("text");
  });
  it("classifies a frame with children as a container", () => {
    expect(detectRole({ type: "frame", rect: { w: 440, h: 222 }, hasChildren: true })).toBe("container");
  });
  it("classifies a childless frame as unknown", () => {
    expect(detectRole({ type: "frame", rect: { w: 10, h: 10 }, hasChildren: false })).toBe("unknown");
  });
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx vitest run test/dc/role.test.ts`
Expected: FAIL — cannot find module `../../src/dc/role`.

- [ ] **Step 3: Implement `scripts/src/dc/role.ts`**

```ts
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
```

- [ ] **Step 4: Run and verify it passes**

Run: `npx vitest run test/dc/role.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/src/dc/role.ts scripts/test/dc/role.test.ts
git commit -m "feat: node role detection"
```

---

### Task 2: Typography tier mapper

**Files:**
- Create: `scripts/src/dc/type-style.ts`
- Test: `scripts/test/dc/type-style.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface TypeStop { util: string; px: number }`
  - `type TypeScale = TypeStop[]`
  - `interface TypeStyleResult { util: string; residualPx: number }`
  - `mapTypeStyle(px: number, scale: TypeScale): TypeStyleResult` — nearest stop by absolute distance; `residualPx = px - chosen.px` (signed); ties resolve to the smaller px; throws on empty scale.

- [ ] **Step 1: Write the failing tests**

Create `scripts/test/dc/type-style.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { mapTypeStyle, type TypeScale } from "../../src/dc/type-style";

const scale: TypeScale = [
  { util: "u-text-style-h1", px: 64 },
  { util: "u-text-style-h2", px: 48 },
  { util: "u-text-style-main", px: 16 },
  { util: "u-text-style-small", px: 14 },
];

describe("mapTypeStyle", () => {
  it("maps an exact size with zero residual", () => {
    expect(mapTypeStyle(16, scale)).toEqual({ util: "u-text-style-main", residualPx: 0 });
  });
  it("maps a large display size to the nearest tier", () => {
    // 100 nearest 64 (h1); residual 100-64 = 36
    expect(mapTypeStyle(100, scale)).toEqual({ util: "u-text-style-h1", residualPx: 36 });
  });
  it("maps with a small negative residual", () => {
    // 50 nearest 48 (h2); residual 50-48 = 2
    expect(mapTypeStyle(50, scale)).toEqual({ util: "u-text-style-h2", residualPx: 2 });
  });
  it("resolves a tie to the smaller px", () => {
    // 15 equidistant from 14 and 16 → choose 14 (small)
    expect(mapTypeStyle(15, scale)).toEqual({ util: "u-text-style-small", residualPx: 1 });
  });
  it("throws on an empty scale", () => {
    expect(() => mapTypeStyle(16, [])).toThrow();
  });
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx vitest run test/dc/type-style.test.ts`
Expected: FAIL — cannot find module `../../src/dc/type-style`.

- [ ] **Step 3: Implement `scripts/src/dc/type-style.ts`**

```ts
export interface TypeStop {
  util: string;
  px: number;
}
export type TypeScale = TypeStop[];

export interface TypeStyleResult {
  util: string;
  residualPx: number;
}

/** Map a font size to the nearest Lumos text-style tier. Ties resolve to the smaller px. Throws on empty scale. */
export function mapTypeStyle(px: number, scale: TypeScale): TypeStyleResult {
  if (scale.length === 0) throw new Error("mapTypeStyle requires a non-empty scale");
  const sorted = [...scale].sort((a, b) => a.px - b.px);
  let best = sorted[0];
  let bestDist = Math.abs(px - best.px);
  for (const stop of sorted.slice(1)) {
    const d = Math.abs(px - stop.px);
    if (d < bestDist) {
      best = stop;
      bestDist = d;
    }
  }
  return { util: best.util, residualPx: px - best.px };
}
```

- [ ] **Step 4: Run and verify it passes**

Run: `npx vitest run test/dc/type-style.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/src/dc/type-style.ts scripts/test/dc/type-style.test.ts
git commit -m "feat: typography tier mapper (px to u-text-style)"
```

---

### Task 3: Style resolver

**Files:**
- Create: `scripts/src/dc/resolve-style.ts`
- Test: `scripts/test/dc/resolve-style.test.ts`

**Interfaces:**
- Consumes: `StyleFacts` from `./tailwind`; `mapColor` / `parseColor` / `ThemePalette` from `./color`; `mapTypeStyle` / `TypeScale` from `./type-style`.
- Produces:
  - `interface StyleInfo { textStyle?: string; textStyleResidualPx?: number; fontWeight?: string; colorVar?: string; colorDistance?: number; colorAlpha?: number; lineHeight?: number; lineHeightPx?: number; letterSpacingPx?: number; textAlign?: "left" | "center" | "right" }`
  - `interface StyleScales { typeScale: TypeScale; palette: ThemePalette }`
  - `resolveStyle(facts: StyleFacts, scales: StyleScales): StyleInfo`

`resolveStyle` maps font size → `textStyle`, color → `colorVar` (nearest theme var) **and** `colorAlpha` (parsed alpha, preserved for `color-mix`), and carries weight / line-height / letter-spacing / text-align through unchanged.

- [ ] **Step 1: Write the failing tests**

Create `scripts/test/dc/resolve-style.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { resolveStyle, type StyleScales } from "../../src/dc/resolve-style";
import type { StyleFacts } from "../../src/dc/tailwind";

const scales: StyleScales = {
  typeScale: [
    { util: "u-text-style-h1", px: 64 },
    { util: "u-text-style-main", px: 16 },
  ],
  palette: [
    { var: "--_theme---background", rgba: { r: 0, g: 0, b: 0, a: 1 } },
    { var: "--_theme---text", rgba: { r: 255, g: 255, b: 255, a: 1 } },
  ],
};

describe("resolveStyle", () => {
  it("resolves a large white heading (the 60+ case)", () => {
    const facts: StyleFacts = {
      fontFamily: "Aeonik", fontWeight: "Regular", fontSizePx: 100,
      lineHeight: 1.1, letterSpacingPx: -1, color: "white", widthPx: 330,
    };
    const s = resolveStyle(facts, scales);
    expect(s.textStyle).toBe("u-text-style-h1");
    expect(s.textStyleResidualPx).toBe(36);
    expect(s.fontWeight).toBe("Regular");
    expect(s.colorVar).toBe("--_theme---text");
    expect(s.colorAlpha).toBe(1);
    expect(s.lineHeight).toBe(1.1);
    expect(s.letterSpacingPx).toBe(-1);
  });

  it("preserves alpha for a faded label (rgba 0.3)", () => {
    const facts: StyleFacts = { fontWeight: "Medium", fontSizePx: 16, color: "rgba(255,255,255,0.3)" };
    const s = resolveStyle(facts, scales);
    expect(s.textStyle).toBe("u-text-style-main");
    expect(s.colorVar).toBe("--_theme---text");
    expect(s.colorAlpha).toBe(0.3);
  });

  it("returns an empty object when there are no style facts", () => {
    expect(resolveStyle({}, scales)).toEqual({});
  });
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx vitest run test/dc/resolve-style.test.ts`
Expected: FAIL — cannot find module `../../src/dc/resolve-style`.

- [ ] **Step 3: Implement `scripts/src/dc/resolve-style.ts`**

```ts
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

  if (facts.lineHeight !== undefined) out.lineHeight = facts.lineHeight;
  if (facts.lineHeightPx !== undefined) out.lineHeightPx = facts.lineHeightPx;
  if (facts.letterSpacingPx !== undefined) out.letterSpacingPx = facts.letterSpacingPx;
  if (facts.textAlign !== undefined) out.textAlign = facts.textAlign;

  return out;
}
```

- [ ] **Step 4: Run and verify it passes**

Run: `npx vitest run test/dc/resolve-style.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS — every test file green.

- [ ] **Step 6: Commit**

```bash
git add scripts/src/dc/resolve-style.ts scripts/test/dc/resolve-style.test.ts
git commit -m "feat: per-node style resolver (type style + theme color + alpha)"
```

---

## Done criteria

- `npm test` from `scripts/` is fully green.
- `detectRole`, `mapTypeStyle`, and `resolveStyle` are exported from `scripts/src/dc/` and unit-tested.
- Color alpha is preserved through `resolveStyle` (accuracy requirement for `color-mix`).

## Deferred to later plans (explicit, not silent)

- **The merger / tree assembly** (module 6 proper): walk the `MetaNode` tree, look up `ParsedDC.nodes[id]`, run `detectRole` + `resolveStyle` per node, resolve layout (autolayout from DC `parseTailwind` vs **inference engine** fallback for absolute/missing-DC subtrees), resolve asset URLs via `assets[assetVar]`, thread confidence, and emit the enriched IR tree — **Plan #4**.
- **Agent translator skill + linter** (modules 7–8) — Plan #5.
- Loader that reads the real type scale + palette from `lumos-foundation.css` / `get_variable_defs` — wired in the merger plan.
- Heading-level nuance (which `u-text-style-h*` → which `<h1>`–`<h6>` tag) — decided by the agent translator from `textStyle`.
