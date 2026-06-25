# Tailwind (DC) → Lumos mapping

`get_design_context` returns React + Tailwind with **exact** values. Translate directly with
this table. When a value has no token, drop to scoped CSS and let the two-tier linter flag it.

## Spacing (px → token)  — `gap-[Npx]`, `p*-[Npx]`, `m*-[Npx]`

| Tailwind px | Lumos token (`var(--_spacing---…)`) |
|---|---|
| 8  | space--1 |
| 12 | space--2 |
| 16 | space--3 |
| 24 | space--4 |
| 32 | space--5 |
| 40 | space--6 |
| 48 | space--7 |
| 64 | space--8 |

Snap to the nearest token within ~2px. Off-scale values (e.g. 90px, 120px) have no token →
scoped CSS (`flag`). rem geometry (bezels, radii, offsets) stays raw rem.

## Type (`text-[Npx]` → tier → tag)

| px (approx) | utility | tag |
|---|---|---|
| 64 | u-text-style-display | div/span |
| 48 | u-text-style-h1 | h1 |
| 40 | u-text-style-h2 | h2 |
| 36 | u-text-style-h3 | h3 |
| 28 | u-text-style-h4 | h4 |
| 22 | u-text-style-h5 | h5 |
| 18 | u-text-style-h6 / -large | h6 / p |
| 14–16 | u-text-style-main | p |
| 14 | u-text-style-small | p |

Pick the nearest tier; note when a size sits between tiers.

## Color

| Tailwind | Lumos |
|---|---|
| `text-white` / `text-black` / grays | theme var: `var(--_theme---text)` / `--background` / `--border` |
| `text-[rgba(255,255,255,0.5)]` (translucent neutral) | `color-mix(in hsl, var(--_theme---text) 50%, transparent)` |
| `bg-[#fa5401]` and other off-palette brand colors | scoped CSS raw value (`flag`) — no theme var |
| color inside gradient / shadow | scoped CSS (`flag`) |

Choose the section theme first (`u-theme-dark` for dark designs); neutrals then resolve correctly.

## Layout (Tailwind → Lumos)

| Tailwind | Lumos |
|---|---|
| `flex` row of ~equal children / `grid-cols-N` | `u-grid-above` + `--_column-count---value: N` |
| `flex flex-col` (vertical stack) | rely on `u-section`/`u-container` flex-column; component class only for custom gap |
| uneven row, `justify-between`, button group | scoped `display: flex` (fallback) |
| `gap-[Npx]` | `grid-column-gap`/`grid-row-gap` (grid) or `gap` (flex) = spacing token |
