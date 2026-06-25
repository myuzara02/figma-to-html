# Handoff — Figma to HTML

## Current Status
**v1 END-TO-END BEKERJA.** `Figma node → IR → Lumos (lint bersih)` sudah terbukti pada node nyata
`4388:3408` (file 40H_Snackd). Sisa: penyempurnaan akurasi + subsistem **Verify visual**.

Cara pakai (skill `figma-to-lumos` + `lumos-skill`):
1. `get_metadata` + `get_design_context` (excludeScreenshot) untuk node → simpan ke file.
2. dari `scripts/`: `npx tsx src/dc/cli.ts <meta.xml> <dc.jsx>` → EnrichedNode JSON.
3. terjemahkan IR → Lumos (ikut SKILL.md + lumos-skill + gates), lalu `lintLumos` sampai bersih.

## Arsitektur (disempurnakan setelah spike Figma MCP)
Spike menunjukkan `get_design_context` sudah memberi layout+style+teks (Tailwind). Jadi
subsistem lama Extract + Map→Lumos **disatukan** jadi "Design Context → Lumos" (lihat
`docs/superpowers/specs/2026-06-25-design-context-to-lumos-design.md`). Inference engine = fallback non-autolayout.

Alur: `get_design_context`+`get_metadata` → [Facts Extractor deterministik] → [Agent translator] → [Linter] → (Verify nanti).

## Status modul (8 modul, lihat spec §4)
- 1–3 **Value primitives** (Tailwind parser, spacing snapper, color mapper) ✅ **DONE** (merged+pushed, 67 tests)
- 4–5 **Parsers** (`parse-meta.ts`, `parse-dc.ts`) ✅ **DONE** (merged+pushed, 79 tests)
- 6a **Node enrichment** (`role.ts`, `type-style.ts`, `resolve-style.ts`) ✅ **DONE** (merged+pushed, 93 tests)
- 6b **Merger** (`enriched.ts` EnrichedNode, `resolve-layout.ts`, `merge.ts` mergeDesign) ✅ **DONE** (merged, 105 tests) — `mergeDesign(parseMetadata(xml), parseDesignContext(jsx), scales)` → pohon IR diperkaya utuh. (+ `bg-*` color di parseTailwind/resolveStyle)
- 7 **Agent translator skill** (`.claude/skills/figma-to-lumos/SKILL.md`) ✅ **DONE** (authored; live-run validated)
- 8 **Linter** (`lint.ts` lintLumos) ✅ **DONE** (merged, 117 tests) + `default-scales.ts`, `run.ts` runMerge, `cli.ts`
- Inference engine (koordinat → Layout Tree) ✅ DONE (subsistem fallback)
- **Verify visual (render→screenshot→banding) — belum (penyempurna, subsistem berikutnya)**

## Plan #5 (NEXT) = Agent translator skill + Linter (modul 7–8)
Translator (skill `figma-to-lumos`) konsumsi pohon `EnrichedNode` → markup Lumos; Linter deterministik
menolak pelanggaran. **WAJIB baca `2026-06-25-ir-contract-notes.md` bagian "Catatan kontrak untuk Plan #5"**
(gap-suppression, route by confidence band, threshold gates colorDistance/residual, asset expiry, role pass-2).

## Resume instructions for next session (Plan #4 = Merger tree assembly, modul 6b)
1. Baca spec `2026-06-25-design-context-to-lumos-design.md` (§4 modul 6, §6) + **`2026-06-25-ir-contract-notes.md`**
   (lihat bagian "Catatan kontrak untuk Plan #4" — role refinement, gating colorDistance/residual, bg-color, threading).
2. Merger menyusuri pohon `MetaNode` (`parseMetadata`), lookup `ParsedDC.nodes[id]` (`parseDesignContext`),
   per node panggil `detectRole` (`role.ts`) + `resolveStyle` (`resolve-style.ts`), resolusi layout
   (autolayout dari DC `parseTailwind` vs **inference engine** fallback untuk absolute/missing-DC),
   resolve aset (`assets[assetVar]`), thread confidence → emit pohon IR diperkaya.
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
