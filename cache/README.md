# cache

Generated **Figma → Lumos** conversions land here — **one file per conversion**, named by the
Figma node id (`:` → `-`):

- `<nodeId>.html` — the full Lumos section: a single `<style>` block (the CSS, kept clearly at the
  top, separate from the markup) followed by the markup.

The folder's contents are **git-ignored** (local only) — only this README is tracked. Nothing here
pollutes the repo; delete freely.

**Using the output:**
- *Webflow:* paste the whole `<nodeId>.html` into an Embed (the `<style>` + markup go together).
  The Lumos foundation must already be in the Webflow project.
- *Standalone preview:* load `lumos-foundation.css` first, then the file.
