# Design — Figma to Lumos (Figma → HTML)

- **Tanggal:** 2026-06-25
- **Status:** Disetujui (siap masuk tahap perencanaan implementasi)
- **Bahasa output tool:** HTML markup mode Webflow + Lumos classes

## 1. Tujuan & ruang lingkup

Membangun tool yang mengonversi design Figma menjadi **HTML dengan konvensi Lumos
Framework**. Prioritas utama: **markup Lumos yang bersih, responsif, dan mudah
di-maintain** — bukan kemiripan piksel sempurna. Selisih posisi kecil dapat
diterima asal struktur (row/column/grid) benar.

Masalah inti yang diselesaikan: design **tanpa autolayout** hanya memberi koordinat
absolut, sehingga konversi naif menghasilkan `position: absolute` yang berantakan dan
tidak responsif. Tool ini menambahkan **lapisan inference layout** untuk memulihkan
maksud layout, lalu memetakannya ke Lumos.

### Di luar ruang lingkup (v1)
- **Booster A** (auto-apply autolayout di sisi Figma) — ditunda; arsitektur dirancang
  agar bisa ditambah belakangan tanpa bongkar pipeline.
- **Aplikasi standalone** (web app / CLI publik) — pendekatan saat ini adalah skill +
  agent, bukan produk terpisah.
- **Frame mobile/tablet sebagai syarat** — input diasumsikan desktop-only; frame mobile
  bersifat opsional bila kebetulan tersedia.
- **Registry class khusus project** — v1 mulai dari foundation Lumos standar saja.

## 2. Keputusan yang dikunci

| Topik | Keputusan | Alasan |
|---|---|---|
| Prioritas akurasi | Markup Lumos bersih > pixel-perfect | Output untuk dev, harus maintainable & responsif |
| Workflow | MCP (Figma Dev Mode) + agent (Approach B) | Sesuai cara kerja tim; tidak memodifikasi file Figma |
| Penanganan non-autolayout | Inference di sisi agent/tool | Berlaku untuk design milik sendiri maupun dari luar |
| Output | Mode Webflow: HTML + class, 0 CSS untuk utility | Utility sudah ada di Webflow; hindari style dobel |
| Custom styling | Class komponen + style minimal hanya untuk gap | Sesuai aturan Lumos mode Webflow |
| Registry | Foundation Lumos standar dulu | YAGNI; class khusus project menyusul |
| Responsiveness | Sistem **threshold** Lumos terbaru, disimpulkan dari desktop | Mengikuti update skill (62/48/30em) |

## 3. Deliverable

- **Skill `figma-to-lumos`** (`.claude/skills/figma-to-lumos/SKILL.md`) — prosedur
  orkestrasi yang dijalankan agent. Menyusun di atas skill `lumos-skill` (aturan class
  & konvensi Lumos).
- **Helper scripts** (`scripts/`, **Node.js + TypeScript** — satu bahasa konsisten,
  selaras dengan tooling headless browser):
  - `infer-layout.ts` — rekonstruksi hirarki & deteksi row/column/grid dari koordinat.
  - `verify-visual.ts` — render HTML hasil → screenshot → bandingkan dengan frame Figma.
- **Reference** (`scripts/reference/`) — contoh mapping Figma-node → Lumos.

Prinsip pembagian: LLM/agent untuk "memahami maksud design"; script deterministik untuk
"menghitung geometri" (lebih akurat & murah). Sesuai aturan repo (kode jalan → `scripts/`,
prosedur → `.claude/skills/`).

## 4. Arsitektur pipeline

```
[1 Extract] → [2 Normalize → Layout Tree (IR)] → [3 Map ke Lumos] → [4 Verify visual] → [5 Output]
```

### 4.1 Extract (agent ↔ Figma MCP)
Ambil dari frame terpilih: node tree, geometri (`x/y/w/h`), teks, fill/warna, font/
tipografi, efek, **properti autolayout bila ada**, aset image/SVG, dan **screenshot frame**
(untuk inference & verify).

### 4.2 Normalize → Layout Tree (IR netral)
Ubah node Figma mentah menjadi pohon "box" netral:

```
Box {
  role?,                         // tebakan peran (section/container/card/text/...)
  layout: row | column | grid | stack,
  gap, align, padding,
  sizing: fill | hug | fixed,
  style { ... },                 // warna, tipografi, radius, dst.
  children[]
}
```

Dua jalur mengisi IR:
- **Ada autolayout** → map langsung (autolayout ≈ flex; `primaryAxis` → row/column;
  `itemSpacing` → gap; padding & alignment ikut).
- **Tidak ada** → panggil `infer-layout` (lihat §5).

IR adalah **titik tengah tunggal** — tahap berikutnya tidak peduli sumber datanya
(autolayout / inference / booster A nanti).

### 4.3 Map ke Lumos
Telusuri Layout Tree, emit HTML + class Lumos. Untuk tiap kebutuhan style:

```
ada utility cocok di registry?
  ├─ ya  → pakai nama class, emit 0 CSS
  └─ tidak → bikin class komponen custom + style minimal (hanya selisihnya)
```

Mengikuti aturan `lumos-skill` mode Webflow: **tidak** meredefinisi utility/variable/
`:root`/reset. Responsiveness memakai sistem **threshold** terbaru (lihat §7).

### 4.4 Verify visual (loop) — lihat §6
### 4.5 Output
Markup Webflow-paste: HTML + (opsional) satu blok `<style>` custom untuk gap yang tak
tercover utility, + laporan node low-confidence bila ada.

