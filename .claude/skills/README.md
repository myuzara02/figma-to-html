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

## Example skills
- `swiper-standard`  → team's standard Swiper.js config
- `gsap-section`     → standard section animation pattern
- `daily-report`     → how to generate the daily report
