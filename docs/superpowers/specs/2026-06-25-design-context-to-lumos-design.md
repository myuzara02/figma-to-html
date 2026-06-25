# Design — Design Context → Lumos (subsistem translator)

- **Tanggal:** 2026-06-25
- **Status:** Disetujui (siap tahap perencanaan)
- **Menyempurnakan:** `2026-06-25-figma-to-lumos-design.md` (berdasarkan temuan
  `2026-06-25-extract-spike-findings.md`). Spike menunjukkan `get_design_context` sudah
  memberi layout+style+teks, sehingga subsistem lama **Extract** dan **Map→Lumos** disatukan
  menjadi satu alur translasi di sini; **inference engine** (sudah dibangun) menjadi *fallback*.

## 1. Tujuan & ruang lingkup

Mengubah satu node Figma menjadi **markup Lumos (mode Webflow)** dengan **akurasi tinggi**:
struktur, teks, warna, dan tipografi setia pada design; markup mengikuti konvensi `lumos-skill`.
Sumber kebenaran = output resmi Figma MCP (`get_design_context` + `get_metadata`).

Prinsip akurasi inti: **fakta dikunci deterministik, agent hanya menerjemahkan.** Agent diapit dua
lapis kode — **Facts Extractor** di depan (mengunci teks/warna/angka/struktur) dan **Linter** di
belakang (menolak pelanggaran Lumos). Teks, warna, dan angka **tidak pernah** berasal dari tebakan LLM.

### Di luar ruang lingkup (subsistem ini)
- **Verify visual loop** (render→screenshot→banding) — subsistem terpisah berikutnya.
- **Pemetaan variabel Figma → theme Lumos otomatis penuh** — v1 pakai palette/scale dari
  `lumos-foundation.css` (keputusan "registry = foundation dulu"); `get_variable_defs` opsional.
- **Animasi/interaksi** (motion, trigger state) — di luar scope.
- **Multi-node / halaman penuh** — v1 fokus satu node terpilih.

## 2. Keputusan yang dikunci

| Topik | Keputusan |
|---|---|
| Sumber data | Figma MCP: `get_design_context` (style/teks/aset/layout-autolayout) + `get_metadata` (geometri) |
| Strategi layout | Hibrida: autolayout → dari `get_design_context`; non-autolayout → **inference engine** atas geometri |
| Akurasi | Facts Extractor (deterministik) di depan + Linter (deterministik) di belakang; agent hanya translasi |
| Teks/warna/angka | Verbatim dari facts — agent dilarang mengarang |
| Output | Mode Webflow: HTML + class Lumos, 0 CSS untuk utility; custom CSS hanya untuk gap |
| Token & warna | Snap px → `space--1..8`; warna → `--_theme---*`. Skala/palette dari `lumos-foundation.css` (v1) |
| Bahasa kode | Node.js + TypeScript (lanjutan `scripts/`) |

## 3. Arsitektur & alur data

```
get_design_context (JSX+Tailwind)   get_metadata (XML geometri)   [get_variable_defs opsional]
                 │                              │
                 ▼                              ▼
        [4] DC parser                    [5] Metadata parser
                 └──────────────┬───────────────┘
                                ▼
                       [6] MERGER → IR diperkaya
              (gabung per data-node-id; terapkan [1][2][3];
               anak "absolute" → panggil INFERENCE ENGINE)
                                │
                                ▼
                  [7] AGENT TRANSLATOR (skill, dipandu lumos-skill)
                       facts/IR → markup Lumos; teks/warna/angka verbatim
                                │
                                ▼
                  [8] LINTER (deterministik) → lolos? selesai : agent perbaiki
```

Modul nilai dipakai di dalam Merger:
- **[1] Tailwind parser** — `className` → style facts mentah (px/warna apa adanya).
- **[2] Spacing snapper** — px → token `space--N` terdekat (skala diinject).
- **[3] Color→theme mapper** — rgba/hex → `--_theme---*` terdekat (palette diinject).

## 4. Komponen (modul, semua deterministik kecuali [7])

