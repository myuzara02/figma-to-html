# Design — Verify (subsistem QA output)

- **Tanggal:** 2026-06-25
- **Status:** Disetujui (siap tahap perencanaan)
- **Bagian dari:** pipeline "Figma → Lumos" (subsistem #4, "Verify visual" di
  `2026-06-25-figma-to-lumos-design.md`). v1 di sini = **fase-1 struktural, tanpa render**.

## 1. Tujuan & ruang lingkup

Menutup loop "apakah output benar" dengan **menandai apa yang perlu dicek** sebelum markup
Lumos dikirim ke dev. Pendekatan **hibrida bertahap**:
- **Fase-1 (subsistem ini):** laporan kepercayaan **deterministik** atas pohon `EnrichedNode`
  (`verifyIR`) — mengoperasikan *gates* yang selama ini direkomendasikan review — **plus**
  langkah **cek vision kasar** di dalam skill translator (agent banding output vs screenshot Figma).
- **Fase-2 (ditunda):** render visual penuh (Playwright + `lumos-foundation.css` → screenshot →
  banding level-region). Modul terpisah, ditambah hanya bila butuh presisi lebih.

Prinsip yang dipegang: **"Lumos bersih > pixel-perfect"** — Verify menangkap kesalahan
**kasar/struktural**, bukan selisih piksel.

### Di luar ruang lingkup
- Render headless / Playwright / dependency baru (fase-2).
- Diff piksel atau skor kemiripan numerik.
- Auto-fix otomatis — Verify **melaporkan**; perbaikan dilakukan agent (skill) / dev.

## 2. Keputusan yang dikunci

| Topik | Keputusan |
|---|---|
| Granularitas | Struktural/kasar, bukan piksel |
| Inti modul | **`verifyIR` deterministik** (TDD-penuh, zero-dep) |
| Cek vision | Langkah di skill (agent + screenshot Figma), bukan modul terpisah |
| Dependency | **Tidak ada** yang baru (fase-2 baru perlu Playwright) |
| Sumber sinyal | Field yang sudah ada di `EnrichedNode` (confidence, residual, distance, role, text, asset) |
| Threshold | Parameter di-inject, dengan default |

## 3. Arsitektur & alur

```
EnrichedNode tree ──► verifyIR(root, thresholds?) ──► VerifyReport
   (dari runMerge)        (deterministik)                { issues[], counts }
                                   │
                                   ▼
        Skill figma-to-lumos, langkah "Verify":
        1. jalankan verifyIR → tampilkan flag (apa yang ditebak / berisiko)
        2. get_screenshot(Figma node) → agent banding visual kasar
           (blok hilang? urutan ketukar? grid jadi numpuk?)
        3. perbaiki flag prioritas, lalu kirim output
```

## 4. Komponen

**`scripts/src/dc/verify.ts`** (pure, zero-dep, TDD):
- `interface VerifyIssue { nodeId: string; name: string; rule: string; detail: string }`
- `interface VerifyReport { issues: VerifyIssue[]; counts: Record<string, number> }`
- `interface VerifyThresholds { confidenceMin: number; gapResidualMax: number; typeResidualMax: number; colorDistanceMax: number }`
- `verifyIR(root: EnrichedNode, thresholds?: VerifyThresholds): VerifyReport` — telusuri pohon,
  kumpulkan issue, hitung `counts` per rule. Threshold default jika tak diberikan.

### Aturan flag (semua dari sinyal `EnrichedNode`)
| Rule | Pemicu (default) |
|---|---|
| `low-confidence-layout` | `layout.source === "inferred" && layout.confidence < confidenceMin` (0.9) |
| `high-gap-residual` | `layout.gap && Math.abs(gap.residualPx) > gapResidualMax` (16) |
| `high-type-residual` | `style.textStyleResidualPx != null && Math.abs(...) > typeResidualMax` (12) |
| `far-color` | `style.colorDistance > colorDistanceMax` **atau** `style.bgColorDistance > colorDistanceMax` (40) |
| `empty-text` | `role === "text"` dan teks kosong/whitespace |
| `missing-asset` | `role === "image"` dan `asset?.url` tak ada |
| `ambiguous-stack` | `role === "container"` dan `children.length >= 2` dan `layout.layout === "stack"` |

Default threshold: `{ confidenceMin: 0.9, gapResidualMax: 16, typeResidualMax: 12, colorDistanceMax: 40 }`.

## 5. Integrasi skill

Tambah bagian **"Verify"** di `.claude/skills/figma-to-lumos/SKILL.md` (setelah langkah lint):
- jalankan `verifyIR(tree)` (import dari `src/dc/verify`), tampilkan ringkasan + issue ke user;
- `get_screenshot(fileKey, nodeId)` → agent membandingkan output dengan gambar Figma secara
  **kasar** (kelengkapan blok, urutan, grid vs stack), fokus pada node yang di-flag;
- perbaiki flag prioritas sebelum mengirim; sertakan ringkasan flag yang tersisa di laporan akhir.

## 6. Penanganan error & kasus tepi

- Pohon kosong / leaf tunggal → `{ issues: [], counts: {} }` (tidak throw).
- Field opsional hilang (mis. `style` undefined) → rule terkait dilewati, bukan error.
- Threshold ekstrem (mis. 0) → tetap jalan; ini parameter operator.

## 7. Kriteria sukses (terukur)

- `verifyIR` **deterministik & TDD-penuh**; menandai kasus aproksimasi yang diketahui
  (pada demo node `4388:3408`: gap root `+220`, dan 3 angka display residual `−20`).
- Tidak menandai node yang sehat (mis. baris stats inferred `0.9` **tidak** di-flag; warna jarak `0` tidak).
- Terintegrasi sebagai langkah di skill translator.
- **Tidak ada dependency baru.**

## 8. Fase implementasi

1. **Plan tunggal:** modul `verify.ts` (`verifyIR` + tipe + default threshold), TDD; lalu
   tambah langkah "Verify" ke `SKILL.md` (authored). 1 plan kecil.
2. **Fase-2 (terpisah, nanti):** render visual penuh (Playwright). Spec sendiri saat diperlukan.
