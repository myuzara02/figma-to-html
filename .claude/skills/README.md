# Project Skills

Shared, team-owned skills for this project. They are versioned in Git, so any
dev can add or update them.

## How to add a skill
1. Create a folder: `.claude/skills/<skill-name>/`
2. Add a `SKILL.md` file with this frontmatter:
   ```
   ---
   name: <skill-name>
   description: <when to use this skill>
   ---
   ```
3. Write clear, step-by-step instructions and examples.
4. Commit and push so the whole team gets it.

## Skills in this repo
- `lumos-skill`  → Build responsive layouts with the Lumos Framework (Webflow or
  vanilla HTML/CSS/JS). Includes `assets/lumos-foundation.css` and a vanilla-mode
  reference. Snapshot of the upstream plugin (v1.0.0) so the whole team has it via Git.

## Other example skills (ideas)
- `swiper-standard`  → team's standard Swiper.js config
- `gsap-section`     → standard section animation pattern
- `daily-report`     → how to generate the daily report
