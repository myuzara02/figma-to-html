# Figma → Lumos (Figma to HTML)

Convert a Figma node (frame / section / component) into clean, responsive **Lumos-framework**
HTML — ready to paste into Webflow. The tool runs inside **Claude Code** as a skill: it pulls the
design from the Figma MCP, locks the facts deterministically, translates to Lumos, then lints and
visually verifies the result.

> **Design philosophy:** clean, maintainable Lumos markup over pixel-perfection. Facts (text,
> color, spacing, layout) are extracted **deterministically**; the agent only **translates**;
> a linter + structural/visual verify guard the output.

## What it does (pipeline)

```
Figma node
  │  get_metadata + get_design_context  (Figma MCP)
  ▼
runMerge  →  Enriched IR  (deterministic: structure, role, text, color→theme, spacing→token, layout)
  │
  ▼
Agent translates IR → Lumos markup  (Webflow mode, per the lumos-skill conventions)
  │
  ▼
lintLumos  (reject px / hex / inline-style / over-nested classes)
  │
  ▼
Verify   →  verifyIR (flags guessed/approximated nodes)  +  render (Playwright) vs Figma (vision)
  │
  ▼
Clean Lumos HTML  +  a report of what to double-check
```

If a Figma frame uses **auto-layout**, layout comes straight from the design context. If it does
**not**, a deterministic **inference engine** reconstructs rows/columns/grids from geometry.

## Stack

- **Output:** Lumos Framework (by Timothy Ricks) — utility (`u-`) + component classes, fluid /
  breakpointless sizing, no media queries. Webflow mode (class names + minimal component CSS).
- **Engine:** Node.js + TypeScript (pure, tested with Vitest) in `scripts/src/dc/`.
- **Render verify:** Playwright (headless chromium).
- **Runtime:** Claude Code (the agent) + the Figma MCP server.

---

## Prerequisites

- **Claude Code** — this tool is an agent **skill**, not a standalone app/button.
- **Access to the Figma file** you want to convert (via your Figma account).
- **Node.js** 18+ (developed on v22).

## One-time setup

```bash
# 1. Clone
git clone https://github.com/myuzara02/figma-to-html.git
cd figma-to-html

# 2. Install engine deps (vitest, tsx, playwright)
cd scripts && npm install

# 3. Install the headless browser used by visual verify (one-time)
npx playwright install chromium
```

Then, for the Figma connection (this plugin is per-machine — it is NOT in the repo):

```bash
claude plugin install figma@claude-plugins-official
```

…and inside Claude Code run **`/mcp` → authenticate `figma`** (OAuth login).

The two skills this tool needs — `lumos-skill` and `figma-to-lumos` — **ship with the repo**
(`.claude/skills/`), so they're available automatically once you open the project in Claude Code.

**Ready check:** in Claude Code you should see the `figma-to-lumos` skill, and the `figma` MCP
tools (e.g. `get_metadata`) should be loaded.

---

## Usage

### Main flow (conversational — recommended)

Open the repo in Claude Code and ask the agent, giving a **Figma node URL**:

> "Convert this Figma to Lumos: `https://figma.com/design/<fileKey>/<name>?node-id=1-2`"

The `figma-to-lumos` skill runs automatically:

1. fetches `get_metadata` + `get_design_context` for the node,
2. `runMerge` → the enriched IR,
3. translates IR → **Lumos markup** (Webflow mode),
4. `lintLumos` until clean,
5. **Verify** — `verifyIR` (flags the guessed bits) + renders your output with Playwright and
   compares it to the Figma image (region-level),
6. returns the **Lumos HTML** plus a short list of nodes to double-check.

Paste the markup into Webflow (or use it as standalone HTML/CSS).

### Manual CLI (optional — run pieces directly)

From `scripts/`, after saving the Figma MCP outputs to files:

```bash
npx tsx src/dc/cli.ts meta.xml dc.jsx                  # → enriched IR (JSON)
npx tsx src/dc/render-cli.ts out.html render.png 1440  # → screenshot of your Lumos output
npm test                                               # run the unit suite (126 tests)
```

### Reading the output

`verifyIR` flags the spots the pipeline **approximated** — e.g. a gap that snapped far from a token
(often real section spacing, not a flex gap), a font size between tiers, or a color with no close
theme match. Treat those as "review here." Everything else (verbatim text, theme colors, snapped
tokens) is locked by the deterministic engine.

---

## Project structure

```
figma-to-html/
├── README.md                       # this file
├── CLAUDE.md                       # working rules for AI assistants
├── .claude/skills/
│   ├── lumos-skill/                # Lumos conventions (vendored; ships with the repo)
│   └── figma-to-lumos/SKILL.md     # the converter procedure the agent follows
├── scripts/                        # the engine (Node + TS, Vitest)
│   ├── src/
│   │   ├── geometry/ir/classify/derive/infer-layout.ts   # inference engine (non-autolayout fallback)
│   │   └── dc/                     # design-context pipeline:
│   │       ├── tailwind, spacing, color, type-style       #   value primitives
│   │       ├── parse-meta, parse-dc                        #   parsers (metadata XML / DC JSX)
│   │       ├── role, resolve-style, resolve-layout, merge  #   enrichment + merger → IR
│   │       ├── default-scales, run, cli                    #   runnable entry
│   │       ├── lint, verify                                #   linter + structural verify
│   │       └── render, render-cli                          #   Playwright visual verify
│   └── test/                       # Vitest unit tests (run `npm test`)
├── docs/superpowers/               # design specs + implementation plans (the "why")
├── context/                        # reference Webflow markup (drop exports here)
└── notes/
    ├── HANDOFF.md                  # latest context — read first each session
    └── DAILY-REPORT.md             # dated log (English only)
```

## Development

- Tests: `cd scripts && npm test` (Vitest; 126 unit tests). The render module is validated by an
  integration run, not the unit suite (it needs a real browser).
- The engine is pure/deterministic and TDD-built; the translator (agent) is guarded by the linter +
  verify, not unit tests.
- Design rationale lives in `docs/superpowers/specs/` and `docs/superpowers/plans/`.

## How context is shared

Everything is shared via Git:

```bash
git pull        # before you start
# ...work...
git push        # share with the team
```

`notes/` and all `.md` files are tracked — they're the shared source of truth. Start each session
by reading `notes/HANDOFF.md`.

## Obsidian (optional)

If you use [Obsidian](https://obsidian.md), open the **repo root** as the vault (not a subfolder)
so it can see `notes/`. Don't commit a nested vault folder — your personal `.obsidian/` config is
git-ignored.
