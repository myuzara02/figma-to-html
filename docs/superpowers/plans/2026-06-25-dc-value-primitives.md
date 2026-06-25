# Design-Context Value Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the three deterministic value primitives that lock design accuracy — a Tailwind className parser, a spacing→token snapper, and a color→theme-variable mapper — so the agent translator never invents text, color, or spacing values.

**Architecture:** Pure TypeScript functions under `scripts/src/dc/`, no I/O. They consume raw values that the Figma `get_design_context` output expresses as Tailwind utilities and normalize them toward Lumos (px→token, color→theme var). The snapper and mapper are **source-agnostic** — the token scale and theme palette are injected as parameters, so the runtime source (foundation defaults now, real Figma variables later) can change without touching the core. This is Plan #1 of the "Design Context → Lumos" subsystem (see `docs/superpowers/specs/2026-06-25-design-context-to-lumos-design.md`).

**Tech Stack:** Node.js, TypeScript (strict), Vitest. Extends the existing `scripts/` project.

## Global Constraints

- Language: **Node.js + TypeScript (strict)**. Pure functions — no I/O, no network, no external deps.
- Modules live in `scripts/src/dc/`; tests in `scripts/test/dc/`. All commands run from `scripts/`.
- The Tailwind format is **Figma MCP's intermediate output**, not a dependency — **never install Tailwind**.
- `parseTailwind` returns **raw values** (px numbers, raw color strings) — snapping/mapping happen separately.
- Snapper and mapper are **source-agnostic**: the scale/palette are **parameters**, never hardcoded.
- Parser must be **tolerant**: unknown tokens are ignored, never throw.
- Stage only the files named in each task's commit step — never `git add -A`/`git add .` (unrelated docs under `.claude/` and `docs/` stay uncommitted).

---

### Task 1: Tailwind parser — layout facts

**Files:**
- Create: `scripts/src/dc/tailwind.ts`
- Test: `scripts/test/dc/tailwind.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Align = "start" | "center" | "end" | "stretch"`
  - `type Justify = "start" | "center" | "end" | "between"`
  - `interface StyleFacts { display?: "flex"; flexDirection?: "row" | "column"; align?: Align; justify?: Justify; gapPx?: number; position?: "absolute" | "relative"; widthPx?: number; widthKeyword?: "full" | "min-content" | "max-content"; fontFamily?: string; fontWeight?: string; fontSizePx?: number; lineHeight?: number; letterSpacingPx?: number; textAlign?: "left" | "center" | "right"; color?: string }`
  - `parseTailwind(className: string): StyleFacts`

- [ ] **Step 1: Write the failing tests**

Create `scripts/test/dc/tailwind.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseTailwind } from "../../src/dc/tailwind";

describe("parseTailwind — layout", () => {
  it("reads a flex column with gap, alignment, and justify", () => {
    const f = parseTailwind("content-stretch flex flex-col gap-[80px] items-center justify-center relative size-full");
    expect(f.display).toBe("flex");
    expect(f.flexDirection).toBe("column");
    expect(f.gapPx).toBe(80);
    expect(f.align).toBe("center");
    expect(f.justify).toBe("center");
    expect(f.position).toBe("relative");
    expect(f.widthKeyword).toBe("full");
  });

  it("reads flex-row and a fixed pixel width", () => {
    const f = parseTailwind("flex flex-row w-[330px]");
    expect(f.flexDirection).toBe("row");
    expect(f.widthPx).toBe(330);
  });

  it("reads absolute position and justify-between", () => {
    const f = parseTailwind("absolute justify-between");
    expect(f.position).toBe("absolute");
    expect(f.justify).toBe("between");
  });

  it("ignores unknown tokens without throwing", () => {
    expect(parseTailwind("shrink-0 not-italic [word-break:break-word]")).toEqual({});
  });

  it("returns an empty object for an empty string", () => {
    expect(parseTailwind("")).toEqual({});
  });
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx vitest run test/dc/tailwind.test.ts`
Expected: FAIL — cannot find module `../../src/dc/tailwind`.

- [ ] **Step 3: Implement `scripts/src/dc/tailwind.ts`**