### Pemetaan komponen → file
| Komponen | Lokasi |
|---|---|
| Orkestrasi prosedur | `.claude/skills/figma-to-lumos/SKILL.md` |
| Inference layout (deterministik) | `scripts/infer-layout.ts` |
| Verifikasi visual | `scripts/verify-visual.ts` |
| Contoh mapping node→Lumos | `scripts/reference/` |
| Registry class (foundation dulu) | `.claude/skills/lumos-skill/assets/lumos-foundation.css` |

## 5. Strategi inference (kasus non-autolayout)

`infer-layout` bekerja **deterministik dulu, vision sebagai penengah saat ragu**:

1. **Hirarki containment** — dari rect absolut, tentukan box di dalam box → pulihkan nesting.
2. **Deteksi arah antar-sibling:**
   - sejajar kiri→kanan, Y overlap, jarak horizontal konsisten → **row**
   - menumpuk atas→bawah, X mirip → **column**
   - matriks rapi n×m, gap konsisten → **grid**
   - selain itu → **stack** (ditandai low-confidence)
3. **Turunkan angka:** gap = median jarak antar-anak; padding = tepi container ke bbox anak;
   align = start/center/end dari distribusi.
4. **Sizing heuristik:** elemen selebar container → `fill`; selain itu `hug`/`fixed`.
5. **Skor confidence per node.** Node low-confidence → diserahkan ke **vision** (agent
   melihat screenshot untuk memastikan grouping); **angka eksak tetap dari algoritma**.
   Node low-confidence juga jadi prioritas di tahap Verify.

Prinsip: **algoritma = angka & geometri** (presisi, murah); **vision = maksud/grouping
saat ambigu**. Dipakai sesuai kekuatan masing-masing, bukan salah satu saja.

## 6. Loop verifikasi visual

Menilai **kebenaran struktur**, bukan selisih piksel.

**Dua lapis cek per iterasi:**
1. **Struktural (utama, deterministik):** jumlah elemen cocok? kedalaman hirarki wajar?
   row/column/grid hasil inference benar ada? teks & urutan cocok? tidak ada elemen
   hilang/overlap.
2. **Visual kasar (sekunder, vision):** screenshot hasil vs frame Figma dibandingkan
   **level region**, bukan piksel — menangkap salah-tempat besar.

**Kontrol loop:**
- Perbaikan diprioritaskan ke node low-confidence dari §5.
- Tiap iterasi: temukan diskrepansi terparah → agent perbaiki IR/mapping → render ulang →
  cek ulang.
- **Maks N iterasi** (default 2–3). Berhenti bila tidak ada diskrepansi parah atau N tercapai.

**Kegagalan ditangani transparan:** bila setelah N masih meleset, output tetap keluar
**disertai laporan** node yang belum yakin (mis. komentar `<!-- ⚠ low-confidence: ... -->`
+ ringkasan). Tidak ada pemotongan/penyembunyian diam-diam.

**Tooling:** headless browser (Playwright/Puppeteer) untuk render+screenshot; perbandingan
= metrik bounding-box (deterministik) + penilaian vision ("secara struktur cocok?").

## 7. Responsiveness (sistem threshold Lumos terbaru)

Skill Lumos sudah pindah dari sistem keyword-variable lama ke **threshold + utility**:
named container query di `body` — `threshold-large` (62em), `threshold-medium` (48em),
`threshold-small` (30em). Sistem variable lama dihapus; grid pakai `u-grid-above`/
`u-grid-below`; lebar baris teks pakai `data-number="N"` pada wrapper `u-heading`/`u-text`.

Karena input **desktop-only**, perilaku responsif **disimpulkan**:
- **Default:** sizing fluid (breakpointless) agar skala mengikuti lebar.
- **Layout switch:** kolom-banyak (row/grid) collapse jadi menumpuk di bawah threshold
  yang sesuai (default 62em); grid pakai `u-grid-above`.
- **Bila ada frame mobile/tablet:** dipakai untuk menurunkan threshold yang akurat
  (opsional, bukan syarat v1).

## 8. Kriteria sukses (terukur)

- **Fidelitas struktur:** grouping (row/col/grid) teridentifikasi benar pada *test set*
  contoh frame — autolayout **dan** non-autolayout.
- **Kebenaran Lumos:** hanya mereferensikan utility yang dikenal (0 CSS untuk utility);
  custom CSS minimal & valid; patuh aturan `lumos-skill` mode Webflow.
- **Aman di-paste:** markup masuk Webflow tanpa style dobel/bentrok.
- **Responsif:** menghasilkan perilaku berbasis threshold; tidak rusak di lebar mobile.
- **Minim bersih-bersih:** dev cukup sedikit merapikan (kualitatif).

## 9. Risiko & mitigasi

- **Inference salah grouping** → mitigasi: lapis vision + loop verifikasi + laporan
  low-confidence untuk review manual.
- **Skill Lumos berubah lagi (breaking)** → mitigasi: mapping mengacu ke `lumos-skill`
  yang di-vendor; upgrade dilakukan sengaja + review diff (lihat catatan vendoring).
- **Registry belum lengkap** (class khusus project belum terdaftar) → tool akan membuat
  custom CSS untuk yang tak dikenal; bisa dikurangi nanti dengan menambah registry.
- **Heuristik sizing fluid meleset** di kasus rumit → ditandai low-confidence + dilaporkan.

## 10. Fase implementasi (garis besar, didetailkan di tahap writing-plans)

1. **Extract + IR** — sambungkan Figma MCP, definisikan struktur Layout Tree, jalur
   autolayout-langsung.
2. **Inference** — `infer-layout` (containment, deteksi arah, angka, confidence).
3. **Map ke Lumos** — emit HTML + class, registry foundation, jalur custom-gap.
4. **Verify** — `verify-visual` (render, screenshot, cek struktural + vision, loop).
5. **Skill orkestrasi** — `figma-to-lumos/SKILL.md` merangkai semuanya + format laporan.