| # | Modul | Tanggung jawab | Lokasi |
|---|---|---|---|
| 1 | Tailwind parser | `parseTailwind(className) → StyleFacts` (gap, layout, align, justify, font, size, color, width, position) | `scripts/src/dc/tailwind.ts` |
| 2 | Spacing snapper | `snapSpacing(px, scale) → { token, residualPx }` | `scripts/src/dc/spacing.ts` |
| 3 | Color mapper | `mapColor(color, palette) → { themeVar, distance }` | `scripts/src/dc/color.ts` |
| 4 | DC parser | `parseDesignContext(jsx) → DCNode tree` (nodeId, tag, className, text, assetRef, children) + resolusi const aset | `scripts/src/dc/parse-dc.ts` |
| 5 | Metadata parser | `parseMetadata(xml) → MetaNode tree` (nodeId, name, type, rect, children) | `scripts/src/dc/parse-meta.ts` |
| 6 | Merger → IR | gabung [4]+[5] per nodeId; terapkan [1][2][3]; non-autolayout → inference engine; hasil = IR diperkaya | `scripts/src/dc/merge.ts` |
| 7 | Agent translator | skill orkestrasi: IR → markup Lumos | `.claude/skills/figma-to-lumos/SKILL.md` |
| 8 | Linter | `lintLumos(html) → Issue[]` (px, hex, utility tak dikenal, penamaan, teks tak cocok) | `scripts/src/dc/lint.ts` |

**IR diperkaya** = `LayoutBox` (dari inference engine) + field tambahan: `text?`, `style { fontTier?,
weightTier?, colorVar?, ... }`, `role?` (heading/text/image/divider/container), `asset?`. (Memenuhi
field yang IR-contract-notes tandai "mapper harus sediakan".)

## 5. Mekanisme akurasi (detail)

1. **Facts terkunci:** teks diambil dari konten node DC apa adanya; warna & spacing di-*snap*
   deterministik; struktur dari metadata. Agent menerima facts ini, bukan kode mentah.
2. **Verbatim contract:** prompt agent mewajibkan memakai teks/warna-var/token dari facts persis;
   dilarang menambah teks atau hex.
3. **Linter gate:** output agent dilewatkan linter; pelanggaran (px, hex, utility tak dikenal,
   penamaan salah, teks tak cocok dengan facts) → dikembalikan ke agent untuk diperbaiki (maks N).
4. **Verify visual** (subsistem nanti) menutup loop pada kemiripan struktur.

## 6. Penanganan error & kasus tepi

- **Non-autolayout** (anak `position: absolute` di DC) → Merger memanggil inference engine atas
  geometri metadata; node ditandai `confidence` rendah → prioritas verify.
- **Aset kedaluwarsa** (URL Figma ~7 hari) → Extractor mengunduh/menyimpan referensi saat ekstraksi;
  jika gagal, tandai placeholder + laporan.
- **Warna tak ada padanan theme** → ambil `--_theme---*` terdekat + catat `distance`; jika jauh,
  tandai untuk review (jangan diam-diam pakai hex).
- **Output DC terlalu besar** → `get_design_context` bisa balas metadata saja; tangani dengan
  memproses per sub-node.
- **Nama layer generik** (`Frame 39646`) → penamaan komponen pakai `role` + indeks; nama layer
  dipakai hanya bila bermakna.

## 7. Kriteria sukses (terukur)

- **Fakta setia:** teks & nilai warna/spacing output cocok dengan facts (cek via linter).
- **Lumos valid:** 0 `px`, 0 hex, hanya utility dikenal, penamaan benar (linter hijau).
- **Layout benar:** autolayout → flex/grid/gap/align sesuai DC; non-autolayout → hasil inference wajar.
- **Aman di-paste** ke Webflow tanpa style dobel.
- **Modul deterministik (1–6, 8) ter-TDD penuh**; agent (7) lolos linter + verify.

## 8. Fase implementasi (plan terpisah)

1. **Plan #1 — inti akurasi nilai (modul 1–3):** Tailwind parser, spacing snapper, color mapper.
   Murni, TDD penuh; skala/palette diinject (fixture saat tes, dari `lumos-foundation.css` saat runtime).
2. **Plan #2 — parsing & merge (modul 4–6):** DC parser, metadata parser, merger → IR diperkaya
   (termasuk jalur fallback inference). Diuji terhadap fixture nyata dari spike.
3. **Plan #3 — agent translator + linter (modul 7–8):** skill `figma-to-lumos` + linter deterministik.
4. (Berikutnya) Verify visual — subsistem terpisah.

## 9. Catatan
- Tailwind hanyalah **format perantara** keluaran Figma MCP; output akhir murni Lumos. Tidak ada
  dependensi Tailwind dipasang.
- Loader skala token & palette membaca `lumos-foundation.css` (vendored). Fungsi snapper/mapper
  menerima skala/palette sebagai parameter agar murni & mudah dites.
