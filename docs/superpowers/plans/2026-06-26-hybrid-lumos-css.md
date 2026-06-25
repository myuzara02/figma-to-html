# Hybrid Lumos + Scoped CSS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize the "hybrid Lumos + scoped CSS" approach via a token-aware two-tier linter, a synced spacing scale, and hybrid authoring docs.

**Architecture:** Upgrade the existing flat `lintLumos` scanner into a declaration-aware two-tier checker that reuses `snapSpacing`/`parseColor`/`mapColor`. Fix `DEFAULT_SPACING_SCALE` to match the real Lumos foundation so token-matching is accurate. Add two markdown docs (Tailwind→Lumos table, hybrid rules). The merge/IR pipeline is untouched.

**Tech Stack:** TypeScript (strict, ESM), Vitest, tsx. All commands run from the `scripts/` directory.

## Global Constraints

- All code/test commands run from `scripts/` (e.g. `cd scripts && npm test`).
- TypeScript strict; ESM imports with no file extension (e.g. `from "./spacing"`).
- `LintIssue` gains `severity: "error" | "flag"` and optional `suggestion: string`.
- `error` = a token exists for this value (must fix). `flag` = no close token (escape-hatch allowed, recorded).
- `rem` values are NEVER checked (deliberate escape-hatch unit for one-off geometry).
- Linter px/color checks run only inside `<style>` blocks, with property context; structural rules (`no-inline-style`, `max-3-underscores`) run over the whole document and are always `error`.
- Do NOT modify merge/IR (`merge.ts`, `enriched.ts`, `resolve-*.ts`, `verify.ts`) or the type scale.
- Spacing token px values (foundation desktop/max-clamp): space--1=8, --2=12, --3=16, --4=24, --5=32, --6=40, --7=48, --8=64.

---

### Task 1: Sync `DEFAULT_SPACING_SCALE` to the Lumos foundation

**Files:**
- Modify: `scripts/src/dc/default-scales.ts:7-16`
- Test: `scripts/test/dc/default-scales.test.ts`

**Interfaces:**
- Consumes: `SpacingScale` (`{ token: string; px: number }[]`) from `./spacing`.
- Produces: corrected `DEFAULT_SPACING_SCALE` consumed by Task 2's linter and the existing pipeline.

- [ ] **Step 1: Update the failing test to lock the corrected values**

In `scripts/test/dc/default-scales.test.ts`, replace the first `it(...)` block with:

```ts
  it("spacing scale matches the Lumos foundation (desktop px) and snaps sensibly", () => {
    expect(DEFAULT_SPACING_SCALE).toEqual([
      { token: "space--1", px: 8 },
      { token: "space--2", px: 12 },
      { token: "space--3", px: 16 },
      { token: "space--4", px: 24 },
      { token: "space--5", px: 32 },
      { token: "space--6", px: 40 },
      { token: "space--7", px: 48 },
      { token: "space--8", px: 64 },
    ]);
    expect(snapSpacing(40, DEFAULT_SPACING_SCALE).token).toBe("space--6");
    expect(snapSpacing(64, DEFAULT_SPACING_SCALE).token).toBe("space--8");
    expect(snapSpacing(16, DEFAULT_SPACING_SCALE).token).toBe("space--3");
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd scripts && npx vitest run test/dc/default-scales.test.ts`
Expected: FAIL — current scale has `space--1: 4`, `space--6: 48`, `space--7: 64`, `space--8: 80`, so the `toEqual` assertion fails.

- [ ] **Step 3: Correct the scale values**

In `scripts/src/dc/default-scales.ts`, replace the `DEFAULT_SPACING_SCALE` array (lines 7-16) with:

```ts
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
```

Leave the comment above it but change it to: `/** Lumos spacing values at desktop (max-clamp px), synced to lumos-foundation.css. */`

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd scripts && npx vitest run test/dc/default-scales.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full suite to confirm no pipeline regressions**

Run: `cd scripts && npm test`
Expected: PASS. (Pipeline unit tests in `merge.test.ts`, `spacing.test.ts`, `resolve-layout.test.ts` use their own inline scales, so they are unaffected.)

- [ ] **Step 6: Commit**

```bash
git add scripts/src/dc/default-scales.ts scripts/test/dc/default-scales.test.ts
git commit -m "fix: sync DEFAULT_SPACING_SCALE to Lumos foundation values"
```

---

### Task 2: Two-tier linter scaffold + px tiering + severity

**Files:**
- Modify: `scripts/src/dc/lint.ts` (full rewrite)
- Test: `scripts/test/dc/lint.test.ts`