```ts
export type Align = "start" | "center" | "end" | "stretch";
export type Justify = "start" | "center" | "end" | "between";

export interface StyleFacts {
  display?: "flex";
  flexDirection?: "row" | "column";
  align?: Align;
  justify?: Justify;
  gapPx?: number;
  position?: "absolute" | "relative";
  widthPx?: number;
  widthKeyword?: "full" | "min-content" | "max-content";
  fontFamily?: string;
  fontWeight?: string;
  fontSizePx?: number;
  lineHeight?: number;
  letterSpacingPx?: number;
  textAlign?: "left" | "center" | "right";
  color?: string;
}

/** Parse a Figma `get_design_context` className into raw style facts. Tolerant: unknown tokens are ignored. */
export function parseTailwind(className: string): StyleFacts {
  const facts: StyleFacts = {};
  for (const tok of className.split(/\s+/).filter(Boolean)) {
    if (tok === "flex") { facts.display = "flex"; continue; }
    if (tok === "flex-col") { facts.flexDirection = "column"; continue; }
    if (tok === "flex-row") { facts.flexDirection = "row"; continue; }

    const items = tok.match(/^items-(start|center|end|stretch)$/);
    if (items) { facts.align = items[1] as Align; continue; }

    const justify = tok.match(/^justify-(start|center|end|between)$/);
    if (justify) { facts.justify = justify[1] as Justify; continue; }

    const gap = tok.match(/^gap-\[(-?\d+(?:\.\d+)?)px\]$/);
    if (gap) { facts.gapPx = Number(gap[1]); continue; }

    if (tok === "absolute" || tok === "relative") { facts.position = tok; continue; }

    if (tok === "w-full" || tok === "size-full") { facts.widthKeyword = "full"; continue; }

    const wpx = tok.match(/^w-\[(\d+(?:\.\d+)?)px\]$/);
    if (wpx) { facts.widthPx = Number(wpx[1]); continue; }

    const wkw = tok.match(/^w-\[(min-content|max-content)\]$/);
    if (wkw) { facts.widthKeyword = wkw[1] as "min-content" | "max-content"; continue; }

    // unknown token → ignore
  }
  return facts;
}
```

- [ ] **Step 4: Run and verify it passes**

Run: `npx vitest run test/dc/tailwind.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/src/dc/tailwind.ts scripts/test/dc/tailwind.test.ts
git commit -m "feat: Tailwind parser — layout facts"
```

---

### Task 2: Tailwind parser — typography & color facts

**Files:**
- Modify: `scripts/src/dc/tailwind.ts`
- Test: `scripts/test/dc/tailwind-type.test.ts`

**Interfaces:**
- Consumes: `parseTailwind` / `StyleFacts` from Task 1.
- Produces: the same `parseTailwind` now also fills `fontFamily`, `fontWeight`, `fontSizePx`, `lineHeight`, `letterSpacingPx`, `textAlign`, `color`.

Disambiguation rule for `text-*`: `text-[<n>px]` → font size; `text-left|center|right` → text align; everything else `text-[…]` or named (`text-white`/`text-black`) → color.

- [ ] **Step 1: Write the failing tests**

Create `scripts/test/dc/tailwind-type.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseTailwind } from "../../src/dc/tailwind";

describe("parseTailwind — typography & color", () => {
  it("reads font family/weight, size, leading, tracking, white color", () => {
    const f = parseTailwind("font-['Aeonik:Regular'] leading-[1.1] text-[100px] text-white tracking-[-1px] w-[330px]");
    expect(f.fontFamily).toBe("Aeonik");
    expect(f.fontWeight).toBe("Regular");
    expect(f.fontSizePx).toBe(100);
    expect(f.lineHeight).toBe(1.1);
    expect(f.letterSpacingPx).toBe(-1);
    expect(f.color).toBe("white");
    expect(f.widthPx).toBe(330);
  });

  it("reads an rgba color and positive tracking", () => {
    const f = parseTailwind("font-['Aeonik:Medium'] text-[16px] text-[rgba(255,255,255,0.3)] tracking-[0.32px]");
    expect(f.fontWeight).toBe("Medium");
    expect(f.fontSizePx).toBe(16);
    expect(f.color).toBe("rgba(255,255,255,0.3)");
    expect(f.letterSpacingPx).toBe(0.32);
  });

  it("reads text-center as text alignment, not color", () => {
    const f = parseTailwind("text-center text-black");
    expect(f.textAlign).toBe("center");
    expect(f.color).toBe("black");
  });
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx vitest run test/dc/tailwind-type.test.ts`
Expected: FAIL — `fontFamily` / `color` undefined (typography/color tokens not yet handled).

