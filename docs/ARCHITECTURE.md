# Architecture & Maintainer Guide

A single map for a dev who will **update or extend** this tool. For *using* it, see
[`README.md`](../README.md). For the *why* behind each subsystem, see `docs/superpowers/specs/`;
for *how it was built*, see `docs/superpowers/plans/`.

## Core principle

> **Facts are locked deterministically; the agent only translates; linter + verify guard the output.**

Text, color, spacing, and layout are extracted by **pure TypeScript** (testable, no LLM). The agent
(the `figma-to-lumos` skill) only does the **translation** to Lumos. The deterministic front half
prevents the agent from inventing text/colors/numbers; the back half (`lintLumos` + `verifyIR` +
render compare) catches mistakes.

## Module map (`scripts/src/`)

### Inference engine (`scripts/src/*.ts`) — the non-autolayout fallback
| File | Responsibility | Key exports |
|---|---|---|
| `geometry.ts` | rect math | `Rect`, `overlap1D`, `rectsOverlap`, `median`, `boundingBox` |
| `ir.ts` | layout-tree types | `LayoutBox`, `InputNode`, `LayoutDirection`, `Align`, `leafBox` |
| `banding.ts` | group children into rows/cols by overlap | `bandByAxis` |
| `classify.ts` | row/column/grid/stack + confidence | `classifyArrangement` |
| `derive.ts` | gap/padding/align/justify/sizing from geometry | `deriveGap`, `derivePadding`, `deriveAlign`, `deriveJustify`, `deriveSizing` |
| `infer-layout.ts` | recurse a node tree → annotated `LayoutBox` | `inferLayout` |

### Design-context pipeline (`scripts/src/dc/*.ts`) — the main path
| File | Responsibility | Key exports |
|---|---|---|
| `tailwind.ts` | parse a get_design_context `className` → raw facts | `parseTailwind`, `StyleFacts` |
| `spacing.ts` | px → nearest `space--N` token | `snapSpacing` |
| `color.ts` | parse + map color → nearest theme var | `parseColor`, `mapColor` |
| `type-style.ts` | font px → nearest `u-text-style-*` tier | `mapTypeStyle` |
| `parse-meta.ts` | `get_metadata` XML → tree w/ **absolute** geometry | `parseMetadata`, `MetaNode` |
| `parse-dc.ts` | `get_design_context` JSX → `{assets, nodes}` by `data-node-id` | `parseDesignContext`, `extractAssets` |
| `role.ts` | semantic role from type/geometry/asset | `detectRole`, `Role` |
| `resolve-style.ts` | `StyleFacts` → Lumos-ready `StyleInfo` (tier, theme color, alpha) | `resolveStyle`, `StyleInfo` |
| `resolve-layout.ts` | layout from DC autolayout, else inference fallback | `resolveLayout` |
| `enriched.ts` | the enriched IR types | `EnrichedNode`, `LayoutInfo`, `AssetRef` |
| `merge.ts` | join metadata + DC by node-id → `EnrichedNode` tree | `mergeDesign`, `MergeScales` |
| `default-scales.ts` | representative Lumos spacing/type/palette | `DEFAULT_SCALES` |
| `run.ts` / `cli.ts` | runnable entry (XML + JSX → IR) | `runMerge` / CLI |
| `lint.ts` | reject px/hex/inline-style/over-nested classes | `lintLumos` |
| `verify.ts` | flag guessed/approximated nodes | `verifyIR`, `DEFAULT_VERIFY_THRESHOLDS` |
| `render.ts` / `render-cli.ts` | Playwright screenshot of Lumos output | `renderToScreenshot` / CLI |
| `save-cli.ts` | save a conversion to the git-ignored `cache/<id>.html` (single file; CSS in its `<style>` block) | CLI |

## Data flow

```
get_metadata ──► parseMetadata ──► MetaNode tree (absolute rects)
get_design_context ──► parseDesignContext ──► { assets, nodes{className,text,assetVar} }
                                   │
            mergeDesign(meta, dc, DEFAULT_SCALES):
              walk MetaNode tree; per node →
                parseTailwind(className) → StyleFacts
                detectRole(type, rect, hasChildren, assetVar)
                resolveStyle(facts)   → StyleInfo   (mapTypeStyle + mapColor, alpha kept)
                resolveLayout(rect, facts, children)
                   ├─ DC flex+direction → autolayout (gap via snapSpacing)
                   └─ else → inference engine (classifyArrangement + derive*)
                asset = assets[assetVar]
              ──► EnrichedNode tree   ◄── runMerge wires this end-to-end
                                   │
        Agent (figma-to-lumos skill) translates EnrichedNode → Lumos markup
                                   │
        lintLumos(html)   then   verifyIR(tree)   then   render + vision compare vs Figma
```

The **single contract** between the deterministic half and everything downstream is
`EnrichedNode` (`enriched.ts`). Its caveats and field semantics are documented in
`docs/superpowers/specs/2026-06-25-ir-contract-notes.md` — **read that before touching the merger
or the translator.**

## Extension points (common changes → where)

- **Capture a Tailwind property we miss** (e.g. padding `pb/pt/px`): add a field to `StyleFacts` +
  a regex branch in `parseTailwind` (`tailwind.ts`) + a test; thread it through `merge.ts` /
  `resolve-*` and into the skill's mapping. (`bg-*` is already captured; **padding is not yet**.)
- **Tune the Lumos scales** (spacing/type/colors): edit `default-scales.ts`. For real per-project
  values, replace its source with a loader over `lumos-foundation.css` / `get_variable_defs`.
- **Add/loosen a lint rule:** edit `lint.ts` + a test.
- **Add a verify flag or change a threshold:** edit `verify.ts` (`DEFAULT_VERIFY_THRESHOLDS`) + a test.
- **Refine roles** (container→button, text→link, image→icon): `role.ts` needs more DC signals
  (interaction/child-shape) — see ir-contract-notes §"Plan #4/#5".
- **Change the IR→Lumos mapping** (how roles/layout/style become classes): edit
  `.claude/skills/figma-to-lumos/SKILL.md` (the agent procedure), not the deterministic modules.

## Known limitations / backlog

- **Padding** (`pb/pt/px`) is **not captured** by `parseTailwind` → silently dropped (biggest gap).
- **bg color** is captured by parser+resolver, but the translator skill mapping should consume it.
- **Multi-style text runs** (mixed weight per span) collapse to one style per node.
- **Non-Lumos fonts** (e.g. mono) aren't mapped.
- **Role taxonomy** is structural-only (no button/link/icon/list refinement).
- `colorVar` / `textStyle` are **nearest-snaps** — only safe when consumers gate on
  `colorDistance` / `textStyleResidualPx` (which `verifyIR` flags).
- **Scales** are representative defaults (foundation uses fluid `clamp()`); a real-value loader is deferred.
- **Verify visual** is **vision-based** (no pixel-diff) and has **no auto-fix loop**.
- DC parser edge cases deferred: `>`/`<`/`"` inside attribute values; `"` inside Figma layer names.

## Testing & validating changes

- `cd scripts && npm test` — 126 fast unit tests (the deterministic engine is TDD-built).
- `render.ts` needs a real browser → validated by an **integration run** (`render-cli`), not the unit suite.
- After a change: add/adjust tests, run `npm test`, and (for output-shaping changes) do a live
  conversion on a real Figma node and inspect the render.
- Design rationale and the build history live in `docs/superpowers/specs/` and `docs/superpowers/plans/`.
