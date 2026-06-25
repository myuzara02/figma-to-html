---
name: figma-to-lumos
description: Convert a Figma node (frame/section/component) into clean, responsive Lumos-framework HTML. Use when the user shares a Figma design URL or node id and wants HTML/Webflow markup, "convert this Figma to HTML", "build this section in Lumos", or "turn this frame into Webflow". Requires the Figma MCP server (get_metadata, get_design_context) and this repo's scripts/. Produces Lumos Webflow-mode markup (class names + minimal component CSS), not Tailwind.
---

# Figma → Lumos

Turn a Figma node into **clean, responsive Lumos markup** (mode Webflow). Priority:
correct, maintainable Lumos structure over pixel-perfection.

**Always load the `lumos-skill` too** — it defines the actual class conventions, the
threshold responsive system, typography/`data-number`, theming, and anti-patterns. This
skill orchestrates the pipeline; `lumos-skill` governs the markup you write.

## How it works

```
Figma MCP (get_metadata + get_design_context)
        │  save both to files
        ▼
runMerge (scripts/src/dc) → ENRICHED IR  ← deterministic; facts locked
        │
        ▼
You translate IR → Lumos markup (per lumos-skill + the gates below)
        │
        ▼
lintLumos → fix until clean
```

The deterministic part locks the **facts** (text verbatim, color→theme var, spacing→token,
layout). You only do the **translation** — never invent text, color, or numbers.

## Procedure

1. **Get the node.** Extract `fileKey` + `nodeId` from the Figma URL
   (`figma.com/design/:fileKey/:name?node-id=1-2` → nodeId `1:2`). Ask if missing.
2. **Fetch from Figma MCP** (both, for the node):
   - `get_metadata(fileKey, nodeId)` → save the XML to a temp file (e.g. scratchpad `meta.xml`).
   - `get_design_context(fileKey, nodeId, excludeScreenshot: true)` → save the JSX to `dc.jsx`.
3. **Run the merger** from `scripts/`:
   `npx tsx src/dc/cli.ts <meta.xml> <dc.jsx>` → an `EnrichedNode` tree (JSON). Read it.
   (If `tsx` is unavailable, run via `node --experimental-strip-types src/dc/cli.ts ...`.)
4. **Translate the IR → Lumos markup**, walking the tree (see Mapping + Gates below). Use
   `lumos-skill` conventions for every class, structure, and CSS rule.
5. **Lint:** run `lintLumos(output)` (import from `src/dc/lint`) on your generated HTML. Fix
   every issue (no `px`, no hex, no inline `style=`, component class ≤ 3 underscores) and re-lint
   until clean.
6. **Verify** — two passes:
   - **Structural:** run `verifyIR(tree)` (import from `src/dc/verify`) on the enriched IR → a
     report of flagged nodes (low layout confidence, high gap/type residual, far color, empty text,
     missing asset, ambiguous stack). These are the spots the pipeline **guessed or approximated**.
   - **Visual:** render your output and compare it to the real Figma image (region-level):
     1. save your generated markup to a file, then from `scripts/`:
        `npx tsx src/dc/render-cli.ts <markup.html> <render.png> 1440` (inlines the Lumos foundation,
        screenshots via Playwright; run `npx playwright install chromium` once if it's missing).
     2. `get_screenshot(fileKey, nodeId)` → the Figma image.
     3. Read both PNGs and compare **coarsely**: every block present, right order, grid-vs-stack
        correct, proportions roughly right? Focus on the `verifyIR`-flagged nodes.
   - Fix the priority flags (e.g. a high gap residual that's really section spacing, a far-color
     that needs an explicit theme override, a mis-roled node). Re-render + re-lint after fixes.
7. **Output** the Lumos markup, plus a short report listing the remaining `verifyIR` flags so the dev
   knows exactly what to double-check.

## Mapping (EnrichedNode → Lumos)

Each node has: `role`, `text`, `style`, `asset`, `layout`, `children`.

- **role `container`** → a `_wrap`/`_layout`/component div. Section roots →
  `section_wrap u-section` > `_contain u-container` > `_layout`. Inner containers → a component
  class with the layout applied (see below).
- **role `text`** → a heading (`<h1>`–`<h6>`) or `<p>` carrying `style.textStyle`
  (`u-text-style-*`). Tag level follows the tier (`u-text-style-h2` → `<h2>`, `…-main/-small`
  → `<p>`). Put the **verbatim `text`** inside. Wrap in `u-heading`/`u-text` + `data-number="N"`
  only when a max line width is needed.
- **role `divider`** → a thin `<div>` component class (e.g. `border-top` via `var(--border-width--main)`).
- **role `image`** → `<img>` with a component class; `src` = `asset.url` (snapshot it — URLs expire).
- **layout**:
  - `layout.layout === "grid"` → `u-grid-above` on the `_layout` div, set `--_column-count---value`.
  - `"row"`/`"column"` → component class with `display: flex; flex-direction: …; gap: var(--_spacing---<gap.token>)`.
  - `gap.token` → `var(--_spacing---<token>)`. **Skip gap entirely** when `children.length < 2`.
  - `align`/`justify` → `align-items`/`justify-content` (or `u-alignment-center` when centered).
- **style**: `colorVar` → `var(<colorVar>)` (only when it differs from the section's inherited
  text color); `colorAlpha < 1` → `color-mix(in hsl, var(<colorVar>) <alpha*100>%, transparent)`.
  `bgColorVar`/`bgColorAlpha` → the element's `background-color` (pick the theme class
  `u-theme-light/dark/brand` for the section instead of hardcoding when possible).

## Accuracy gates (from the IR contract notes — apply these)

- **Text/color/number are verbatim from the IR.** Never invent or paraphrase.
- **Theme selection:** the palette is light-theme anchors, so a dark design's white text maps to
  `--_theme---background`. Decide the section theme (`u-theme-dark` for dark backgrounds) and let
  the theme variables resolve — don't blindly emit the nearest var.
- **Type tier residual:** if `style.textStyleResidualPx` is large (`> ~12`), the font sits between
  tiers (e.g. 72–92px → h1) — pick the nearest sensible tier and note it; don't silently render the
  wrong size.
- **Color distance:** if `style.colorDistance` is large (`> ~40`), there's no close theme match —
  flag for review rather than painting the nearest var.
- **Confidence:** `layout.confidence` in `[0.3–0.9]` (esp. `source === "inferred"`) = lower trust;
  `1.0` means "trivially unambiguous", NOT verified. Flag low-confidence layout in your report.
- **Gap-suppression:** emit no gap on containers with `< 2` children (a snapped gap there is spurious).

## Notes

- Output is **Webflow mode**: class names + a per-component `<style>` block only for what utilities
  can't cover (gap, padding, column count, custom colors). **Never** redefine `u-*` utilities or `:root`.
- Asset URLs from Figma MCP expire (~7 days) — download/snapshot images you reference.
- Multi-style runs inside one text node collapse to one style in the IR — re-check the screenshot
  if a heading visibly mixes weights.
