# Vanilla Mode — building a Lumos project from scratch

Read this when the user wants Lumos conventions in a plain HTML/CSS/JS project (no Webflow). The component-writing rules are unchanged from `SKILL.md`; this file only covers the project setup, the foundation, and what differs from Webflow.

## The idea

A Webflow Lumos project supplies the foundation for free — the reset, the design tokens, every `u-*` utility, and the responsive/trigger/state systems. A from-scratch project has none of that, so you ship `assets/lumos-foundation.css` once and then write component code exactly as you would in Webflow. The foundation makes every utility class and `--_*` variable the component code references actually resolve.

## Project skeleton

```
project/
├── index.html
├── css/
│   ├── lumos-foundation.css   ← copied from this skill's assets/, linked first
│   └── styles.css             ← optional: shared/page-level component styles
└── js/
    └── main.js                ← optional: shared scripts
```

Two equally valid ways to place component code:

- **Per-component blocks (recommended, mirrors the skill).** Keep each component's `<style>` as the first child and `<script>` as the last child inside its `_wrap`, exactly as the rules describe. This keeps components self-contained and copy-pasteable.
- **Collected files.** Move the same CSS/JS into `css/styles.css` and `js/main.js`. The rules don't change — only the location. Prefer per-component blocks unless the user asks otherwise.

## HTML boilerplate

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Page title</title>
    <!-- Foundation FIRST, before any component styles -->
    <link rel="stylesheet" href="css/lumos-foundation.css" />
    <!-- Optional shared styles AFTER the foundation -->
    <link rel="stylesheet" href="css/styles.css" />
  </head>
  <body>
    <!-- Sections go here. Apply a theme class to each section. -->
    <section class="hero_wrap u-section u-theme-light">
      <style>
        .hero_layout.u-grid-above {
          --_column-count---value: 2;
        }
        .hero_title {
          margin-bottom: var(--_text-style---margin-bottom);
        }
        .hero_text {
          margin-bottom: var(--_text-style---margin-bottom);
        }
      </style>
      <div class="hero_contain u-container">
        <div class="hero_layout u-grid-above">
          <div class="hero_content u-margin-trim">
            <h1 class="hero_title u-text-style-h1">Heading</h1>
            <p class="hero_text u-text-style-main">Body copy.</p>
          </div>
          <div class="hero_visual"></div>
        </div>
      </div>
    </section>
  </body>
</html>
```

## What differs from Webflow mode

These Webflow-only workarounds are **dropped** — they only exist to satisfy the Webflow Designer:

- **Combo classes can be CSS-only.** Webflow purges classes not present in the canvas, which is why dynamically-toggled combo classes (e.g. `.tabs_link_wrap.is-active`) normally need a `_hidden u-display-none` placeholder. In vanilla CSS nothing is purged, so define them directly and skip the placeholder. Still use the hidden-template clone pattern for JS-appended markup — that's a clean technique, not a workaround.
- **No empty-div `padding: 0`.** Webflow injects default padding into empty elements; the browser doesn't. Omit the fix unless you actually want padding.
- **No `.w-*` classes.** Anything keyed to `.w-richtext`, `.w-dyn-item`, `.w-condition-invisible`, `.wf-design-mode`, etc. is Webflow runtime only and has been stripped from the foundation.

Everything else is identical: class naming, fluid `rem`/`ch`/`em` sizing, no `@media`, the `threshold-*` responsive system (`u-grid-above`/`u-grid-below`, `u-order-unset-*`, `u-all-unset-*`, and named `@container threshold-*` queries), the `data-trigger`/`data-state` technique, scalable visual compositions, and the accessibility requirements.

## Customizing tokens

All brand values live in **section 2** of `lumos-foundation.css`. Keep the variable names; change the values:

- **Colors** — edit the `:root` theme block and the `.u-theme-light` / `.u-theme-dark` / `.u-theme-brand` classes. Pick a section's palette with the theme class on the `_wrap`.
- **Spacing** — `--_spacing---space--1…8` and the fluid `--_spacing---section-space--*`.
- **Type scale** — the `.u-text-style-*` rules use `clamp()` for breakpointless sizing; adjust min/max as needed.
- **Fonts** — set `--_typography---family--primary` (and load the webfont in `<head>` if it isn't a system font). Weight tokens are `--_typography---font--primary-regular|medium|bold`.
- **Radii, borders, focus, nav height** — the remaining tokens in section 2.

## Fidelity notes

The foundation is assembled from three layers with different provenance:

1. **Reset + global + state-manager** — taken from a real Lumos global style. Faithful; edit rarely.
2. **Design tokens** — reconstructed defaults chosen to look reasonable, not to match any specific brand. Expect to customize them.
3. **Utilities + responsive system** — reconstructed to satisfy the contracts the skill emits (`u-section`, `u-container`, `u-text-style-*`, the `threshold-*` grid/order utilities, etc.).

For 1:1 parity with a specific Webflow project, replace layers 2 and 3 with that project's exported **Variables** (`:root` custom properties) and **utility-class CSS**. Because the variable names match, this is a drop-in swap — paste them over sections 2 and 3 and component output is unaffected.

Responsive behavior runs entirely through the `threshold-*` system: the utilities (`u-grid-above`/`u-grid-below`, `u-order-unset-*`, `u-all-unset-*`) plus named `@container threshold-large|medium|small` queries, at the global style's own `62 / 48 / 30em` breakpoints, scoped to the `body` container. (The older `--_responsive---*` / `--flex-*` keyword-variable system has been removed from the foundation.)
