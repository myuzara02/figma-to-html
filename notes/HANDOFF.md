# Handoff — Figma to HTML

## Current Status
In progress. Figma MCP aktif & ter-auth. **Next up: Plan #2** dari subsistem "Design Context → Lumos".

## Arsitektur (disempurnakan setelah spike Figma MCP)
Spike menunjukkan `get_design_context` sudah memberi layout+style+teks (Tailwind). Jadi
subsistem lama Extract + Map→Lumos **disatukan** jadi "Design Context → Lumos" (lihat
`docs/superpowers/specs/2026-06-25-design-context-to-lumos-design.md`). Inference engine = fallback non-autolayout.

Alur: `get_design_context`+`get_metadata` → [Facts Extractor deterministik] → [Agent translator] → [Linter] → (Verify nanti).

## Status modul (8 modul, lihat spec §4)
- 1–3 **Value primitives** (Tailwind parser, spacing snapper, color mapper) ✅ **DONE** (merged+pushed, 67 tests)
- 4–5 **Parsers** (`parse-meta.ts` metadata XML→tree absolut, `parse-dc.ts` DC JSX→{assets,nodes}) ✅ **DONE** (merged, 79 tests)
- 6 **Merger → IR diperkaya** — **Plan #3 (NEXT)**
- 7–8 Agent translator skill + Linter — Plan #4
- Inference engine (koordinat → Layout Tree) ✅ DONE (subsistem fallback)
- Verify visual — belum

## Resume instructions for next session (Plan #3 = Merger, modul 6)
1. Baca spec `2026-06-25-design-context-to-lumos-design.md` (§4 modul 6, §6 error handling) + `2026-06-25-ir-contract-notes.md`.
2. Merger menyusuri pohon `MetaNode` (dari `parseMetadata`) dan lookup `ParsedDC.nodes[id]` (dari `parseDesignContext`).
   Output = IR diperkaya (`LayoutBox` + `text`/`style`/`role`/`asset`/sinyal confidence).
3. **Catatan akurasi dari final review Plan #2 (WAJIB diperhatikan di merger):**
   - **ID match aman:** `MetaNode.id` & key `ParsedDC.nodes` sama-sama colon form (`"4388:3413"`) → `nodes[meta.id]` langsung resolve. Jangan over-normalize.
   - **Missing-node WAJIB ditangani dua arah:** banyak node metadata TANPA entri DC → fallback ke metadata-only (geometri+type) + inference engine. Jangan asумsikan entri DC selalu ada.
   - **`MetaNode` = superset `InputNode`** → suapkan subtree metadata langsung ke `inferLayout` untuk kasus absolute/non-autolayout.
   - **Role detection:** gabung `MetaNode.type` (text/vector/frame) + DC className + ada/tidaknya `assetVar`. JANGAN andalkan `MetaNode.name` (generik); hanya nama node text = isi teksnya.
   - **Aset:** `nodes[id].assetVar` → key ke `assets[assetVar]` (URL). SVG `<use href>` belum ditangkap (hanya `src=`) → fallback `type==="vector"`. URL kedaluwarsa ~7 hari → download/snapshot, jangan simpan URL mentah.
   - **Threading:** merger yang isi `confidence` (dari `classifyArrangement`), alpha warna (dari `parseTailwind`/`mapColor` atas `rgba(...)` di className), `residualPx`/`distance` (dari value primitives).
   - Test merger pakai fixture yang parser tak cakup: node ada di metadata tapi tidak di DC, dan node vector/svg.
4. Figma MCP: kalau tool `figma` belum ter-load, `/mcp` → authenticate. Sample node `4388-3408`.

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