- [ ] **Step 3: Replace `parseTailwind` in `scripts/src/dc/tailwind.ts` with the full version**

Replace the entire `parseTailwind` function body with this (keeps Task 1 layout handling, adds typography/color — order matters so `text-[Npx]` and `text-align` are matched before the generic color match):
```ts
export function parseTailwind(className: string): StyleFacts {
  const facts: StyleFacts = {};
  for (const tok of className.split(/\s+/).filter(Boolean)) {
    if (tok === "flex") { facts.display = "flex"; continue; }
    if (tok === "flex-col") { facts.flexDirection = "column"; continue; }
    if (tok === "flex-row") { facts.flexDirection = "row"; continue; }

    const items = tok.match(/^items-(start|center|end|stretch)$/);
    if (items) { facts.align = items[1] as Align; continue; }

    const justify = tok.match(/^justify-(start|center|end|between)$/);
    if (justify) { facts.justify = justify[1] as Justify; continue; }

    const gap = tok.match(/^gap-\[(-?\d+(?:\.\d+)?)px\]$/);
    if (gap) { facts.gapPx = Number(gap[1]); continue; }

    if (tok === "absolute" || tok === "relative") { facts.position = tok; continue; }

    if (tok === "w-full" || tok === "size-full") { facts.widthKeyword = "full"; continue; }

    const wpx = tok.match(/^w-\[(\d+(?:\.\d+)?)px\]$/);
    if (wpx) { facts.widthPx = Number(wpx[1]); continue; }

    const wkw = tok.match(/^w-\[(min-content|max-content)\]$/);
    if (wkw) { facts.widthKeyword = wkw[1] as "min-content" | "max-content"; continue; }

    // --- typography ---
    const font = tok.match(/^font-\['([^':\]]+):([^'\]]+)'\]$/);
    if (font) { facts.fontFamily = font[1]; facts.fontWeight = font[2]; continue; }

    const size = tok.match(/^text-\[(\d+(?:\.\d+)?)px\]$/);
    if (size) { facts.fontSizePx = Number(size[1]); continue; }

    const leading = tok.match(/^leading-\[(\d+(?:\.\d+)?)\]$/);
    if (leading) { facts.lineHeight = Number(leading[1]); continue; }

    const tracking = tok.match(/^tracking-\[(-?\d+(?:\.\d+)?)px\]$/);
    if (tracking) { facts.letterSpacingPx = Number(tracking[1]); continue; }

    const talign = tok.match(/^text-(left|center|right)$/);
    if (talign) { facts.textAlign = talign[1] as "left" | "center" | "right"; continue; }

    // --- color (after size/align so it does not swallow them) ---
    const colorBracket = tok.match(/^text-\[(.+)\]$/);
    if (colorBracket) { facts.color = colorBracket[1]; continue; }
    if (tok === "text-white") { facts.color = "white"; continue; }
    if (tok === "text-black") { facts.color = "black"; continue; }

    // unknown token → ignore
  }
  return facts;
}
```

- [ ] **Step 4: Run and verify both test files pass**

Run: `npx vitest run test/dc/tailwind.test.ts test/dc/tailwind-type.test.ts`
Expected: PASS — Task 1 layout tests still green, new typography/color tests green.

- [ ] **Step 5: Commit**

```bash
git add scripts/src/dc/tailwind.ts scripts/test/dc/tailwind-type.test.ts
git commit -m "feat: Tailwind parser — typography and color facts"
```

---

### Task 3: Spacing snapper (px → Lumos token)

**Files:**
- Create: `scripts/src/dc/spacing.ts`
- Test: `scripts/test/dc/spacing.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface SpacingStop { token: string; px: number }`
  - `type SpacingScale = SpacingStop[]`
  - `interface SnapResult { token: string; residualPx: number }`
  - `snapSpacing(px: number, scale: SpacingScale): SnapResult` — nearest stop by absolute distance; `residualPx = px - chosen.px` (signed); ties resolve to the smaller `px`; throws on empty scale.

