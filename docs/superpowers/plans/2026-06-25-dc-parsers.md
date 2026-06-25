# Design-Context Parsers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the two deterministic parsers that turn raw Figma MCP output into structured data — `parseMetadata` (the `get_metadata` XML → a node tree with **absolute** geometry) and `parseDesignContext` (the `get_design_context` JSX/Tailwind blob → an asset map + a per-`data-node-id` facts map of className/text/asset).

**Architecture:** Pure, zero-dependency, hand-rolled tolerant tokenizers under `scripts/src/dc/`, tested against **real captured Figma MCP output** from the spike (file `40H_Snackd`, node `4388:3408`). The metadata XML provides the clean structural backbone (the design decision for this subsystem: structure comes from metadata, not from rebuilding a tree out of the JSX). The design-context parser is a **flat** extractor keyed by `data-node-id` — it does NOT rebuild nesting (metadata already has it). Plan #3 (the merger) will join the two by node id, apply the value primitives, and fall back to the inference engine for non-autolayout subtrees. This is Plan #2 of the "Design Context → Lumos" subsystem (see `docs/superpowers/specs/2026-06-25-design-context-to-lumos-design.md`, modules 4–5).

**Tech Stack:** Node.js, TypeScript (strict), Vitest. Extends the existing `scripts/` project.

## Global Constraints

- Language: **Node.js + TypeScript (strict)**. Pure functions — no I/O, no network, **no external/parsing dependencies** (hand-rolled tokenizers).
- Modules live in `scripts/src/dc/`; tests in `scripts/test/dc/`. All commands run from `scripts/`.
- The "Tailwind"/JSX format is **Figma MCP's intermediate output**, not a dependency — **never install Tailwind, React, or any parser package**.
- `parseMetadata` must emit **absolute** coordinates — Figma metadata `x/y` are **relative to the immediate parent**, so accumulate parent offsets; the root keeps its own `x/y` as the origin.
- `parseDesignContext` is **flat** — it returns maps keyed by `data-node-id`, never a reconstructed tree.
- Tests use **real captured MCP output** (provided verbatim in each task) as fixtures.
- Known edge cases explicitly deferred (handle later, do not block): attribute values containing `"`, `<`, or `>`; Figma layer names containing `"`.
- Stage only the files named in each task's commit step — never `git add -A`/`git add .`.

---

### Task 1: Metadata XML parser (absolute geometry)

**Files:**
- Create: `scripts/src/dc/parse-meta.ts`
- Test: `scripts/test/dc/parse-meta.test.ts`

**Interfaces:**
- Consumes: `Rect` from `../geometry` (`{ x, y, w, h }`).
- Produces:
  - `interface MetaNode { id: string; name: string; type: string; rect: Rect; children: MetaNode[] }`
  - `parseMetadata(xml: string): MetaNode` — returns the root node; `rect` is **absolute** (parent offsets accumulated); throws if no element is found.

- [ ] **Step 1: Write the failing test**

Create `scripts/test/dc/parse-meta.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseMetadata } from "../../src/dc/parse-meta";

// Real get_metadata output (stats subtree of node 4388:3408), trimmed to one stat column.
const XML = `
<frame id="4388:3413" name="Frame 39703" x="40" y="691" width="1360" height="222">
  <frame id="4388:3414" name="Frame 39674" x="0" y="0" width="440" height="222">
    <vector id="4388:3415" name="Vector 6" x="0" y="0" width="440" height="0" />
    <frame id="4388:3416" name="Frame 39646" x="55" y="80" width="330" height="142">
      <text id="4388:3417" name="60+" x="0" y="0" width="330" height="70" />
      <text id="4388:3418" name="Label" x="0" y="90" width="330" height="52" />
    </frame>
  </frame>
