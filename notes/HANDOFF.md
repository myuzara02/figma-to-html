# Handoff — Figma to HTML

## Current Status
In progress. Figma MCP aktif & ter-auth. **Next up: Plan #2** dari subsistem "Design Context → Lumos".

## Arsitektur (disempurnakan setelah spike Figma MCP)
Spike menunjukkan `get_design_context` sudah memberi layout+style+teks (Tailwind). Jadi
subsistem lama Extract + Map→Lumos **disatukan** jadi "Design Context → Lumos" (lihat
`docs/superpowers/specs/2026-06-25-design-context-to-lumos-design.md`). Inference engine = fallback non-autolayout.

Alur: `get_design_context`+`get_metadata` → [Facts Extractor deterministik] → [Agent translator] → [Linter] → (Verify nanti).

## Status modul (8 modul, lihat spec §4)
- 1–3 **Value primitives** (Tailwind parser, spacing snapper, color mapper) ✅ **DONE** (merged, 67 tests)
- 4–6 Parsers + Merger → IR diperkaya — **Plan #2 (NEXT)**
- 7–8 Agent translator skill + Linter — Plan #3
- Inference engine (koordinat → Layout Tree) ✅ DONE (subsistem fallback)
- Verify visual — belum

## Resume instructions for next session
1. Baca spec `2026-06-25-design-context-to-lumos-design.md`, spike `2026-06-25-extract-spike-findings.md`,
   dan `2026-06-25-ir-contract-notes.md`.
2. Figma MCP: kalau tool `figma` belum ter-load, `/mcp` → authenticate figma. Sample node tetap `4388-3408`.
3. **Plan #2** = modul 4–6: DC parser (JSX blob → tree), metadata parser (XML → geometri),
   merger → IR diperkaya (pakai fixture nyata dari spike; non-autolayout → panggil inference engine).
   Pola: brainstorm/refine → writing-plans → subagent-driven.
   - Catatan akurasi dari final review Plan #1: merger HARUS meneruskan `residualPx`/`distance` ke IR
     (sinyal confidence), preserve alpha warna untuk `color-mix`, dan kenali `h-0 w-full`+img sebagai `role: divider`.

## Main Files
- `scripts/src/` → inference engine (geometry, ir, banding, classify, derive, infer-layout)
- `scripts/test/` → Vitest suite (run `npm test` from `scripts/`)
- IR contract = `scripts/src/ir.ts` (`LayoutBox`) — input ke Map→Lumos

## Done
- [x] Project scaffold + Lumos skill vendored (threshold-system version)
- [x] Inference engine (subsystem #2) — built via subagent-driven dev, reviewed, merged, pushed
- [x] Remote git: https://github.com/myuzara02/figma-to-html (main pushed)

## Next
- [ ] Aktifkan Figma MCP (`/mcp` authenticate) → spike Extract pada node 4388-3408
- [ ] Brainstorm → spec → plan → build Extract subsystem

## Key Decisions
- Stack: **Lumos** (mode Webflow), animasi GSAP/Swiper sesuai kebutuhan.
- Tool = skill `figma-to-lumos` + helper scripts (MCP + agent, approach B; no Figma mutation).
- Prioritas: **markup Lumos bersih** > pixel-perfect.
- Urutan subsistem: Inference ✅ → **Extract** → Map→Lumos → Verify → Skill orkestrasi.
- Output mode Webflow: class saja, 0 CSS untuk utility; custom hanya untuk gap.

## Pitfalls / Notes
- Figma MCP plugin = **remote** (`mcp.figma.com`), bukan Dev Mode lokal — perlu OAuth, tak perlu desktop server.
- IR sekarang **geometri saja** — `style`/`role`/teks belum ada; Extract yang mengisinya
  (lihat IR contract notes).

## Links
- Repo: https://github.com/myuzara02/figma-to-html
- Sample Figma node: 40H_Snackd / 4388-3408
