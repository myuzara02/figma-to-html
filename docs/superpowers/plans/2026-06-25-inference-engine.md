# Layout Inference Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the deterministic layout-inference engine that turns a Figma node tree (absolute coordinates) into a neutral Layout Tree (IR) with row/column/grid/stack classification, gap, padding, alignment, sizing, and a confidence score.

**Architecture:** Pure TypeScript functions, no I/O. Small focused modules (geometry → banding → classify → derive → infer-layout entry). The engine consumes a normalized `InputNode` tree and produces a `LayoutBox` tree. No Figma MCP, no browser, no LLM — fully unit-testable. This is subsystem #2 of the Figma→Lumos pipeline (see `docs/superpowers/specs/2026-06-25-figma-to-lumos-design.md`).

**Tech Stack:** Node.js, TypeScript (strict), Vitest.

## Global Constraints

- Language: **Node.js + TypeScript (strict)**. One language across all helper scripts.
- The inference engine is **pure** — no external runtime dependencies, no I/O, no network.
- All geometry is in **absolute pixel numbers** as provided by Figma (`x, y, w, h`).
- **Confidence is a number in `[0, 1]`** for every classified node.
- IR (`LayoutBox`) is the **single shared contract** consumed by later subsystems (mapping, verify). Do not change its field names casually.
- Spec path note: the spec lists `scripts/infer-layout.ts`; this plan refines that to `scripts/src/infer-layout.ts` (entry) with supporting modules under `scripts/src/`. All commands run from the `scripts/` directory.

---

### Task 1: Scaffold the `scripts/` TypeScript + Vitest project