- [ ] **Step 1: Write the failing tests**

Create `scripts/test/dc/spacing.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { snapSpacing, type SpacingScale } from "../../src/dc/spacing";

const scale: SpacingScale = [
  { token: "space--1", px: 4 },
  { token: "space--3", px: 16 },
  { token: "space--5", px: 32 },
  { token: "space--8", px: 80 },
];

describe("snapSpacing", () => {
  it("snaps an exact value with zero residual", () => {
    expect(snapSpacing(80, scale)).toEqual({ token: "space--8", residualPx: 0 });
  });
  it("snaps to the nearest stop and reports signed residual", () => {
    // 20 is nearest 16 (space--3); residual 20-16 = 4
    expect(snapSpacing(20, scale)).toEqual({ token: "space--3", residualPx: 4 });
  });
  it("reports a negative residual when the value is below the nearest stop", () => {
    // 30 is nearest 32 (space--5); residual 30-32 = -2
    expect(snapSpacing(30, scale)).toEqual({ token: "space--5", residualPx: -2 });
  });
  it("resolves a tie to the smaller px stop", () => {
    // 24 is equidistant from 16 and 32 → choose 16 (space--3)
    expect(snapSpacing(24, scale)).toEqual({ token: "space--3", residualPx: 8 });
  });
  it("throws on an empty scale", () => {
    expect(() => snapSpacing(10, [])).toThrow();
  });
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx vitest run test/dc/spacing.test.ts`
Expected: FAIL — cannot find module `../../src/dc/spacing`.

- [ ] **Step 3: Implement `scripts/src/dc/spacing.ts`**

```ts
export interface SpacingStop {
  token: string;
  px: number;
}
export type SpacingScale = SpacingStop[];

export interface SnapResult {
  token: string;
  residualPx: number;
}

/** Snap a pixel value to the nearest scale stop. Ties resolve to the smaller px. Throws on empty scale. */
export function snapSpacing(px: number, scale: SpacingScale): SnapResult {
  if (scale.length === 0) throw new Error("snapSpacing requires a non-empty scale");
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
  return { token: best.token, residualPx: px - best.px };
}
```

- [ ] **Step 4: Run and verify it passes**

Run: `npx vitest run test/dc/spacing.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/src/dc/spacing.ts scripts/test/dc/spacing.test.ts
git commit -m "feat: spacing snapper (px to Lumos token)"
```

---

### Task 4: Color parser + theme-variable mapper

**Files:**
- Create: `scripts/src/dc/color.ts`
- Test: `scripts/test/dc/color.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface Rgba { r: number; g: number; b: number; a: number }`
  - `parseColor(input: string): Rgba | null` — handles `rgb()/rgba()`, `#rgb`/`#rrggbb`/`#rrggbbaa`, and named `white`/`black`. Returns `null` if unrecognized.
  - `interface ThemeColor { var: string; rgba: Rgba }`
  - `type ThemePalette = ThemeColor[]`
  - `interface ColorMatch { themeVar: string; distance: number }`
  - `mapColor(input: string, palette: ThemePalette): ColorMatch | null` — nearest palette entry by RGB Euclidean distance (alpha ignored in matching; alpha is handled later via Lumos `color-mix`). Returns `null` if the color can't be parsed or the palette is empty.

- [ ] **Step 1: Write the failing tests**

