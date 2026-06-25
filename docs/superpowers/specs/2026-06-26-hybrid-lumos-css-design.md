# Hybrid Lumos + Scoped CSS — Design Spec

**Status:** Approved-pending-review
**Date:** 2026-06-26
**Author:** Claude (with @myuzara02)

## Problem

The Figma→Lumos converter prioritized "clean Lumos > pixel-perfect". In practice the
output drifted too far from Figma (mint headline rendered white, decorative phone/glow
composition dropped, brand orange lost) and each conversion was slow because the pipeline
discards the richest source (`get_design_context` Tailwind JSX) and rebuilds from a lossy IR.

Two hand-built POCs proved a better point on the spectrum — **use Lumos where it fits,
drop to scoped plain CSS where Lumos has no primitive** — and matched Figma far more closely:

- `cache/problem-hybrid.html` — recovered mint headline, "SNCKD" bg-text, glow, iPhone frames.
- `cache/team-hybrid.html` — recovered 4-corner brackets ("plek ketiplek"), brand-orange CTA, "?" ghost card.

Both kept Lumos for structure (`u-section`, `u-container`, `u-grid-above`, `u-text-style-*`,
spacing tokens, `color-mix` faded text) and emitted only a handful of raw values — each one a
case where **no token exists** (`#aed8d2`, `#fa5401`, sub-pixel offsets).

## Goal

Standardize the hybrid approach so any dev (or AI) produces the same Lumos-where-possible /
CSS-where-needed output, with raw values **visible and justified**, not silently simplified away.

## Governing principle

**Lumos-first → CSS-fallback → token-always.**

1. Structure, spacing, typography, theme → Lumos classes first.
2. What Lumos cannot express (gradients, glows, masks, absolute-positioned decoration, corner
   brackets, off-palette brand colors) → plain CSS in the component `<style>` block.
3. Inside that CSS, **still use Lumos design tokens** wherever a token exists
   (`var(--_spacing---*)`, `var(--radius--*)`, theme vars). Only genuinely token-less values
   become raw — and those are flagged.

## Deliverables

One focused code change + two documentation changes. The merge/IR pipeline is **not** touched.

### 1. Two-tier linter (code — `scripts/src/dc/lint.ts`)

Upgrade `lintLumos` from a flat reject-all scan into a **token-aware** check. Each issue carries
a severity:

```ts
type Severity = "error" | "flag";
interface LintIssue {
  rule: string;          // existing rules + the new tiered ones
  match: string;
  severity: Severity;    // NEW
  suggestion?: string;   // NEW — e.g. "use var(--_spacing---space--4)"
}
```

- **`error`** = a token exists for this value → the dev must use it. Build is "not clean" until fixed.
- **`flag`** = no token is close → raw CSS is allowed (escape-hatch), but recorded so it is auditable.

**px values** (`no-px` rule, now tiered):
- Snap the number to the spacing scale via `snapSpacing` (already in `spacing.ts`).
- `|residual| ≤ SPACING_SNAP_TOL_PX` (default **2px**) → `error`, `suggestion` = the matched token.
- otherwise → `flag` (token-less decorative value, e.g. `1px` border, `2px` shadow offset, `40px` blur).

**colors** (`no-hex` + new `raw-color` for `rgba(...)`, tiered):
- Parse via `parseColor`. A color is `error` only when it is a **neutral fill** the theme already
  covers — achromatic (`max(r,g,b) − min(r,g,b) ≤ NEUTRAL_CHROMA_TOL`, default **12**) **and** used
  in a fill property (`color`, `background`, `background-color`, `border-color`). Suggestion =
  `mapColor` nearest var + `color-mix` when alpha < 1.
- Every other color → `flag` (off-palette brand/accent like `#fa5401`/`#aed8d2`, or any color inside
  a decorative context — `box-shadow`, `text-shadow`, gradient — which is always `flag`).

**rem values**: **allowed, never checked.** rem is the deliberate escape-hatch unit for one-off
geometry (bezel radius, aspect sizing, absolute offsets). Keeping rem un-checked is what let the
POCs stay readable.

