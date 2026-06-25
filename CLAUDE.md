# CLAUDE.md — Figma to HTML

Guidance for Claude (and any AI assistant) working in this repository.

## Start of every session
1. **Read `notes/HANDOFF.md` FIRST** to get the latest context before doing anything else.
2. Skim `notes/DAILY-REPORT.md` (top entry) if you need recent day-to-day detail.

## Working language
- Primary working language: **Indonesian**. English is fine for technical terms.
- **Exception:** `notes/DAILY-REPORT.md` MUST be written in **English**.

## Code locations (enforced strictly)
- Code that runs / is tested → `scripts/`
- Reusable snippets & reference code (not run) → `scripts/reference/`
- Webflow HTML markup → `context/`
- **Never mix code with notes.** Notes live in `notes/`; code never goes there.

## Stack
- Usually **GSAP / ScrollTrigger** and **Swiper**, but stay flexible to each dev's choice.
- This project's stack is currently **undecided** — confirm before assuming a library.

## Documentation philosophy
- Record the **WHY**: decisions, pitfalls, current status.
- Do NOT log every minor change. Capture what a future dev would need to understand a choice.

## End of session (only when asked)
- `"update handoff"`      → update `notes/HANDOFF.md`
- `"update changelog"`    → add an entry to `CHANGELOG.md` (Keep a Changelog format)
- `"update daily report"` → prepend a new dated section in `notes/DAILY-REPORT.md` (**English**)

## Team skills
- Shared skills live in `.claude/skills/` and are versioned in Git.
- If a procedure repeats **3+ times**, suggest turning it into a skill.
- See `.claude/skills/README.md` for how to add one.