**Files:**
- Create: `scripts/package.json`
- Create: `scripts/tsconfig.json`
- Create: `scripts/test/sanity.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a runnable test harness (`npm test` from `scripts/`) for all later tasks.

- [ ] **Step 1: Create `scripts/package.json`**

```json
{
  "name": "figma-to-lumos-scripts",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 2: Create `scripts/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["node"],
    "lib": ["ES2022"]
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 3: Install dev dependencies**

Run (from `scripts/`):
```bash
npm install -D vitest typescript @types/node
```
Expected: `node_modules/` and `package-lock.json` created, no errors.

- [ ] **Step 4: Write a sanity test**

Create `scripts/test/sanity.test.ts`:
```ts
import { describe, it, expect } from "vitest";

describe("harness", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run the test and verify it passes**

Run (from `scripts/`): `npm test`
Expected: PASS — 1 test passed.

- [ ] **Step 6: Commit**

```bash
git add scripts/package.json scripts/tsconfig.json scripts/package-lock.json scripts/test/sanity.test.ts
git commit -m "chore: scaffold scripts TS + Vitest project"
```

---

### Task 2: Geometry primitives

**Files:**
- Create: `scripts/src/geometry.ts`
- Test: `scripts/test/geometry.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface Rect { x: number; y: number; w: number; h: number }`
  - `overlap1D(aStart: number, aLen: number, bStart: number, bLen: number): number`
  - `rectsOverlap(a: Rect, b: Rect, tol?: number): boolean`
  - `median(values: number[]): number`
  - `boundingBox(rects: Rect[]): Rect`

- [ ] **Step 1: Write the failing tests**

Create `scripts/test/geometry.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { overlap1D, rectsOverlap, median, boundingBox } from "../src/geometry";

describe("overlap1D", () => {
  it("returns overlap length when segments overlap", () => {
    expect(overlap1D(0, 10, 5, 10)).toBe(5);
  });
  it("returns 0 when disjoint", () => {
    expect(overlap1D(0, 10, 20, 5)).toBe(0);
  });
});

describe("rectsOverlap", () => {
  it("true when rects overlap in both axes", () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
  });
  it("false when only touching (within tol)", () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
  });
});

describe("median", () => {
  it("odd length", () => { expect(median([3, 1, 2])).toBe(2); });
  it("even length", () => { expect(median([1, 2, 3, 4])).toBe(2.5); });
  it("empty is 0", () => { expect(median([])).toBe(0); });
});

describe("boundingBox", () => {
  it("wraps all rects", () => {
    expect(boundingBox([
      { x: 10, y: 10, w: 20, h: 20 },
      { x: 50, y: 5, w: 10, h: 40 },
    ])).toEqual({ x: 10, y: 5, w: 50, h: 40 });
  });
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx vitest run test/geometry.test.ts`
Expected: FAIL — cannot find module `../src/geometry`.

- [ ] **Step 3: Implement `scripts/src/geometry.ts`**

```ts
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Overlap length of two 1-D segments [aStart, aStart+aLen) and [bStart, bStart+bLen). 0 if disjoint. */
export function overlap1D(aStart: number, aLen: number, bStart: number, bLen: number): number {
  const start = Math.max(aStart, bStart);
  const end = Math.min(aStart + aLen, bStart + bLen);
  return Math.max(0, end - start);
}

/** Do two rects overlap in BOTH axes? `tol` ignores touching edges / sub-pixel overlap. */
export function rectsOverlap(a: Rect, b: Rect, tol = 1): boolean {
  return overlap1D(a.x, a.w, b.x, b.w) > tol && overlap1D(a.y, a.h, b.y, b.h) > tol;
}

/** Median of a numeric array. Returns 0 for empty input. */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Axis-aligned bounding box of a non-empty set of rects. */
export function boundingBox(rects: Rect[]): Rect {
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.w));
  const bottom = Math.max(...rects.map((r) => r.y + r.h));
  return { x, y, w: right - x, h: bottom - y };
}
```

- [ ] **Step 4: Run and verify it passes**

Run: `npx vitest run test/geometry.test.ts`
Expected: PASS — all geometry tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/src/geometry.ts scripts/test/geometry.test.ts
git commit -m "feat: geometry primitives (overlap, median, bounding box)"
```

---

### Task 3: IR types and `leafBox`

**Files:**
- Create: `scripts/src/ir.ts`
- Test: `scripts/test/ir.test.ts`

**Interfaces:**
- Consumes: `Rect` from `geometry`.
- Produces:
  - `type LayoutDirection = "row" | "column" | "grid" | "stack"`
  - `type Sizing = "fill" | "hug" | "fixed"`
  - `type Align = "start" | "center" | "end" | "stretch"`
  - `interface Padding { top; right; bottom; left }` (all `number`)
  - `interface InputNode { id: string; name?: string; rect: Rect; children?: InputNode[] }`
  - `interface LayoutBox { id; name?; rect; layout; gap; rowGap?; padding; align; justify; sizing: { width: Sizing; height: Sizing }; confidence; children: LayoutBox[] }`
  - `leafBox(node: InputNode): LayoutBox`

- [ ] **Step 1: Write the failing test**

Create `scripts/test/ir.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { leafBox, type InputNode } from "../src/ir";

describe("leafBox", () => {
  it("builds a childless box with neutral defaults", () => {
    const node: InputNode = { id: "n1", name: "Text", rect: { x: 0, y: 0, w: 100, h: 20 } };
    const box = leafBox(node);
    expect(box.id).toBe("n1");
    expect(box.name).toBe("Text");
    expect(box.layout).toBe("stack");
    expect(box.children).toEqual([]);
    expect(box.confidence).toBe(1);
    expect(box.padding).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    expect(box.sizing).toEqual({ width: "fixed", height: "fixed" });
  });
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx vitest run test/ir.test.ts`
Expected: FAIL — cannot find module `../src/ir`.

- [ ] **Step 3: Implement `scripts/src/ir.ts`**

```ts
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
```

- [ ] **Step 4: Run and verify it passes**

Run: `npx vitest run test/ir.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/src/ir.ts scripts/test/ir.test.ts
git commit -m "feat: Layout Tree IR types and leafBox"
```

---

### Task 4: Banding (group children into rows/columns)

**Files:**
- Create: `scripts/src/banding.ts`
- Test: `scripts/test/banding.test.ts`

**Interfaces:**
- Consumes: `Rect` from `geometry`.
- Produces:
  - `type Axis = "x" | "y"`
  - `bandByAxis<T extends { rect: Rect }>(items: T[], axis: Axis, tol?: number): T[][]` — groups items whose spans overlap on `axis` into the same band; bands ordered by position, items within a band ordered by start on that axis. Axis `"y"` → rows (vertical overlap); axis `"x"` → columns (horizontal overlap).

- [ ] **Step 1: Write the failing tests**

Create `scripts/test/banding.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { bandByAxis } from "../src/banding";

const box = (id: string, x: number, y: number, w = 10, h = 10) => ({ id, rect: { x, y, w, h } });
const ids = (bands: { id: string }[][]) => bands.map((b) => b.map((i) => i.id));

describe("bandByAxis", () => {
  it("one vertical band for a single horizontal row", () => {
    // three boxes side by side, same y → one row band
    const items = [box("a", 0, 0), box("b", 20, 0), box("c", 40, 0)];
    expect(ids(bandByAxis(items, "y"))).toEqual([["a", "b", "c"]]);
  });

  it("multiple vertical bands for a stacked column", () => {
    // three boxes stacked, increasing y → three row bands
    const items = [box("a", 0, 0), box("b", 0, 20), box("c", 0, 40)];
    expect(ids(bandByAxis(items, "y"))).toEqual([["a"], ["b"], ["c"]]);
  });

  it("groups a 2x2 grid into two row bands", () => {
    const items = [box("a", 0, 0), box("b", 20, 0), box("c", 0, 20), box("d", 20, 20)];
    expect(ids(bandByAxis(items, "y"))).toEqual([["a", "b"], ["c", "d"]]);
  });
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx vitest run test/banding.test.ts`
Expected: FAIL — cannot find module `../src/banding`.

- [ ] **Step 3: Implement `scripts/src/banding.ts`**

```ts
import type { Rect } from "./geometry";

export type Axis = "x" | "y";

/**
 * Group items into bands along an axis. Items whose spans overlap on that axis land in the
 * same band. Bands are ordered by position; items within a band are ordered by their start.
 * axis "y" → rows (group by vertical overlap); axis "x" → columns (group by horizontal overlap).
 */
export function bandByAxis<T extends { rect: Rect }>(items: T[], axis: Axis, tol = 1): T[][] {
  const start = (r: Rect) => (axis === "y" ? r.y : r.x);
  const size = (r: Rect) => (axis === "y" ? r.h : r.w);
  const sorted = [...items].sort((a, b) => start(a.rect) - start(b.rect));

  const bands: T[][] = [];
  let current: T[] = [];
  let bandEnd = -Infinity;

  for (const item of sorted) {
    const s = start(item.rect);
    const e = s + size(item.rect);
    if (current.length === 0 || s < bandEnd - tol) {
      current.push(item);
      bandEnd = Math.max(bandEnd, e);
    } else {
      bands.push(current);
      current = [item];
      bandEnd = e;
    }
  }
  if (current.length) bands.push(current);
  return bands;
}
```

- [ ] **Step 4: Run and verify it passes**

Run: `npx vitest run test/banding.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/src/banding.ts scripts/test/banding.test.ts
git commit -m "feat: band children into rows/columns by axis overlap"
```

---

### Task 5: Arrangement classifier

**Files:**
- Create: `scripts/src/classify.ts`
- Test: `scripts/test/classify.test.ts`

**Interfaces:**
- Consumes: `Rect` from `geometry`, `LayoutDirection` from `ir`, `bandByAxis` from `banding`, `rectsOverlap` from `geometry`.
- Produces:
  - `interface Classification { layout: LayoutDirection; confidence: number }`
  - `anyOverlap<T extends { rect: Rect }>(items: T[], tol?: number): boolean`
  - `classifyArrangement<T extends { rect: Rect }>(children: T[], tol?: number): Classification`

- [ ] **Step 1: Write the failing tests**

Create `scripts/test/classify.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { classifyArrangement, anyOverlap } from "../src/classify";

const box = (x: number, y: number, w = 10, h = 10) => ({ rect: { x, y, w, h } });

describe("anyOverlap", () => {
  it("detects overlapping rects", () => {
    expect(anyOverlap([box(0, 0), box(5, 5)])).toBe(true);
  });
  it("false for disjoint rects", () => {
    expect(anyOverlap([box(0, 0), box(20, 0)])).toBe(false);
  });
});

describe("classifyArrangement", () => {
  it("single child → column, full confidence", () => {
    expect(classifyArrangement([box(0, 0)])).toEqual({ layout: "column", confidence: 1 });
  });
  it("side-by-side → row", () => {
    expect(classifyArrangement([box(0, 0), box(20, 0), box(40, 0)]).layout).toBe("row");
  });
  it("stacked → column", () => {
    expect(classifyArrangement([box(0, 0), box(0, 20), box(0, 40)]).layout).toBe("column");
  });
  it("2x3 matrix → grid", () => {
    const items = [
      box(0, 0), box(20, 0), box(40, 0),
      box(0, 20), box(20, 20), box(40, 20),
    ];
    expect(classifyArrangement(items).layout).toBe("grid");
  });
  it("overlapping → stack with low confidence", () => {
    const result = classifyArrangement([box(0, 0, 30, 30), box(5, 5, 30, 30)]);
    expect(result.layout).toBe("stack");
    expect(result.confidence).toBeLessThan(0.5);
  });
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx vitest run test/classify.test.ts`
Expected: FAIL — cannot find module `../src/classify`.

- [ ] **Step 3: Implement `scripts/src/classify.ts`**

```ts
import { rectsOverlap, type Rect } from "./geometry";
import type { LayoutDirection } from "./ir";
import { bandByAxis } from "./banding";

export interface Classification {
  layout: LayoutDirection;
  confidence: number;
}

/** True if any two items overlap in both axes. */
export function anyOverlap<T extends { rect: Rect }>(items: T[], tol = 1): boolean {
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (rectsOverlap(items[i].rect, items[j].rect, tol)) return true;
    }
  }
  return false;
}

/**
 * Classify how a node's direct children are arranged.
 * Priority: trivial (<=1) → overlap (stack) → single band (row/column) → regular matrix (grid) → stack.
 */
export function classifyArrangement<T extends { rect: Rect }>(children: T[], tol = 1): Classification {
  if (children.length <= 1) return { layout: "column", confidence: 1 };
  if (anyOverlap(children, tol)) return { layout: "stack", confidence: 0.3 };

  const rows = bandByAxis(children, "y", tol); // vertical bands
  const cols = bandByAxis(children, "x", tol); // horizontal bands
  const nRows = rows.length;
  const nCols = cols.length;

  if (nRows === 1) return { layout: "row", confidence: 0.9 };
  if (nCols === 1) return { layout: "column", confidence: 0.9 };

  const regular = rows.every((r) => r.length === nCols) && nRows * nCols === children.length;
  if (regular) return { layout: "grid", confidence: 0.85 };

  return { layout: "stack", confidence: 0.4 };
}
```

- [ ] **Step 4: Run and verify it passes**

Run: `npx vitest run test/classify.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/src/classify.ts scripts/test/classify.test.ts
git commit -m "feat: classify child arrangement (row/column/grid/stack)"
```

---

### Task 6: Derive gap and padding

**Files:**
- Create: `scripts/src/derive.ts`
- Test: `scripts/test/derive.test.ts`

**Interfaces:**
- Consumes: `Rect` from `geometry`, `LayoutDirection`/`Padding` from `ir`, `bandByAxis` from `banding`, `boundingBox`/`median` from `geometry`.
- Produces:
  - `deriveGap<T extends { rect: Rect }>(children: T[], layout: LayoutDirection): { gap: number; rowGap?: number }`
  - `derivePadding(container: Rect, children: { rect: Rect }[]): Padding`

- [ ] **Step 1: Write the failing tests**

Create `scripts/test/derive.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { deriveGap, derivePadding } from "../src/derive";

const box = (x: number, y: number, w = 10, h = 10) => ({ rect: { x, y, w, h } });

describe("deriveGap", () => {
  it("row gap is the horizontal spacing between items", () => {
    // items at x=0,20,40 width 10 → gaps of 10
    expect(deriveGap([box(0, 0), box(20, 0), box(40, 0)], "row")).toEqual({ gap: 10 });
  });
  it("column gap is the vertical spacing between items", () => {
    expect(deriveGap([box(0, 0), box(0, 25), box(0, 50)], "column")).toEqual({ gap: 15 });
  });
  it("grid returns column gap and rowGap", () => {
    const items = [
      box(0, 0), box(20, 0),
      box(0, 30), box(20, 30),
    ];
    expect(deriveGap(items, "grid")).toEqual({ gap: 10, rowGap: 20 });
  });
});

describe("derivePadding", () => {
  it("is the inset from container edges to the children bounding box", () => {
    const container = { x: 0, y: 0, w: 100, h: 100 };
    const children = [box(10, 20, 30, 30), box(50, 20, 30, 30)];
    expect(derivePadding(container, children)).toEqual({ top: 20, right: 20, bottom: 50, left: 10 });
  });
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx vitest run test/derive.test.ts`
Expected: FAIL — cannot find module `../src/derive`.

- [ ] **Step 3: Implement `scripts/src/derive.ts`**

```ts
import { boundingBox, median, type Rect } from "./geometry";
import type { LayoutDirection, Padding } from "./ir";
import { bandByAxis } from "./banding";

/** Gaps between consecutive items sorted along an axis (clamped at 0). */
function consecutiveGaps<T extends { rect: Rect }>(items: T[], axis: "x" | "y"): number[] {
  const start = (r: Rect) => (axis === "x" ? r.x : r.y);
  const size = (r: Rect) => (axis === "x" ? r.w : r.h);
  const sorted = [...items].sort((a, b) => start(a.rect) - start(b.rect));
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].rect;
    const cur = sorted[i].rect;
    gaps.push(Math.max(0, start(cur) - (start(prev) + size(prev))));
  }
  return gaps;
}

export function deriveGap<T extends { rect: Rect }>(
  children: T[],
  layout: LayoutDirection,
): { gap: number; rowGap?: number } {
  if (layout === "row") return { gap: median(consecutiveGaps(children, "x")) };
  if (layout === "column") return { gap: median(consecutiveGaps(children, "y")) };
  if (layout === "grid") {
    const rows = bandByAxis(children, "y");
    const colGaps = rows.flatMap((r) => consecutiveGaps(r, "x"));
    const rowReps = rows.map((r) => r[0]); // one representative per row band
    return { gap: median(colGaps), rowGap: median(consecutiveGaps(rowReps, "y")) };
  }
  return { gap: 0 };
}

/** Padding = container rect minus children bounding box (each side clamped at 0). */
export function derivePadding(container: Rect, children: { rect: Rect }[]): Padding {
  const bb = boundingBox(children.map((c) => c.rect));
  return {
    left: Math.max(0, bb.x - container.x),
    top: Math.max(0, bb.y - container.y),
    right: Math.max(0, container.x + container.w - (bb.x + bb.w)),
    bottom: Math.max(0, container.y + container.h - (bb.y + bb.h)),
  };
}
```

- [ ] **Step 4: Run and verify it passes**

Run: `npx vitest run test/derive.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/src/derive.ts scripts/test/derive.test.ts
git commit -m "feat: derive gap (row/column/grid) and padding"
```

---

### Task 7: Derive alignment, justification, and sizing

**Files:**
- Modify: `scripts/src/derive.ts`
- Test: `scripts/test/derive-align.test.ts`

**Interfaces:**
- Consumes: `Rect` from `geometry`, `Align`/`LayoutDirection`/`Padding`/`Sizing` from `ir`.
- Produces (added to `derive.ts`):
  - `deriveAlign<T extends { rect: Rect }>(children: T[], layout: LayoutDirection): Align`
  - `deriveJustify<T extends { rect: Rect }>(container: Rect, children: T[], layout: LayoutDirection): Align`
  - `deriveSizing(child: Rect, parent: Rect, parentPadding: Padding): { width: Sizing; height: Sizing }`

Notes: `deriveAlign` reports cross-axis alignment (for `row`/`grid` the cross axis is Y, for `column` it is X). `deriveSizing` returns `"fill"` when a child spans the parent's content box on that axis, else `"fixed"`. `"hug"` derivation is intentionally deferred (the `Sizing` type keeps the variant for later use).

- [ ] **Step 1: Write the failing tests**

Create `scripts/test/derive-align.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { deriveAlign, deriveJustify, deriveSizing } from "../src/derive";

const box = (x: number, y: number, w = 10, h = 10) => ({ rect: { x, y, w, h } });

describe("deriveAlign (cross-axis)", () => {
  it("row with equal tops → start", () => {
    expect(deriveAlign([box(0, 0, 10, 10), box(20, 0, 10, 30)], "row")).toBe("start");
  });
  it("row with shared vertical centers → center", () => {
    // centers at y=15 for both: a is y0..30, b is y10..20
    expect(deriveAlign([box(0, 0, 10, 30), box(20, 10, 10, 10)], "row")).toBe("center");
  });
});

describe("deriveJustify (main-axis)", () => {
  it("equal leading and trailing space → center", () => {
    const container = { x: 0, y: 0, w: 100, h: 20 };
    expect(deriveJustify(container, [box(40, 0, 20, 10)], "row")).toBe("center");
  });
  it("small leading space → start", () => {
    const container = { x: 0, y: 0, w: 100, h: 20 };
    expect(deriveJustify(container, [box(0, 0, 20, 10)], "row")).toBe("start");
  });
});

describe("deriveSizing", () => {
  it("fills width when spanning the parent content box", () => {
    const parent = { x: 0, y: 0, w: 100, h: 100 };
    const padding = { top: 10, right: 10, bottom: 10, left: 10 };
    const child = { x: 10, y: 10, w: 80, h: 20 }; // 80 == 100-10-10
    expect(deriveSizing(child, parent, padding)).toEqual({ width: "fill", height: "fixed" });
  });
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx vitest run test/derive-align.test.ts`
Expected: FAIL — `deriveAlign` / `deriveJustify` / `deriveSizing` not exported.

- [ ] **Step 3: Append to `scripts/src/derive.ts`**

```ts
import type { Align, Sizing } from "./ir";

const CLOSE_TOL = 2;

function allClose(values: number[], tol = CLOSE_TOL): boolean {
  return Math.max(...values) - Math.min(...values) <= tol;
}

/** Cross-axis alignment of children (row/grid → Y, column → X). */
export function deriveAlign<T extends { rect: Rect }>(children: T[], layout: LayoutDirection): Align {
  if (children.length < 2) return "start";
  const cross: "x" | "y" = layout === "column" ? "x" : "y";
  const startOf = (r: Rect) => (cross === "y" ? r.y : r.x);
  const sizeOf = (r: Rect) => (cross === "y" ? r.h : r.w);
  const starts = children.map((c) => startOf(c.rect));
  const centers = children.map((c) => startOf(c.rect) + sizeOf(c.rect) / 2);
  const ends = children.map((c) => startOf(c.rect) + sizeOf(c.rect));
  if (allClose(starts)) return "start";
  if (allClose(centers)) return "center";
  if (allClose(ends)) return "end";
  return "stretch";
}

/** Main-axis distribution from leading vs trailing space (row/grid → X, column → Y). */
export function deriveJustify<T extends { rect: Rect }>(
  container: Rect,
  children: T[],
  layout: LayoutDirection,
): Align {
  if (children.length === 0) return "start";
  const main: "x" | "y" = layout === "column" ? "y" : "x";
  const startOf = (r: Rect) => (main === "y" ? r.y : r.x);
  const sizeOf = (r: Rect) => (main === "y" ? r.h : r.w);
  const cStart = main === "y" ? container.y : container.x;
  const cSize = main === "y" ? container.h : container.w;
  const sorted = [...children].sort((a, b) => startOf(a.rect) - startOf(b.rect));
  const first = sorted[0].rect;
  const last = sorted[sorted.length - 1].rect;
  const lead = startOf(first) - cStart;
  const trail = cStart + cSize - (startOf(last) + sizeOf(last));
  const TOL = 4;
  if (Math.abs(lead - trail) <= TOL) return "center";
  return lead < trail ? "start" : "end";
}

/** A child "fills" an axis when it spans the parent's content box on that axis, else "fixed". */
export function deriveSizing(
  child: Rect,
  parent: Rect,
  parentPadding: Padding,
): { width: Sizing; height: Sizing } {
  const contentW = parent.w - parentPadding.left - parentPadding.right;
  const contentH = parent.h - parentPadding.top - parentPadding.bottom;
  const TOL = 2;
  return {
    width: Math.abs(child.w - contentW) <= TOL ? "fill" : "fixed",
    height: Math.abs(child.h - contentH) <= TOL ? "fill" : "fixed",
  };
}
```

- [ ] **Step 4: Run and verify it passes**

Run: `npx vitest run test/derive-align.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS — all test files green.

- [ ] **Step 6: Commit**

```bash
git add scripts/src/derive.ts scripts/test/derive-align.test.ts
git commit -m "feat: derive align, justify, and fill/fixed sizing"
```

---

### Task 8: `inferLayout` entry — recurse and assemble the Layout Tree

**Files:**
- Create: `scripts/src/infer-layout.ts`
- Test: `scripts/test/infer-layout.test.ts`

**Interfaces:**
- Consumes: `InputNode`/`LayoutBox` and `leafBox` from `ir`; `classifyArrangement` from `classify`; `deriveGap`/`derivePadding`/`deriveAlign`/`deriveJustify`/`deriveSizing` from `derive`.
- Produces:
  - `inferLayout(node: InputNode): LayoutBox` — recursively annotates a node tree into a Layout Tree. Each child's own `sizing` is set relative to its parent's content box.

- [ ] **Step 1: Write the failing integration test**

Create `scripts/test/infer-layout.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { inferLayout } from "../src/infer-layout";
import type { InputNode } from "../src/ir";

describe("inferLayout", () => {
  it("annotates a section containing a row of three cards", () => {
    const tree: InputNode = {
      id: "section",
      name: "Section",
      rect: { x: 0, y: 0, w: 360, h: 140 },
      children: [
        { id: "c1", rect: { x: 20, y: 20, w: 100, h: 100 } },
        { id: "c2", rect: { x: 130, y: 20, w: 100, h: 100 } },
        { id: "c3", rect: { x: 240, y: 20, w: 100, h: 100 } },
      ],
    };

    const box = inferLayout(tree);
    expect(box.layout).toBe("row");
    expect(box.gap).toBe(10); // 130-(20+100)=10
    expect(box.padding).toEqual({ top: 20, right: 20, bottom: 20, left: 20 });
    expect(box.children).toHaveLength(3);
    expect(box.children[0].layout).toBe("stack"); // leaves have no children
    expect(box.children[0].id).toBe("c1");
  });

  it("returns a leaf box for a childless node", () => {
    const box = inferLayout({ id: "t", rect: { x: 0, y: 0, w: 10, h: 10 } });
    expect(box.children).toEqual([]);
    expect(box.confidence).toBe(1);
  });
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx vitest run test/infer-layout.test.ts`
Expected: FAIL — cannot find module `../src/infer-layout`.

- [ ] **Step 3: Implement `scripts/src/infer-layout.ts`**

```ts
import { leafBox, type InputNode, type LayoutBox } from "./ir";
import { classifyArrangement } from "./classify";
import { deriveAlign, deriveGap, deriveJustify, derivePadding, deriveSizing } from "./derive";

/** Recursively turn a Figma node tree into an annotated Layout Tree. */
export function inferLayout(node: InputNode): LayoutBox {
  const children = node.children ?? [];
  if (children.length === 0) return leafBox(node);

  const { layout, confidence } = classifyArrangement(children);
  const { gap, rowGap } = deriveGap(children, layout);
  const padding = derivePadding(node.rect, children);
  const align = deriveAlign(children, layout);
  const justify = deriveJustify(node.rect, children, layout);

  const childBoxes = children.map((child) => {
    const box = inferLayout(child);
    box.sizing = deriveSizing(child.rect, node.rect, padding);
    return box;
  });

  return {
    id: node.id,
    name: node.name,
    rect: node.rect,
    layout,
    gap,
    rowGap,
    padding,
    align,
    justify,
    sizing: { width: "fill", height: "hug" },
    confidence,
    children: childBoxes,
  };
}
```

- [ ] **Step 4: Run and verify it passes**

Run: `npx vitest run test/infer-layout.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS — every test file green.

- [ ] **Step 6: Commit**

```bash
git add scripts/src/infer-layout.ts scripts/test/infer-layout.test.ts
git commit -m "feat: inferLayout entry — recurse Figma tree into Layout Tree"
```

---

## Done criteria

- `npm test` from `scripts/` is fully green.
- `inferLayout(node)` returns a `LayoutBox` tree with classification, gap/rowGap, padding, align, justify, sizing, and confidence for every node.
- The IR (`scripts/src/ir.ts`) is the documented contract for the next subsystem (Map → Lumos).

## Deferred to later plans / tasks (explicit, not silent)

- **Containment reconstruction from a flat rect list** (spec §5 step 1) — this plan assumes Figma's existing parent/child tree. Reconstructing/repairing nesting from absolute rects is a later task.
- **`"hug"` sizing derivation** — only `fill`/`fixed` are derived now.
- **Vision-assisted disambiguation** for low-confidence nodes (spec §5 step 5) — belongs to the orchestration skill subsystem, which feeds confidence scores from this engine.
- **Banding refinement** — current banding uses greedy start-sorted overlap with a tolerance; an overlap-ratio threshold can replace it if real designs need it.