**Unchanged rules:** `no-inline-style` (always `error`), `max-3-underscores` (always `error`).

Tolerances (`SPACING_SNAP_TOL_PX`, `NEUTRAL_CHROMA_TOL`) live as named constants at the
top of `lint.ts` so they are trivially tunable later.

### 1a. Prerequisite — sync token scales to the real foundation (code — `scripts/src/dc/default-scales.ts`)

`DEFAULT_SPACING_SCALE` is out of sync with `lumos-foundation.css` (the linter's accuracy depends
on it). Correct it to the foundation's desktop (max-clamp) values:

| token | foundation max | current (wrong) |
|------|----------------|-----------------|
| space--1 | 8px (0.5rem) | 4 |
| space--2 | 12px (0.75rem) | 8 |
| space--3 | 16px (1rem) | 16 ✓ |
| space--4 | 24px (1.5rem) | 24 ✓ |
| space--5 | 32px (2rem) | 32 ✓ |
| space--6 | 40px (2.5rem) | 48 |
| space--7 | 48px (3rem) | 64 |
| space--8 | 64px (4rem) | 80 |

The `DEFAULT_TYPE_SCALE` is reviewed against the foundation in the same task and corrected if it
drifts. Existing pipeline tests that assert snapped tokens are updated to the corrected scale.

### 2. Tailwind→Lumos mapping reference (doc — skill reference file)

A lookup table so the agent translates **directly from DC** (the "DC→Lumos langsung" item):
`px → spacing token`, `text-[Npx] → u-text-style tier`, `rgba(255,255,255,a) → color-mix(theme)`,
`#brandhex → scoped CSS (flag)`, common Tailwind layout classes → Lumos utility/flex fallback.
Lives at `.claude/skills/figma-to-lumos/references/tailwind-to-lumos.md`, linked from SKILL.md.

### 3. Hybrid rules in SKILL.md (doc — `.claude/skills/figma-to-lumos/SKILL.md`)

- State the governing principle and the decision order (Lumos util → component CSS w/ tokens → raw+flag).
- **Comment convention:** every scoped-CSS block that uses a raw value must carry a one-line comment
  saying *why* there is no token (as both POCs did: `/* mint brand headline — no theme var → scoped (FLAG) */`).
- Updated lint/verify step: **fix all `error` issues**; **review and justify all `flag` issues** in the
  delivery report (they are expected, not failures).

## Architecture / data flow (unchanged shape)

```
Figma MCP (get_design_context = Tailwind JSX, get_screenshot)
        │  agent reads DC directly, using the Tailwind→Lumos table
        ▼
Hybrid Lumos markup  (Lumos classes + scoped <style>, tokens inside CSS)
        │
        ▼
lintLumos (two-tier) → fix every `error`; `flag`s allowed + reported
        │
        ▼
save-cli → cache/<section>.html   →   render-cli → compare to Figma
```

The merge → IR path (`merge.ts`, `enriched.ts`, `resolve-*`, `verify.ts`) stays as-is and remains
available; the hybrid procedure simply does not depend on it.

## Testing

- `lint.test.ts` (extend): px just inside tol → `error` + correct token suggestion; px far from any
  token → `flag`; neutral fill color → `error`; brand `#fa5401` / mint `#aed8d2` → `flag`; color in
  `box-shadow`/gradient → `flag`; rem value → no issue; inline `style=` → `error`.
- Regression: run the two POC files through the new linter and assert the issue set matches the
  expected escape-hatch list (problem: `#aed8d2`, mint glow rgba, near-black bezel, `1px`/`2px`;
  team: `#fa5401`, `2px`) with the right severities.
- `default-scales` change: update existing snap-dependent pipeline tests to the corrected scale.

## Out of scope (YAGNI)

- No changes to merge/IR/enriched. No new agent-facing helper function (the deterministic logic
  lives in the linter). No auto-fixer. No Lumos component-snippet library (possible later).

## Future adjustability

All knobs are meant to be tuned: linter tolerances are named constants; token scales live in one
file; the mapping table and hybrid rules are plain markdown. Larger changes follow the same
brainstorm → spec → plan loop; small ones are direct edits.
