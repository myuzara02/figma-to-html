# Design — Verify Visual (fase-2: render + vision compare)

- **Tanggal:** 2026-06-25
- **Status:** Disetujui (siap tahap perencanaan)
- **Bagian dari:** subsistem Verify (`2026-06-25-verify-design.md`). Fase-1 (struktural,
  `verifyIR`) sudah DONE; ini **fase-2: render visual nyata**.

## 1. Tujuan & ruang lingkup

Membiarkan agent **melihat hasil render Lumos yang sebenarnya** (bukan sekadar membaca markup)
lalu membandingkannya dengan gambar Figma — menangkap kesalahan CSS/visual yang fase-1 (struktural)
dan langkah baca-markup tak bisa lihat.

Pendekatan: **render (deterministik, Playwright) + perbandingan vision (agent, di skill)** —
pola sama seperti fase-1 (inti deterministik + langkah vision). Perbandingan **level-region**,
bukan piksel (sesuai prinsip "Lumos bersih > pixel-perfect").

### Di luar ruang lingkup
- **Pixel-diff / skor kemiripan numerik** — Lumos fluid vs Figma statis = inheren bising.
- **Loop perbaikan otomatis** — perbaikan tetap agent-driven (skill).
- **CI rendering / headless di cron** — manual/lokal saja v1.

## 2. Keputusan yang dikunci

| Topik | Keputusan |
|---|---|
| Render | **Playwright** (headless chromium), `setContent` dgn foundation.css di-inline |
| Perbandingan | **Vision** (agent lihat 2 gambar), level-region; **bukan** pixel-diff |
| Dependency | `playwright` devDep + `npx playwright install chromium` (sekali) |
| Testing | `render.ts` butuh browser → **divalidasi run integrasi**, bukan unit-test ringan |
| Output | PNG hasil render (agent baca via Read), dibanding dgn `get_screenshot` Figma |

## 3. Arsitektur & alur

```
Lumos HTML (markup string/file)
        │
        ▼
 render.ts: renderToScreenshot(markup, outPath, { foundationCss, width })
   - bungkus jadi dokumen penuh: <style>{foundationCss}</style> + markup
   - Playwright chromium → setViewportSize({ width }) → setContent → screenshot fullPage
        │
        ▼  PNG hasil
 Skill "Visual verify":
   - render output → PNG hasil
   - get_screenshot(fileKey, nodeId) → PNG Figma
   - agent banding 2 gambar (level-region), fokus node yang di-flag verifyIR → perbaiki
```

## 4. Komponen

**`scripts/src/dc/render.ts`** (butuh Playwright):
- `interface RenderOptions { foundationCss: string; width?: number }`
- `async renderToScreenshot(markupHtml: string, outPath: string, opts: RenderOptions): Promise<void>` —
  inline `foundationCss` + `markupHtml` jadi satu dokumen HTML, render di chromium pada `width`
  (default lebar desktop, mis. 1440), tulis screenshot `fullPage` ke `outPath`.

**`scripts/src/dc/render-cli.ts`** (I/O wrapper):
- `tsx src/dc/render-cli.ts <markup.html> <out.png> [width]` — baca file markup + baca
  `lumos-foundation.css` vendored (`.claude/skills/lumos-skill/assets/lumos-foundation.css`)
  → panggil `renderToScreenshot` → tulis PNG.

**Langkah skill** — tambah bagian **"Visual verify"** di `figma-to-lumos/SKILL.md` (setelah Verify
struktural): render output ke PNG, `get_screenshot` Figma, agent banding 2 gambar level-region
(kelengkapan blok, urutan, grid-vs-stack, proporsi kasar), perbaiki yang meleset, re-lint.

## 5. Penanganan error & kasus tepi

- **Chromium belum terinstall** → render gagal dengan pesan jelas + instruksi `npx playwright install chromium`.
- **Markup kosong / foundation hilang** → error eksplisit, bukan PNG blank diam-diam.
- **Warna/aset** — render memakai foundation.css default; warna brand asli mungkin beda → banding
  fokus ke **struktur & proporsi**, bukan warna persis (warna sudah dijaga di mapping).
- **Aset Figma kedaluwarsa (~7 hari)** → gambar mungkin kosong; tandai, jangan anggap bug layout.

## 6. Kriteria sukses

- `renderToScreenshot` menghasilkan PNG non-blank berukuran sesuai viewport dari markup Lumos +
  foundation.css (divalidasi run integrasi pada output demo).
- Langkah "Visual verify" terintegrasi di skill.
- Tidak menambah test lambat ke suite unit (render divalidasi terpisah).

## 7. Fase implementasi (1 plan kecil)

1. Pasang `playwright` (devDep) + `playwright install chromium`.
2. `render.ts` (`renderToScreenshot`) + `render-cli.ts`.
3. Run integrasi: render output Lumos demo → cek PNG.
4. Tambah langkah "Visual verify" ke `SKILL.md`.