</frame>`;

describe("parseMetadata", () => {
  it("parses the root with its own coordinates as the origin", () => {
    const root = parseMetadata(XML);
    expect(root.id).toBe("4388:3413");
    expect(root.type).toBe("frame");
    expect(root.name).toBe("Frame 39703");
    expect(root.rect).toEqual({ x: 40, y: 691, w: 1360, h: 222 });
    expect(root.children).toHaveLength(1);
  });

  it("accumulates child offsets into absolute coordinates", () => {
    const root = parseMetadata(XML);
    const col = root.children[0]; // 4388:3414 at (0,0) rel → (40,691) abs
    expect(col.rect).toEqual({ x: 40, y: 691, w: 440, h: 222 });

    const [divider, inner] = col.children;
    expect(divider.id).toBe("4388:3415");
    expect(divider.type).toBe("vector");
    expect(divider.rect).toEqual({ x: 40, y: 691, w: 440, h: 0 });

    expect(inner.id).toBe("4388:3416"); // (55,80) rel to (40,691) → (95,771)
    expect(inner.rect).toEqual({ x: 95, y: 771, w: 330, h: 142 });
  });

  it("accumulates two levels deep for leaf text nodes", () => {
    const root = parseMetadata(XML);
    const inner = root.children[0].children[1]; // 4388:3416 at abs (95,771)
    const [t1, t2] = inner.children;
    expect(t1.id).toBe("4388:3417");
    expect(t1.type).toBe("text");
    expect(t1.rect).toEqual({ x: 95, y: 771, w: 330, h: 70 }); // (0,0) rel
    expect(t2.rect).toEqual({ x: 95, y: 861, w: 330, h: 52 }); // (0,90) rel → 771+90
  });

  it("throws when there is no element", () => {
    expect(() => parseMetadata("   ")).toThrow();
  });
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx vitest run test/dc/parse-meta.test.ts`
Expected: FAIL — cannot find module `../../src/dc/parse-meta`.

- [ ] **Step 3: Implement `scripts/src/dc/parse-meta.ts`**

```ts
import type { Rect } from "../geometry";

export interface MetaNode {
  id: string;
  name: string;
  type: string;
  rect: Rect; // absolute (parent offsets accumulated)
  children: MetaNode[];
}

/** Parse Figma `get_metadata` XML into a node tree with ABSOLUTE rects. Throws if no element is found. */
export function parseMetadata(xml: string): MetaNode {
  // Matches an opening, closing, or self-closing tag with double-quoted attributes only.
  const tagRe = /<(\/?)([A-Za-z][\w-]*)((?:\s+[\w-]+="[^"]*")*)\s*(\/?)>/g;
  const attrRe = /([\w-]+)="([^"]*)"/g;

  const stack: MetaNode[] = [];
  let root: MetaNode | null = null;
  let m: RegExpExecArray | null;

  while ((m = tagRe.exec(xml)) !== null) {
    const closing = m[1] === "/";
    const type = m[2];
    const attrStr = m[3];
    const selfClosing = m[4] === "/";

    if (closing) {
      stack.pop();
      continue;
    }

    const attrs: Record<string, string> = {};
    let a: RegExpExecArray | null;
    while ((a = attrRe.exec(attrStr)) !== null) attrs[a[1]] = a[2];

    const parent = stack[stack.length - 1];
    const baseX = parent ? parent.rect.x : 0;
    const baseY = parent ? parent.rect.y : 0;

    const node: MetaNode = {
      id: attrs.id ?? "",
      name: attrs.name ?? "",
      type,
      rect: {
        x: baseX + Number(attrs.x ?? 0),
        y: baseY + Number(attrs.y ?? 0),
        w: Number(attrs.width ?? 0),
        h: Number(attrs.height ?? 0),
      },
      children: [],
    };

    if (parent) parent.children.push(node);
    else if (!root) root = node;

    if (!selfClosing) stack.push(node);
  }

  if (!root) throw new Error("parseMetadata: no element found");
  return root;
}
```

- [ ] **Step 4: Run and verify it passes**

Run: `npx vitest run test/dc/parse-meta.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/src/dc/parse-meta.ts scripts/test/dc/parse-meta.test.ts
git commit -m "feat: metadata XML parser with absolute geometry"
```

---

### Task 2: Design-context asset extraction

**Files:**
- Create: `scripts/src/dc/parse-dc.ts`
- Test: `scripts/test/dc/parse-dc-assets.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `extractAssets(jsx: string): Record<string, string>` — maps each `const <var> = "<url>";` declaration to its URL.

- [ ] **Step 1: Write the failing test**

Create `scripts/test/dc/parse-dc-assets.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { extractAssets } from "../../src/dc/parse-dc";