Create `scripts/test/dc/color.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseColor, mapColor, type ThemePalette } from "../../src/dc/color";

describe("parseColor", () => {
  it("parses rgba", () => {
    expect(parseColor("rgba(255,255,255,0.3)")).toEqual({ r: 255, g: 255, b: 255, a: 0.3 });
  });
  it("parses rgb with default alpha 1", () => {
    expect(parseColor("rgb(0, 128, 255)")).toEqual({ r: 0, g: 128, b: 255, a: 1 });
  });
  it("parses 6-digit hex", () => {
    expect(parseColor("#00ff80")).toEqual({ r: 0, g: 255, b: 128, a: 1 });
  });
  it("parses 3-digit hex", () => {
    expect(parseColor("#fff")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  });
  it("parses named white/black", () => {
    expect(parseColor("white")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor("black")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
  });
  it("returns null for unrecognized input", () => {
    expect(parseColor("chartreuse-ish")).toBeNull();
  });
});

const palette: ThemePalette = [
  { var: "--_theme---background", rgba: { r: 0, g: 0, b: 0, a: 1 } },
  { var: "--_theme---text", rgba: { r: 255, g: 255, b: 255, a: 1 } },
];

describe("mapColor", () => {
  it("maps white to the closest theme var with zero distance", () => {
    expect(mapColor("white", palette)).toEqual({ themeVar: "--_theme---text", distance: 0 });
  });
  it("ignores alpha when matching", () => {
    expect(mapColor("rgba(255,255,255,0.3)", palette)).toEqual({ themeVar: "--_theme---text", distance: 0 });
  });
  it("maps a near-black to the background var", () => {
    const m = mapColor("#0a0a0a", palette);
    expect(m?.themeVar).toBe("--_theme---background");
  });
  it("returns null for an empty palette", () => {
    expect(mapColor("white", [])).toBeNull();
  });
  it("returns null for an unparseable color", () => {
    expect(mapColor("not-a-color", palette)).toBeNull();
  });
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx vitest run test/dc/color.test.ts`
Expected: FAIL — cannot find module `../../src/dc/color`.

- [ ] **Step 3: Implement `scripts/src/dc/color.ts`**

```ts
export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

const NAMED: Record<string, Rgba> = {
  white: { r: 255, g: 255, b: 255, a: 1 },
  black: { r: 0, g: 0, b: 0, a: 1 },
};

/** Parse a color string (rgb/rgba, #rgb/#rrggbb/#rrggbbaa, named white/black). Returns null if unrecognized. */
export function parseColor(input: string): Rgba | null {
  const s = input.trim().toLowerCase();
  if (s in NAMED) return { ...NAMED[s] };

  const rgba = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/);
  if (rgba) {
    return { r: Number(rgba[1]), g: Number(rgba[2]), b: Number(rgba[3]), a: rgba[4] !== undefined ? Number(rgba[4]) : 1 };
  }

  const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }

  return null;
}

export interface ThemeColor {
  var: string;
  rgba: Rgba;
}
export type ThemePalette = ThemeColor[];

export interface ColorMatch {
  themeVar: string;
  distance: number;
}

function rgbDistance(a: Rgba, b: Rgba): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

/** Map a color to the nearest palette entry by RGB distance (alpha ignored). Null if unparseable or empty palette. */
export function mapColor(input: string, palette: ThemePalette): ColorMatch | null {
  const c = parseColor(input);
  if (!c || palette.length === 0) return null;
  let best = palette[0];
  let bestDist = rgbDistance(c, best.rgba);
  for (const entry of palette.slice(1)) {
    const d = rgbDistance(c, entry.rgba);
    if (d < bestDist) {
      best = entry;
      bestDist = d;
    }
  }
  return { themeVar: best.var, distance: bestDist };
}
```

- [ ] **Step 4: Run and verify it passes**

Run: `npx vitest run test/dc/color.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS — every test file green (inference engine + new dc primitives).

- [ ] **Step 6: Commit**

```bash
git add scripts/src/dc/color.ts scripts/test/dc/color.test.ts
git commit -m "feat: color parser and theme-variable mapper"
```

---

## Done criteria

- `npm test` from `scripts/` is fully green.
- `parseTailwind`, `snapSpacing`, and `mapColor` are exported from `scripts/src/dc/` and unit-tested.
- Snapper and mapper take scale/palette as parameters (source-agnostic) — ready to be fed foundation defaults or real Figma variables in Plan #2.

## Deferred to later plans (explicit, not silent)

- **Loader** that reads the real token scale + theme palette from `lumos-foundation.css` (or `get_variable_defs`) — Plan #2 wiring.
- **DC/metadata parsers + merger → enriched IR** (modules 4–6) — Plan #2.
- **Agent translator skill + linter** (modules 7–8) — Plan #3.
- Extra Tailwind tokens not in scope (e.g. `min-w-full`, `inset-*`, gradients) — add when a real design needs them; log when skipped.
