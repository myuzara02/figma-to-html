# cache

Generated **Figma → Lumos** conversions land here — **one file per conversion**, named by the
**section** (a short kebab slug like `team`, `hero`, `stats`), so it's easy to find:

- `<section-slug>.html` — the full Lumos section in one file, with HTML and CSS clearly separated:
  the `<section>` markup under a `<!-- HTML -->` comment, then the `<style>` block under a
  `<!-- STYLE -->` comment at the bottom.

The folder's contents are **git-ignored** (local only) — only this README is tracked. Nothing here
pollutes the repo; delete freely.

**Using the output:**
- *Webflow:* paste the whole `<nodeId>.html` into an Embed (the `<style>` + markup go together).
  The Lumos foundation must already be in the Webflow project.
- *Standalone preview:* load `lumos-foundation.css` first, then the file.
