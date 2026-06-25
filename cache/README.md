# cache

Generated **Figma → Lumos** conversion outputs land here. Each conversion writes two files,
named by the Figma node id (`:` → `-`):

- `<nodeId>.html` — the Lumos section markup (no inline `<style>`).
- `<nodeId>.css` — the component CSS for that section.

The folder's contents are **git-ignored** (local only) — only this README is tracked. Nothing
here pollutes the repo; delete freely.

**Using the output:**
- *Webflow:* paste `<nodeId>.html` into an Embed; put `<nodeId>.css` into page/site custom code
  (or its own Embed `<style>`). The Lumos foundation must already be in the Webflow project.
- *Standalone preview:* link the CSS from the HTML and include `lumos-foundation.css` first.
