# Verify Visual (Render + Vision Compare) Implementation Plan

> **For agentic workers:** This plan is mostly integration/tooling — `render.ts` needs a real
> headless browser, so it is validated by an integration run, NOT unit tests. Execute inline.

**Goal:** Let the agent see the actual rendered Lumos output and compare it to the Figma image. Add a Playwright-based renderer (`render.ts` + `render-cli.ts`) and a "Visual verify" step in the figma-to-lumos skill.

**Architecture:** `render.ts` inlines `lumos-foundation.css` + the Lumos markup into one HTML doc and screenshots it via Playwright chromium at a desktop viewport. `render-cli.ts` wires it for the skill. The comparison itself is a vision step in the skill (agent eyeballs the two PNGs, region-level). See `docs/superpowers/specs/2026-06-25-verify-visual-design.md`.

**Tech Stack:** Node.js, TypeScript, Playwright (new devDep). Extends `scripts/`.

## Global Constraints

- `render.ts` / `render-cli.ts` live in `scripts/src/dc/`. Commands run from `scripts/`.
- New devDep: `playwright` + `npx playwright install chromium` (one-time).
- Comparison is **vision (agent)**, region-level — NOT pixel-diff.
- `render.ts` is validated by an **integration run** (render the demo output, inspect the PNG), not added to the unit suite (it would make tests slow + require a browser).
- Stage only the files named in each task's commit step — never `git add -A`/`git add .`.

---

### Task 1: Install Playwright + chromium

- [ ] **Step 1: Install the dep (from `scripts/`)**
```bash
npm install -D playwright
npx playwright install chromium
```
Expected: playwright in devDependencies; chromium downloaded.

- [ ] **Step 2: Confirm the unit suite is unaffected**
Run: `npm test`
Expected: still green (no new tests yet).

- [ ] **Step 3: Commit**
```bash
git add scripts/package.json scripts/package-lock.json
git commit -m "chore: add playwright for visual render verify"
```

---

### Task 2: `render.ts` + `render-cli.ts`

**Files:**
- Create: `scripts/src/dc/render.ts`
- Create: `scripts/src/dc/render-cli.ts`

- [ ] **Step 1: Implement `scripts/src/dc/render.ts`**
```ts
import { chromium } from "playwright";

export interface RenderOptions {
  foundationCss: string;
  width?: number;
}

/** Render Lumos markup (with the foundation CSS inlined) to a full-page screenshot via chromium. */
export async function renderToScreenshot(
  markupHtml: string,
  outPath: string,
  opts: RenderOptions,
): Promise<void> {
  const width = opts.width ?? 1440;
  const doc = `<!doctype html>
<html>
  <head><meta charset="utf-8"><style>${opts.foundationCss}</style></head>
  <body>${markupHtml}</body>
</html>`;

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.setContent(doc, { waitUntil: "load" });
    await page.screenshot({ path: outPath, fullPage: true });
  } finally {
    await browser.close();
  }
}
```

- [ ] **Step 2: Implement `scripts/src/dc/render-cli.ts`**
```ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToScreenshot } from "./render";

const [, , markupPath, outPath, widthArg] = process.argv;
if (!markupPath || !outPath) {
  console.error("usage: render-cli <markup.html> <out.png> [width]");
  process.exit(1);
}

// render-cli.ts is at scripts/src/dc/ → three levels up is the repo root.
const foundationUrl = new URL("../../../.claude/skills/lumos-skill/assets/lumos-foundation.css", import.meta.url);
const foundationCss = readFileSync(fileURLToPath(foundationUrl), "utf8");
const markupHtml = readFileSync(markupPath, "utf8");
const width = widthArg ? Number(widthArg) : undefined;

await renderToScreenshot(markupHtml, outPath, { foundationCss, width });
console.log("rendered", outPath);
```

- [ ] **Step 3: Commit**
```bash
git add scripts/src/dc/render.ts scripts/src/dc/render-cli.ts
git commit -m "feat: Playwright renderer for visual verify (render.ts + CLI)"
```

---

### Task 3: Integration run on the demo output

- [ ] **Step 1: Render the demo Lumos output** (the `out.html` produced in the earlier live run, or any saved Lumos markup file):
```bash
npx tsx src/dc/render-cli.ts <path/to/out.html> <scratch>/render.png 1440
```
Expected: prints `rendered <path>`; a PNG is written.

- [ ] **Step 2: Inspect the PNG** (Read it) — confirm it is non-blank and shows the section structure (intro text, 3 stat columns with dividers + numbers). This is the validation that `render.ts` works.

---

### Task 4: Add "Visual verify" step to the skill

- [ ] **Step 1: Edit `.claude/skills/figma-to-lumos/SKILL.md`** — add a "Visual verify" sub-step in the Verify section: save the generated markup to a file, run `render-cli` to a PNG, `get_screenshot(fileKey, nodeId)` for the Figma image, and have the agent compare the two images region-by-region (block completeness, order, grid-vs-stack, rough proportions), focusing on `verifyIR`-flagged nodes; fix mismatches and re-lint.

- [ ] **Step 2: Commit** (skill + spec + plan + handoff)
```bash
git add .claude/skills/figma-to-lumos/SKILL.md docs/ notes/HANDOFF.md
git commit -m "docs+skill: visual verify step (render + vision compare)"
```

---

## Done criteria

- `render.ts` renders Lumos markup to a non-blank PNG (validated on the demo output).
- The skill has a "Visual verify" step wiring render + Figma screenshot + vision compare.
- Unit suite unchanged/green; no slow browser tests added.