describe("extractAssets", () => {
  it("maps const asset declarations to their URLs", () => {
    const jsx = `const imgVector6 = "https://www.figma.com/api/mcp/asset/abc-123";
const imgPhoto = "https://www.figma.com/api/mcp/asset/def-456";
export default function X() { return null; }`;
    expect(extractAssets(jsx)).toEqual({
      imgVector6: "https://www.figma.com/api/mcp/asset/abc-123",
      imgPhoto: "https://www.figma.com/api/mcp/asset/def-456",
    });
  });

  it("returns an empty object when there are no asset consts", () => {
    expect(extractAssets("export default function X() { return null; }")).toEqual({});
  });
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx vitest run test/dc/parse-dc-assets.test.ts`
Expected: FAIL — cannot find module `../../src/dc/parse-dc`.

- [ ] **Step 3: Implement `scripts/src/dc/parse-dc.ts`**

```ts
/** Extract `const <var> = "<url>";` asset declarations from a get_design_context blob. */
export function extractAssets(jsx: string): Record<string, string> {
  const re = /const\s+(\w+)\s*=\s*"([^"]+)"\s*;/g;
  const out: Record<string, string> = {};
  let m: RegExpExecArray | null;
  while ((m = re.exec(jsx)) !== null) out[m[1]] = m[2];
  return out;
}
```

- [ ] **Step 4: Run and verify it passes**

Run: `npx vitest run test/dc/parse-dc-assets.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/src/dc/parse-dc.ts scripts/test/dc/parse-dc-assets.test.ts
git commit -m "feat: design-context asset extraction"
```

---

### Task 3: Design-context parser — per-node className map

**Files:**
- Modify: `scripts/src/dc/parse-dc.ts`
- Test: `scripts/test/dc/parse-dc.test.ts`

**Interfaces:**
- Consumes: `extractAssets` from Task 2.
- Produces:
  - `interface DCFacts { className: string; text?: string; assetVar?: string }`
  - `interface ParsedDC { assets: Record<string, string>; nodes: Record<string, DCFacts> }`
  - `parseDesignContext(jsx: string): ParsedDC` — for now fills `assets` and, for every element carrying `data-node-id`, an entry in `nodes` with its `className` (text/asset added in Task 4).

- [ ] **Step 1: Write the failing test**

Create `scripts/test/dc/parse-dc.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseDesignContext } from "../../src/dc/parse-dc";

// Real get_design_context output for node 4388:3414 (one stat column).
const DC = `const imgVector6 = "https://www.figma.com/api/mcp/asset/fdc19b8b";

export default function Frame39674() {
  return (
    <div className="content-stretch flex flex-col gap-[80px] items-center justify-center relative size-full" data-node-id="4388:3414">
      <div className="h-0 relative shrink-0 w-full" data-node-id="4388:3415">
        <div className="absolute inset-[-0.5px_0]">
          <img alt="" className="block max-w-none size-full" src={imgVector6} />
        </div>
      </div>
      <div className="content-stretch flex flex-col gap-[20px] items-center justify-center text-center" data-node-id="4388:3416">
        <p className="font-['Aeonik:Regular'] leading-[1.1] text-[100px] text-white tracking-[-1px] w-[330px]" data-node-id="4388:3417">
          60+
        </p>
        <p className="font-['Aeonik:Medium'] text-[16px] text-[rgba(255,255,255,0.3)] tracking-[0.32px]" data-node-id="4388:3418">
          Projekte, die in skalierbare Inhaltssysteme verwandelt wurden
        </p>
      </div>
    </div>
  );
}`;

