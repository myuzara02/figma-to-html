# Figma to HTML

## Overview
Project workspace for building and testing front-end interactions (Webflow-based markup
plus custom JavaScript). This repo is the shared source of truth for code, reference
markup, and team notes.

## Stack
- **Animation:** usually GSAP / ScrollTrigger (flexible per dev's choice)
- **Sliders:** usually Swiper
- *Current project stack: undecided — confirm before adding a library.*

## Folder structure
```
project/
├── README.md            # this file
├── CHANGELOG.md         # notable changes (Keep a Changelog)
├── CLAUDE.md            # working rules for AI assistants
├── .gitignore
├── .claude/
│   └── skills/          # shared, team-owned skills (versioned in Git)
│       └── README.md
├── scripts/             # code that runs / is tested
│   └── reference/       # reusable snippets / reference code (not run)
├── context/             # reference HTML markup from Webflow
└── notes/
    ├── HANDOFF.md       # latest context — read this first each session
    └── DAILY-REPORT.md  # dated daily log (English only)
```

### Where things go
- Code that runs / is tested → `scripts/`
- Reusable snippets & reference code → `scripts/reference/`
- Webflow HTML markup → `context/`
- Notes only → `notes/` (never mix code into notes)

## How to test
Use **CodeSandbox** to run and preview code:
1. Create or open the project's CodeSandbox.
2. Copy the relevant file(s) from `scripts/` into the sandbox.
3. Paste any required Webflow markup from `context/`.
4. Preview, iterate, then copy working code back into `scripts/`.
5. Add the live CodeSandbox link to `notes/HANDOFF.md` under **Links**.

## How context is shared
Everything is shared via Git. Typical flow:
```bash
git pull        # get the latest before you start
# ...work...
git add -A
git commit -m "..."
git push        # share with the team
```
The `notes/` folder and all `.md` files are tracked — they are the shared source of truth.

## Obsidian (optional)
If you use [Obsidian](https://obsidian.md), open the **repo root** as the vault (not a
subfolder) so it can see `notes/`. Do **not** commit a nested vault folder. Your personal
`.obsidian/` config is git-ignored, so it stays local to you.