**Interfaces:**
- Consumes: `snapSpacing` from `./spacing`; `DEFAULT_SPACING_SCALE` from `./default-scales`.
- Produces: `type Severity = "error" | "flag"`; `interface LintIssue { rule: string; match: string; severity: Severity; suggestion?: string }`; `function lintLumos(html: string): LintIssue[]`. Colors are detected and emitted as `flag` in this task; Task 3 upgrades them.

- [ ] **Step 1: Replace the lint tests with severity-aware versions**

Replace the entire body of `scripts/test/dc/lint.test.ts` with:

```ts
import { describe, it, expect } from "vitest";
import { lintLumos } from "../../src/dc/lint";

describe("lintLumos — structural rules", () => {
  it("passes clean Lumos markup with no style block", () => {
    const html = `<section class="hero_wrap u-section"><div class="hero_layout u-grid-above"></div></section>`;
    expect(lintLumos(html)).toEqual([]);
  });
  it("flags inline style attributes as error", () => {
    const issues = lintLumos(`<div style="color:red"></div>`);
    expect(issues).toContainEqual({ rule: "no-inline-style", match: "style=", severity: "error" });
  });
  it("flags >3-underscore component classes as error", () => {
    const issues = lintLumos(`<div class="card_testimonial_visual_icon_img"></div>`);
    expect(issues).toContainEqual({ rule: "max-3-underscores", match: "card_testimonial_visual_icon_img", severity: "error" });
  });
  it("does not flag utility classes for underscores", () => {
    const issues = lintLumos(`<div class="u-text-style-h2"></div>`);
    expect(issues.filter((i) => i.rule === "max-3-underscores")).toEqual([]);
  });
});

describe("lintLumos — px two-tier", () => {
  it("errors on px within tolerance of a spacing token, with suggestion", () => {
    const issues = lintLumos(`<style>.a{gap:16px}</style>`);
    expect(issues).toContainEqual({ rule: "no-px", match: "16px", severity: "error", suggestion: "use var(--_spacing---space--3)" });
  });
  it("errors on px 1px off a token (within 2px tolerance)", () => {
    const issues = lintLumos(`<style>.a{gap:25px}</style>`);
    expect(issues).toContainEqual({ rule: "no-px", match: "25px", severity: "error", suggestion: "use var(--_spacing---space--4)" });
  });
  it("flags px far from any token (no suggestion)", () => {
    const issues = lintLumos(`<style>.a{border-width:1px}</style>`);
    expect(issues).toContainEqual({ rule: "no-px", match: "1px", severity: "flag" });
  });
  it("flags px inside decorative blur/shadow even if it equals a token", () => {
    const issues = lintLumos(`<style>.a{filter:blur(40px)}</style>`);
    expect(issues).toContainEqual({ rule: "no-px", match: "40px", severity: "flag" });
    const shadow = lintLumos(`<style>.a{box-shadow:0 2px 0 #000}</style>`);
    expect(shadow).toContainEqual({ rule: "no-px", match: "2px", severity: "flag" });
  });
  it("does not check rem values", () => {
    const issues = lintLumos(`<style>.a{padding:1.5rem}</style>`);
    expect(issues.filter((i) => i.rule === "no-px")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd scripts && npx vitest run test/dc/lint.test.ts`
Expected: FAIL — current `lintLumos` returns issues without `severity`/`suggestion`, and does not tier px.

- [ ] **Step 3: Rewrite `lint.ts` with the scaffold + px tiering**

Replace the entire contents of `scripts/src/dc/lint.ts` with:

```ts
import { snapSpacing } from "./spacing";
import { DEFAULT_SPACING_SCALE } from "./default-scales";

export type Severity = "error" | "flag";

export interface LintIssue {
  rule: string;
  match: string;
  severity: Severity;
  suggestion?: string;
}

/** A px value within this many px of a spacing token must use the token. */
const SPACING_SNAP_TOL_PX = 2;

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

// Colors are emitted as flag here; Task 3 upgrades to two-tier.
function colorIssue(rule: string, match: string): LintIssue {
  return { rule, match, severity: "flag" };
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
      for (const m of value.matchAll(HEX_RE)) issues.push(colorIssue("no-hex", m[0]));
      for (const m of value.matchAll(RGBA_RE)) issues.push(colorIssue("raw-color", m[0]));
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd scripts && npx vitest run test/dc/lint.test.ts`
Expected: PASS.

- [ ] **Step 5: Confirm no other caller depends on the old return shape**

Run: `cd scripts && grep -rn "lintLumos" src/ | grep -v "lint.ts"`
Expected: no production imports (only tests / ad-hoc agent use). If a caller appears, it only reads `.rule`/`.match`, which still exist — no change needed.

- [ ] **Step 6: Commit**

```bash
git add scripts/src/dc/lint.ts scripts/test/dc/lint.test.ts
git commit -m "feat: two-tier lint scaffold with px tiering and severity"
```

---

### Task 3: Color two-tier (neutral fill → error, else flag)

**Files:**
- Modify: `scripts/src/dc/lint.ts` (replace `colorIssue` + its call sites)
- Test: `scripts/test/dc/lint.test.ts` (add a color describe block)

**Interfaces:**
- Consumes: `parseColor`, `mapColor`, `type Rgba` from `./color`; `DEFAULT_PALETTE` from `./default-scales`.
- Produces: upgraded `colorIssue(rule, match, prop, decorative)` — neutral colors in fill properties become `error` with a `color-mix`/`var` suggestion; everything else stays `flag`.

- [ ] **Step 1: Add the failing color tests**

Append to `scripts/test/dc/lint.test.ts`:

```ts
describe("lintLumos — color two-tier", () => {
  it("errors on a translucent neutral fill, suggesting color-mix on a theme var", () => {
    const issues = lintLumos(`<style>.a{color:rgba(255,255,255,0.5)}</style>`);
    expect(issues).toContainEqual({
      rule: "raw-color",
      match: "rgba(255,255,255,0.5)",
      severity: "error",
      suggestion: "use color-mix(in hsl, var(--_theme---background) 50%, transparent)",
    });
  });
  it("errors on an opaque neutral fill, suggesting a theme var", () => {
    const issues = lintLumos(`<style>.a{background:#0a0a0a}</style>`);
    expect(issues).toContainEqual({
      rule: "no-hex",
      match: "#0a0a0a",
      severity: "error",
      suggestion: "use var(--_theme---text)",
    });
  });
  it("flags an off-palette brand hex (no close theme var)", () => {
    const issues = lintLumos(`<style>.a{background:#fa5401}</style>`);
    expect(issues).toContainEqual({ rule: "no-hex", match: "#fa5401", severity: "flag" });
  });
  it("flags a desaturated brand mint as a chromatic accent", () => {
    const issues = lintLumos(`<style>.a{color:#aed8d2}</style>`);
    expect(issues).toContainEqual({ rule: "no-hex", match: "#aed8d2", severity: "flag" });
  });
  it("flags a neutral color used in a decorative shadow", () => {
    const issues = lintLumos(`<style>.a{box-shadow:0 2px 0 rgba(255,255,255,0.06)}</style>`);
    expect(issues).toContainEqual({ rule: "raw-color", match: "rgba(255,255,255,0.06)", severity: "flag" });
  });
  it("flags a neutral color in a non-fill property", () => {
    const issues = lintLumos(`<style>.a{outline-width:0;caret-color:#ffffff}</style>`);
    expect(issues).toContainEqual({ rule: "no-hex", match: "#ffffff", severity: "flag" });
  });
  it("does not flag color-mix on theme vars (no raw literal present)", () => {
    const issues = lintLumos(`<style>.a{color:color-mix(in hsl, var(--_theme---text) 30%, transparent)}</style>`);
    expect(issues.filter((i) => i.rule === "no-hex" || i.rule === "raw-color")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the color tests to verify they fail**

Run: `cd scripts && npx vitest run test/dc/lint.test.ts -t "color two-tier"`
Expected: FAIL — `colorIssue` currently returns every color as `flag` with no suggestion.

- [ ] **Step 3: Upgrade `colorIssue` and pass property context**

In `scripts/src/dc/lint.ts`, update the import line and replace the `colorIssue` function, then update its two call sites.

Change the top import block to add color helpers + palette:

```ts
import { snapSpacing } from "./spacing";
import { parseColor, mapColor, type Rgba } from "./color";
import { DEFAULT_SPACING_SCALE, DEFAULT_PALETTE } from "./default-scales";
```

Add this constant just below `SPACING_SNAP_TOL_PX`:

```ts
/** max(r,g,b) - min(r,g,b) at or below this = an achromatic neutral the theme covers. */
const NEUTRAL_CHROMA_TOL = 12;
/** Properties whose color is a solid fill the theme palette can express. */
const FILL_PROPS = new Set(["color", "background", "background-color", "border-color", "outline-color", "fill", "stroke"]);

function chroma(c: Rgba): number {
  return Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
}
```

Replace the placeholder `colorIssue` with:

```ts
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
```

Update the two call sites inside `lintLumos` to pass `prop` and `dec`:

```ts
      for (const m of value.matchAll(HEX_RE)) issues.push(colorIssue("no-hex", m[0], prop, dec));
      for (const m of value.matchAll(RGBA_RE)) issues.push(colorIssue("raw-color", m[0], prop, dec));
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd scripts && npx vitest run test/dc/lint.test.ts`
Expected: PASS (all describe blocks).

Note on the `rgba(255,255,255,0.5)` suggestion: white maps to the nearest palette anchor `--_theme---background` (the palette is light-theme anchors). The agent re-themes per section (`u-theme-dark` makes that var resolve dark); the linter only asserts "a theme var covers this neutral", which the hybrid docs (Task 5) explain.

- [ ] **Step 5: Run the full suite**

Run: `cd scripts && npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/src/dc/lint.ts scripts/test/dc/lint.test.ts
git commit -m "feat: two-tier color linting (neutral fill error, accent/decorative flag)"
```

---

### Task 4: Tailwind→Lumos mapping reference doc

**Files:**
- Create: `.claude/skills/figma-to-lumos/references/tailwind-to-lumos.md`
- Modify: `.claude/skills/figma-to-lumos/SKILL.md` (add a link in the procedure)

**Interfaces:**
- Consumes: the spacing token px values from Task 1; the type tiers from the foundation.
- Produces: a reference doc the agent reads to translate DC values directly.

- [ ] **Step 1: Create the reference doc**

Create `.claude/skills/figma-to-lumos/references/tailwind-to-lumos.md`:

```markdown
# Tailwind (DC) → Lumos mapping

`get_design_context` returns React + Tailwind with **exact** values. Translate directly with
this table. When a value has no token, drop to scoped CSS and let the two-tier linter flag it.

## Spacing (px → token)  — `gap-[Npx]`, `p*-[Npx]`, `m*-[Npx]`

| Tailwind px | Lumos token (`var(--_spacing---…)`) |
|---|---|
| 8  | space--1 |
| 12 | space--2 |
| 16 | space--3 |
| 24 | space--4 |
| 32 | space--5 |
| 40 | space--6 |
| 48 | space--7 |
| 64 | space--8 |

Snap to the nearest token within ~2px. Off-scale values (e.g. 90px, 120px) have no token →
scoped CSS (`flag`). rem geometry (bezels, radii, offsets) stays raw rem.

## Type (`text-[Npx]` → tier → tag)

| px (approx) | utility | tag |
|---|---|---|
| 64 | u-text-style-display | div/span |
| 48 | u-text-style-h1 | h1 |
| 40 | u-text-style-h2 | h2 |
| 36 | u-text-style-h3 | h3 |
| 28 | u-text-style-h4 | h4 |
| 22 | u-text-style-h5 | h5 |
| 18 | u-text-style-h6 / -large | h6 / p |
| 14–16 | u-text-style-main | p |
| 14 | u-text-style-small | p |

Pick the nearest tier; note when a size sits between tiers.

## Color

| Tailwind | Lumos |
|---|---|
| `text-white` / `text-black` / grays | theme var: `var(--_theme---text)` / `--background` / `--border` |
| `text-[rgba(255,255,255,0.5)]` (translucent neutral) | `color-mix(in hsl, var(--_theme---text) 50%, transparent)` |
| `bg-[#fa5401]` and other off-palette brand colors | scoped CSS raw value (`flag`) — no theme var |
| color inside gradient / shadow | scoped CSS (`flag`) |

Choose the section theme first (`u-theme-dark` for dark designs); neutrals then resolve correctly.

## Layout (Tailwind → Lumos)

| Tailwind | Lumos |
|---|---|
| `flex` row of ~equal children / `grid-cols-N` | `u-grid-above` + `--_column-count---value: N` |
| `flex flex-col` (vertical stack) | rely on `u-section`/`u-container` flex-column; component class only for custom gap |
| uneven row, `justify-between`, button group | scoped `display: flex` (fallback) |
| `gap-[Npx]` | `grid-column-gap`/`grid-row-gap` (grid) or `gap` (flex) = spacing token |
```

- [ ] **Step 2: Link the reference from SKILL.md**

In `.claude/skills/figma-to-lumos/SKILL.md`, in the "How it works" section right after the pipeline diagram, add this line:

```markdown
**Translate directly from the DC (Tailwind JSX) using the lookup table in
`references/tailwind-to-lumos.md`** — px→token, `text-[N]`→tier, color→var/scoped, layout→utility/flex.
```

- [ ] **Step 3: Verify the doc renders and links resolve**

Run: `cd "/Users/yuzar/Yuzar/Tools/Figma to HTML" && test -f .claude/skills/figma-to-lumos/references/tailwind-to-lumos.md && grep -q "tailwind-to-lumos.md" .claude/skills/figma-to-lumos/SKILL.md && echo OK`
Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
git add ".claude/skills/figma-to-lumos/references/tailwind-to-lumos.md" ".claude/skills/figma-to-lumos/SKILL.md"
git commit -m "docs: add Tailwind→Lumos mapping reference"
```

---

### Task 5: Hybrid rules + two-tier lint step in SKILL.md

**Files:**
- Modify: `.claude/skills/figma-to-lumos/SKILL.md` (Mapping/Notes + the Lint step)

**Interfaces:**
- Consumes: the linter severity model (Task 2-3) and the mapping reference (Task 4).
- Produces: the authoring rules a dev/agent follows; no code, no test.

- [ ] **Step 1: Add the governing principle + comment convention**

In `.claude/skills/figma-to-lumos/SKILL.md`, under the `## Notes` section, add:

```markdown
## Hybrid rule: Lumos-first → CSS-fallback → token-always

1. Structure, spacing, type, theme → Lumos classes first.
2. What Lumos can't express (gradients, glows, masks, absolute-positioned decoration, corner
   brackets, off-palette brand colors) → plain CSS in the component `<style>` block.
3. Inside that CSS, still use Lumos tokens wherever one exists (`var(--_spacing---*)`,
   `var(--radius--*)`, theme vars). Only genuinely token-less values are raw.
4. **Every scoped block with a raw value carries a one-line comment saying why there is no
   token**, e.g. `/* mint brand headline — no theme var → scoped (FLAG) */`.
5. `rem` is the escape-hatch unit for one-off geometry (bezel radius, aspect sizing, offsets).
```

- [ ] **Step 2: Update the Lint step to the two-tier model**

In `.claude/skills/figma-to-lumos/SKILL.md`, replace the existing step 5 (the `**Lint:**` paragraph) with:

```markdown
5. **Lint (two-tier):** run `lintLumos(output)` (import from `src/dc/lint`). Each issue has a
   `severity`:
   - **`error`** — a Lumos token exists for this value (the issue's `suggestion` names it). **Fix
     every `error`** and re-lint until none remain.
   - **`flag`** — no token is close (off-palette brand color, decorative blur/shadow/gradient, a
     one-off rem). These are **allowed**; keep them, and **list every `flag` in the delivery
     report** so the dev knows what was hand-written and why (cross-check the inline comment).
```

- [ ] **Step 3: Update the Output step to report flags**

In `.claude/skills/figma-to-lumos/SKILL.md`, in step 7 (Output), change the clause "list the remaining `verifyIR` flags" to:

```markdown
list both the remaining `verifyIR` flags and the linter `flag` issues (raw values that have no
token), so they know exactly what to double-check.
```

- [ ] **Step 4: Verify the edits landed**

Run: `cd "/Users/yuzar/Yuzar/Tools/Figma to HTML" && grep -q "Lumos-first" .claude/skills/figma-to-lumos/SKILL.md && grep -q "two-tier" .claude/skills/figma-to-lumos/SKILL.md && echo OK`
Expected: `OK`.

- [ ] **Step 5: Commit**

```bash
git add ".claude/skills/figma-to-lumos/SKILL.md"
git commit -m "docs: hybrid authoring rules and two-tier lint step in figma-to-lumos skill"
```

---

## Self-Review

**Spec coverage:**
- Two-tier linter (severity + suggestion, px + color, rem un-checked, decorative context) → Tasks 2-3. ✓
- Sync `default-scales.ts` spacing to foundation → Task 1. ✓
- Tailwind→Lumos reference → Task 4. ✓
- Hybrid rules + comment convention + updated lint/verify step in SKILL.md → Task 5. ✓
- Testing incl. POC-derived cases (`#aed8d2`, `#fa5401`, neutral rgba, 1px/2px, 40px blur) → folded into Tasks 2-3 as inline fixtures (the cache POC files are git-ignored, so inline fixtures replace reading those files — same intent, CI-safe). ✓
- Type scale review → intentionally OUT of scope (linter doesn't use it; pipeline untouched). Noted in spec "Out of scope" alignment; recorded here so it isn't a silent gap.

**Placeholder scan:** no TBD/TODO; every code step shows full code. ✓

**Type consistency:** `LintIssue`/`Severity` defined in Task 2 and reused unchanged in Task 3; `colorIssue` signature evolves from `(rule, match)` (Task 2) to `(rule, match, prop, decorative)` (Task 3) with both call sites updated in the same step. `snapSpacing`/`parseColor`/`mapColor`/`SpacingScale`/`Rgba`/`ThemePalette` match the real signatures in `spacing.ts`/`color.ts`. ✓
