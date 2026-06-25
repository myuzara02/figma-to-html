# Runnable Entry + Lumos Linter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Design-Context→Lumos pipeline runnable end-to-end with real Lumos scale defaults (`runMerge`), and add a deterministic Lumos linter that gates the agent translator's output. (The authored translator skill itself + a live run on the real Figma node are handled separately, after this plan, since they are prose + an agent run, not TDD code.)

**Architecture:** Pure TypeScript under `scripts/src/dc/`. `default-scales.ts` provides representative Lumos foundation values (the foundation file uses fluid `clamp()` + swatch indirection, so exact CSS parsing is out of scope for v1 — these are tunable starting defaults, matching the foundation's own framing). `run.ts` wires `parseMetadata` + `parseDesignContext` + `mergeDesign` into one `runMerge(xml, jsx, scales?)` call. `lint.ts` is a deterministic string linter enforcing the core Lumos output rules. This is part of modules 7–8 of the "Design Context → Lumos" subsystem (see `docs/superpowers/specs/2026-06-25-design-context-to-lumos-design.md`).

**Tech Stack:** Node.js, TypeScript (strict), Vitest. Extends the existing `scripts/` project.

## Global Constraints

- Language: **Node.js + TypeScript (strict)**. Pure functions — no I/O, no network, no external deps.
- Modules live in `scripts/src/dc/`; tests in `scripts/test/dc/`. All commands run from `scripts/`.
- `default-scales.ts` values are **tunable starting defaults** (foundation uses fluid clamps); they are injected, never assumed elsewhere.
- The linter operates on a **Lumos HTML string** and returns structured issues; it never throws on bad input.
- Reuse existing modules — do NOT duplicate merge/parse/scale logic.
- Stage only the files named in each task's commit step — never `git add -A`/`git add .`.

---

### Task 1: Default Lumos scales

**Files:**
- Create: `scripts/src/dc/default-scales.ts`
- Test: `scripts/test/dc/default-scales.test.ts`

**Interfaces:**
- Consumes: `SpacingScale` from `./spacing`; `TypeScale` from `./type-style`; `ThemePalette` from `./color`; `MergeScales` from `./merge`.
- Produces: `DEFAULT_SPACING_SCALE: SpacingScale`, `DEFAULT_TYPE_SCALE: TypeScale`, `DEFAULT_PALETTE: ThemePalette`, `DEFAULT_SCALES: MergeScales`.

- [ ] **Step 1: Write the failing test**

Create `scripts/test/dc/default-scales.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { DEFAULT_SCALES, DEFAULT_SPACING_SCALE, DEFAULT_TYPE_SCALE } from "../../src/dc/default-scales";
import { snapSpacing } from "../../src/dc/spacing";
import { mapTypeStyle } from "../../src/dc/type-style";

describe("default scales", () => {
  it("spacing scale covers space--1..8 and snaps sensibly", () => {
    expect(DEFAULT_SPACING_SCALE).toHaveLength(8);
    expect(snapSpacing(80, DEFAULT_SPACING_SCALE).token).toBe("space--8");
    expect(snapSpacing(16, DEFAULT_SPACING_SCALE).token).toBe("space--3");
  });
  it("type scale maps common sizes to the right tier", () => {
    expect(mapTypeStyle(64, DEFAULT_TYPE_SCALE).util).toBe("u-text-style-h1");
    expect(mapTypeStyle(16, DEFAULT_TYPE_SCALE).util).toBe("u-text-style-main");
    expect(mapTypeStyle(100, DEFAULT_TYPE_SCALE).util).toBe("u-text-style-display");
  });
  it("DEFAULT_SCALES bundles style + spacing", () => {
    expect(DEFAULT_SCALES.spacing).toBe(DEFAULT_SPACING_SCALE);
    expect(DEFAULT_SCALES.style.typeScale).toBe(DEFAULT_TYPE_SCALE);
    expect(DEFAULT_SCALES.style.palette.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx vitest run test/dc/default-scales.test.ts`
Expected: FAIL — cannot find module `../../src/dc/default-scales`.

- [ ] **Step 3: Implement `scripts/src/dc/default-scales.ts`**

```ts
import type { SpacingScale } from "./spacing";
import type { TypeScale } from "./type-style";
import type { ThemePalette } from "./color";
import type { MergeScales } from "./merge";

/** Representative Lumos spacing values (rem→px at a 16px base). Tunable starting defaults. */
export const DEFAULT_SPACING_SCALE: SpacingScale = [
  { token: "space--1", px: 4 },
  { token: "space--2", px: 8 },
  { token: "space--3", px: 16 },
  { token: "space--4", px: 24 },
  { token: "space--5", px: 32 },
  { token: "space--6", px: 48 },
  { token: "space--7", px: 64 },
  { token: "space--8", px: 80 },
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
```

- [ ] **Step 4: Run and verify it passes**

Run: `npx vitest run test/dc/default-scales.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/src/dc/default-scales.ts scripts/test/dc/default-scales.test.ts
git commit -m "feat: default Lumos scales (spacing, type, palette)"
```

---

### Task 2: Runnable entry — `runMerge`

**Files:**
- Create: `scripts/src/dc/run.ts`
- Test: `scripts/test/dc/run.test.ts`

**Interfaces:**
- Consumes: `parseMetadata` from `./parse-meta`; `parseDesignContext` from `./parse-dc`; `mergeDesign`/`MergeScales` from `./merge`; `DEFAULT_SCALES` from `./default-scales`; `EnrichedNode` from `./enriched`.
- Produces: `runMerge(metadataXml: string, designContextJsx: string, scales?: MergeScales): EnrichedNode` (defaults to `DEFAULT_SCALES`).

- [ ] **Step 1: Write the failing integration test**

Create `scripts/test/dc/run.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { runMerge } from "../../src/dc/run";

const XML = `
<frame id="4388:3414" name="Frame 39674" x="40" y="691" width="440" height="222">
  <vector id="4388:3415" name="Vector 6" x="0" y="0" width="440" height="0" />
  <frame id="4388:3416" name="Frame 39646" x="55" y="80" width="330" height="142">
    <text id="4388:3417" name="60+" x="0" y="0" width="330" height="70" />
    <text id="4388:3418" name="Label" x="0" y="90" width="330" height="52" />
  </frame>
</frame>`;

const DC = `const imgVector6 = "https://www.figma.com/api/mcp/asset/fdc19b8b";
export default function Frame39674() {
  return (
    <div className="flex flex-col gap-[80px] items-center justify-center" data-node-id="4388:3414">
      <div className="h-0 w-full" data-node-id="4388:3415">
        <div className="absolute"><img alt="" className="size-full" src={imgVector6} /></div>
      </div>
      <div className="flex flex-col gap-[20px] items-center justify-center" data-node-id="4388:3416">
        <p className="text-[100px] text-white" data-node-id="4388:3417">60+</p>
        <p className="text-[16px] text-[rgba(255,255,255,0.3)]" data-node-id="4388:3418">Projekte</p>
      </div>
    </div>
  );
}`;

describe("runMerge (end-to-end with default scales)", () => {
  const root = runMerge(XML, DC);

  it("produces the enriched root with autolayout column and snapped gap", () => {
    expect(root.id).toBe("4388:3414");
    expect(root.role).toBe("container");
    expect(root.layout.layout).toBe("column");
    expect(root.layout.gap).toEqual({ token: "space--8", residualPx: 0 });
  });

  it("enriches the heading with a display tier and the faded label with preserved alpha", () => {
    const inner = root.children[1];
    const [h, label] = inner.children;
    expect(h.text).toBe("60+");
    expect(h.style?.textStyle).toBe("u-text-style-display"); // 100 nearest 120 in the full default scale
    expect(h.style?.colorAlpha).toBe(1);
    expect(label.text).toBe("Projekte");
    expect(label.style?.textStyle).toBe("u-text-style-main");
    expect(label.style?.colorAlpha).toBe(0.3);
  });

  it("resolves the divider asset URL", () => {
    expect(root.children[0].role).toBe("divider");
    expect(root.children[0].asset?.url).toBe("https://www.figma.com/api/mcp/asset/fdc19b8b");
  });
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx vitest run test/dc/run.test.ts`
Expected: FAIL — cannot find module `../../src/dc/run`.

- [ ] **Step 3: Implement `scripts/src/dc/run.ts`**

```ts
import { parseMetadata } from "./parse-meta";
import { parseDesignContext } from "./parse-dc";
import { mergeDesign, type MergeScales } from "./merge";
import { DEFAULT_SCALES } from "./default-scales";
import type { EnrichedNode } from "./enriched";

/** End-to-end: Figma metadata XML + design-context JSX → enriched IR tree. */
export function runMerge(
  metadataXml: string,
  designContextJsx: string,
  scales: MergeScales = DEFAULT_SCALES,
): EnrichedNode {
  return mergeDesign(parseMetadata(metadataXml), parseDesignContext(designContextJsx), scales);
}
```

- [ ] **Step 4: Run and verify it passes**

Run: `npx vitest run test/dc/run.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/src/dc/run.ts scripts/test/dc/run.test.ts
git commit -m "feat: runMerge entry — XML + design context to enriched IR"
```

---

### Task 3: Lumos output linter

**Files:**
- Create: `scripts/src/dc/lint.ts`
- Test: `scripts/test/dc/lint.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface LintIssue { rule: string; match: string }`
  - `lintLumos(html: string): LintIssue[]` — flags: `no-px` (a `<number>px` unit), `no-hex` (a `#rgb`/`#rrggbb`/`#rrggbbaa` color), `no-inline-style` (a `style="…"` attribute), `max-3-underscores` (a non-utility component class with more than 3 underscores). Never throws.

- [ ] **Step 1: Write the failing tests**

Create `scripts/test/dc/lint.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { lintLumos } from "../../src/dc/lint";

describe("lintLumos", () => {
  it("passes clean Lumos markup", () => {
    const html = `<section class="hero_wrap u-section"><div class="hero_layout u-grid-above"></div></section>`;
    expect(lintLumos(html)).toEqual([]);
  });
  it("flags px units", () => {
    const issues = lintLumos(`<style>.a{gap:16px}</style>`);
    expect(issues).toContainEqual({ rule: "no-px", match: "16px" });
  });
  it("flags hex colors", () => {
    const issues = lintLumos(`<style>.a{color:#ff0000}</style>`);
    expect(issues).toContainEqual({ rule: "no-hex", match: "#ff0000" });
  });
  it("flags inline style attributes", () => {
    const issues = lintLumos(`<div style="color:red"></div>`);
    expect(issues.some((i) => i.rule === "no-inline-style")).toBe(true);
  });
  it("flags component classes with more than 3 underscores", () => {
    const issues = lintLumos(`<div class="card_testimonial_visual_icon_img"></div>`);
    expect(issues).toContainEqual({ rule: "max-3-underscores", match: "card_testimonial_visual_icon_img" });
  });
  it("does not flag utility classes for underscores", () => {
    const issues = lintLumos(`<div class="u-text-style-h2"></div>`);
    expect(issues.filter((i) => i.rule === "max-3-underscores")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx vitest run test/dc/lint.test.ts`
Expected: FAIL — cannot find module `../../src/dc/lint`.

- [ ] **Step 3: Implement `scripts/src/dc/lint.ts`**

```ts
export interface LintIssue {
  rule: string;
  match: string;
}

/** Deterministic Lumos output checks. Never throws. */
export function lintLumos(html: string): LintIssue[] {
  const issues: LintIssue[] = [];

  for (const m of html.matchAll(/\b\d+(?:\.\d+)?px\b/g)) {
    issues.push({ rule: "no-px", match: m[0] });
  }
  for (const m of html.matchAll(/#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3}(?:[0-9a-fA-F]{2})?)?\b/g)) {
    issues.push({ rule: "no-hex", match: m[0] });
  }
  for (const _ of html.matchAll(/\sstyle\s*=\s*"/g)) {
    issues.push({ rule: "no-inline-style", match: "style=" });
  }
  for (const m of html.matchAll(/class\s*=\s*"([^"]*)"/g)) {
    for (const cls of m[1].split(/\s+/).filter(Boolean)) {
      const isUtility = cls.startsWith("u-") || cls.startsWith("is-") || cls.startsWith("w-");
      const underscores = (cls.match(/_/g) ?? []).length;
      if (!isUtility && underscores > 3) {
        issues.push({ rule: "max-3-underscores", match: cls });
      }
    }
  }

  return issues;
}
```

- [ ] **Step 4: Run and verify it passes**

Run: `npx vitest run test/dc/lint.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS — every test file green.

- [ ] **Step 6: Commit**

```bash
git add scripts/src/dc/lint.ts scripts/test/dc/lint.test.ts
git commit -m "feat: deterministic Lumos output linter"
```

---

## Done criteria

- `npm test` from `scripts/` is fully green.
- `runMerge(xml, jsx)` produces an enriched IR tree using real Lumos default scales.
- `lintLumos(html)` flags px/hex/inline-style/over-nested-class violations.

## Next (handled directly after this plan, NOT part of this TDD plan)

- **Translator skill** `.claude/skills/figma-to-lumos/SKILL.md` (authored prose): the agent procedure — fetch Figma MCP (`get_metadata` + `get_design_context`), run `runMerge` (via a thin CLI wrapper reading the two saved files), translate the `EnrichedNode` tree → Lumos markup following `lumos-skill` conventions + the IR contract-notes policies (gap-suppression for `children < 2`, route by confidence band not `source`, threshold-gate `colorDistance`/`textStyleResidualPx`, theme selection, role→element mapping), then run `lintLumos` and fix until clean.
- **Live end-to-end run** on the real sample node (`4388:3408`) to produce and inspect actual Lumos HTML.
- **Verify visual** loop (render → screenshot → compare) — a later subsystem.
