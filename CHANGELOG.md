# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]
### Added
### Changed
### Fixed

## [1.0.0] — 2026-06-25
First functional **Figma → Lumos** converter, validated end-to-end on a real Figma node
(near-identical render). Runs in Claude Code as the `figma-to-lumos` skill.

### Added
- **Inference engine** (`scripts/src/`): geometry primitives, Layout-Tree IR, banding, arrangement
  classifier (row/column/grid/stack + confidence), gap/padding/align/justify/sizing derivation,
  `inferLayout` — the deterministic fallback for non-autolayout designs.
- **Design-context pipeline** (`scripts/src/dc/`):
  - value primitives — `parseTailwind`, `snapSpacing` (px→token), `mapColor` (→theme var, alpha kept),
    `mapTypeStyle` (→`u-text-style-*`);
  - parsers — `parseMetadata` (XML→absolute geometry), `parseDesignContext` (JSX→facts by node-id);
  - enrichment — `detectRole`, `resolveStyle`, `resolveLayout`;
  - `mergeDesign` / `runMerge` → the enriched IR; `default-scales`, CLI.
- **Linter** `lintLumos` (reject px/hex/inline-style/over-nested classes).
- **Verify** — structural `verifyIR` (flags guessed/approximated nodes) + visual render
  (`render.ts`, Playwright) + vision compare step in the skill.
- **Skills** — `figma-to-lumos/SKILL.md` (the converter procedure) and vendored `lumos-skill`.
- **Docs** — README (setup + usage), `docs/ARCHITECTURE.md` (maintainer guide), design specs +
  implementation plans under `docs/superpowers/`, and the IR contract notes.
- 126 unit tests (Vitest); Playwright + tsx dev deps.

### Changed
- Initial project scaffold; stack decided as **Lumos Framework** (Webflow mode output).
- `lumos-skill` updated to the upstream threshold-system version.

### Known limitations
- Padding (`pb/pt/px`) and multi-style text runs not yet captured; role taxonomy is structural-only;
  scales are representative defaults. See `docs/ARCHITECTURE.md` → "Known limitations / backlog".