describe("parseDesignContext — className map", () => {
  it("captures the asset map", () => {
    const { assets } = parseDesignContext(DC);
    expect(assets.imgVector6).toBe("https://www.figma.com/api/mcp/asset/fdc19b8b");
  });

  it("indexes every data-node-id element by its className", () => {
    const { nodes } = parseDesignContext(DC);
    expect(Object.keys(nodes).sort()).toEqual([
      "4388:3414", "4388:3415", "4388:3416", "4388:3417", "4388:3418",
    ]);
    expect(nodes["4388:3414"].className).toContain("flex flex-col gap-[80px]");
    expect(nodes["4388:3417"].className).toContain("text-[100px]");
    expect(nodes["4388:3417"].className).toContain("font-['Aeonik:Regular']");
  });

  it("does not index wrapper elements without a data-node-id", () => {
    const { nodes } = parseDesignContext(DC);
    // the inner absolute wrapper and the <img> have no data-node-id
    expect(Object.keys(nodes)).not.toContain("");
    expect(Object.keys(nodes)).toHaveLength(5);
  });
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx vitest run test/dc/parse-dc.test.ts`
Expected: FAIL — `parseDesignContext` is not exported.

- [ ] **Step 3: Add `parseDesignContext` (className-only) to `scripts/src/dc/parse-dc.ts`**

Append below `extractAssets`:
```ts
export interface DCFacts {
  className: string;
  text?: string;
  assetVar?: string;
}
export interface ParsedDC {
  assets: Record<string, string>;
  nodes: Record<string, DCFacts>;
}

/** Read a double-quoted attribute (e.g. className="...") out of a tag's attribute string. */
function getAttr(attrStr: string, name: string): string | undefined {
  const m = attrStr.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`));
  return m ? m[1] : undefined;
}

/**
 * Parse a get_design_context blob into an asset map plus a flat per-data-node-id facts map.
 * Flat by design — structure comes from the metadata tree, not from this JSX.
 */
export function parseDesignContext(jsx: string): ParsedDC {
  const assets = extractAssets(jsx);
  const nodes: Record<string, DCFacts> = {};
  const tagRe = /<(\/?)([A-Za-z][\w]*)([^<>]*?)(\/?)>/g;

  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(jsx)) !== null) {
    const closing = m[1] === "/";
    if (closing) continue;
    const attrStr = m[3];
    const nodeId = getAttr(attrStr, "data-node-id");
    if (nodeId) {
      nodes[nodeId] = { className: getAttr(attrStr, "className") ?? "" };
    }
  }

  return { assets, nodes };
}
```

- [ ] **Step 4: Run and verify it passes**

Run: `npx vitest run test/dc/parse-dc.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/src/dc/parse-dc.ts scripts/test/dc/parse-dc.test.ts
git commit -m "feat: design-context parser — per-node className map"
```

---

### Task 4: Design-context parser — text content & asset attribution

**Files:**
- Modify: `scripts/src/dc/parse-dc.ts`
- Test: `scripts/test/dc/parse-dc-text.test.ts`

**Interfaces:**
- Consumes: `parseDesignContext` / `DCFacts` / `ParsedDC` from Task 3.
- Produces: `parseDesignContext` now also fills, per node id: `text` (the element's direct text content, trimmed) and `assetVar` (the `src={var}` of a contained image, attributed to its nearest `data-node-id` ancestor).

- [ ] **Step 1: Write the failing test**

Create `scripts/test/dc/parse-dc-text.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseDesignContext } from "../../src/dc/parse-dc";

const DC = `const imgVector6 = "https://www.figma.com/api/mcp/asset/fdc19b8b";

export default function Frame39674() {
  return (
    <div className="flex flex-col" data-node-id="4388:3414">
      <div className="h-0 w-full" data-node-id="4388:3415">
        <div className="absolute">
          <img alt="" className="size-full" src={imgVector6} />
        </div>
      </div>
      <div className="flex flex-col" data-node-id="4388:3416">
        <p className="text-[100px]" data-node-id="4388:3417">
          60+
        </p>
        <p className="text-[16px]" data-node-id="4388:3418">
          Projekte, die in skalierbare Inhaltssysteme verwandelt wurden
        </p>
      </div>
    </div>
  );
}`;

describe("parseDesignContext — text & asset", () => {
  it("captures the trimmed text content of leaf text nodes", () => {
    const { nodes } = parseDesignContext(DC);
    expect(nodes["4388:3417"].text).toBe("60+");
    expect(nodes["4388:3418"].text).toBe("Projekte, die in skalierbare Inhaltssysteme verwandelt wurden");
  });

  it("attributes an image src to its nearest data-node-id ancestor", () => {
    const { nodes } = parseDesignContext(DC);
    // the <img> sits inside an un-id'd wrapper inside 4388:3415
    expect(nodes["4388:3415"].assetVar).toBe("imgVector6");
  });

  it("leaves text undefined for container nodes with no direct text", () => {
    const { nodes } = parseDesignContext(DC);
    expect(nodes["4388:3416"].text).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx vitest run test/dc/parse-dc-text.test.ts`
Expected: FAIL — `text` / `assetVar` are undefined (not yet captured).

- [ ] **Step 3: Replace `parseDesignContext` in `scripts/src/dc/parse-dc.ts` with the full version**

Replace the entire `parseDesignContext` function (keep `extractAssets`, `getAttr`, and the interfaces) with:
```ts
/** Read an expression attribute (e.g. src={imgVar}) out of a tag's attribute string. */
function getExprAttr(attrStr: string, name: string): string | undefined {
  const m = attrStr.match(new RegExp(`(?:^|\\s)${name}=\\{(\\w+)\\}`));
  return m ? m[1] : undefined;
}

/**
 * Parse a get_design_context blob into an asset map plus a flat per-data-node-id facts map
 * (className, direct text content, and any contained image asset). Flat by design — structure
 * comes from the metadata tree, not from this JSX.
 */
export function parseDesignContext(jsx: string): ParsedDC {
  const assets = extractAssets(jsx);
  const nodes: Record<string, DCFacts> = {};
  const stack: Array<{ nodeId?: string }> = [];
  const tagRe = /<(\/?)([A-Za-z][\w]*)([^<>]*?)(\/?)>/g;

  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(jsx)) !== null) {
    // Text between the previous tag and this one belongs to the nearest data-node-id ancestor.
    const between = jsx.slice(lastIndex, m.index).trim();
    if (between) {
      const ownerId = findOwner(stack);
      if (ownerId && nodes[ownerId]) {
        nodes[ownerId].text = nodes[ownerId].text ? `${nodes[ownerId].text} ${between}` : between;
      }
    }
    lastIndex = tagRe.lastIndex;

    const closing = m[1] === "/";
    const attrStr = m[3];
    const selfClosing = m[4] === "/";

    if (closing) {
      stack.pop();
      continue;
    }

    const nodeId = getAttr(attrStr, "data-node-id");
    if (nodeId) nodes[nodeId] = { className: getAttr(attrStr, "className") ?? "" };

    const assetVar = getExprAttr(attrStr, "src");
    if (assetVar) {
      const target = nodeId ?? findOwner(stack);
      if (target && nodes[target]) nodes[target].assetVar = assetVar;
    }

    if (!selfClosing) stack.push({ nodeId });
  }

  return { assets, nodes };
}

/** Nearest ancestor on the stack that carries a data-node-id. */
function findOwner(stack: Array<{ nodeId?: string }>): string | undefined {
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i].nodeId) return stack[i].nodeId;
  }
  return undefined;
}
```

- [ ] **Step 4: Run and verify both DC test files pass**

Run: `npx vitest run test/dc/parse-dc.test.ts test/dc/parse-dc-text.test.ts`
Expected: PASS — Task 3 className tests still green, new text/asset tests green.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS — every test file green (value primitives + both parsers).

- [ ] **Step 6: Commit**

```bash
git add scripts/src/dc/parse-dc.ts scripts/test/dc/parse-dc-text.test.ts
git commit -m "feat: design-context parser — text content and asset attribution"
```

---

## Done criteria

- `npm test` from `scripts/` is fully green.
- `parseMetadata` returns a node tree with absolute geometry; `parseDesignContext` returns `{ assets, nodes }` keyed by `data-node-id` with className/text/asset.
- Both are validated against real captured Figma MCP output.

## Deferred to later plans (explicit, not silent)

- **Merger → enriched IR** (module 6): join `MetaNode` tree + `ParsedDC` by node id, apply `parseTailwind`/`snapSpacing`/`mapColor`, derive `role`, detect autolayout vs absolute, fall back to the inference engine for absolute subtrees, and thread `residualPx`/`distance`/`confidence` + color alpha into the IR — **Plan #3**.
- **Agent translator skill + linter** (modules 7–8) — Plan #4.
- Edge cases: attribute values containing `"`/`<`/`>`, layer names containing `"`, `text-[length:...]` unit-hinted brackets, multi-`src` elements — add when a real design needs them; log when skipped.
