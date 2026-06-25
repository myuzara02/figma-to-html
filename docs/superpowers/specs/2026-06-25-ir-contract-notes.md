# IR Contract Notes — for the Map→Lumos subsystem

Catatan dari final whole-branch review subsistem **inference engine** (`feat/inference-engine`).
Tujuan: hal-hal soal IR (`scripts/src/ir.ts` → `LayoutBox`) yang **harus diketahui** saat menulis
plan & kode subsistem berikutnya (**Map → Lumos**). Ini bukan bug — semuanya konsekuensi desain
yang sudah disepakati; dicatat agar tidak hilang.

## Hal yang harus diperhatikan mapper

1. **Root `sizing` adalah tebakan, bukan hasil derivasi.**
   `inferLayout` menetapkan node teratas `{ width: "fill", height: "hug" }` tanpa syarat (satu-satunya
   tempat `"hug"` muncul). Anak-anak mendapat `fill`/`fixed` asli via `deriveSizing`. → Mapper harus
   memperlakukan sizing root sebagai placeholder, dan `"hug"` sebagai "belum diinferensi".

2. **`confidence: 1` bermakna ganda.** Leaf **dan** container ber-anak-tunggal sama-sama melaporkan 1.
   Jadi "confidence 1" = "tidak ambigu secara trivial", bukan "grouping terverifikasi". → Untuk routing
   ke vision (spec §5 langkah 5), pakai rentang bermakna `[0.3–0.9]` (stack 0.3/0.4, grid 0.85,
   row/col 0.9) sebagai sinyal; jangan anggap node 1.0 sudah dicek vision.

3. **`padding` dan `justify` bisa menghitung inset yang sama dua kali.** `derivePadding` mengukur
   container→bbox-anak, sementara `deriveJustify` bisa mengembalikan `"center"` untuk inset simetris
   yang sama. → Pilih **satu sumber kebenaran per box** (rekomendasi: percayai `padding`; pakai
   `justify` hanya untuk distribusi multi-anak). Untuk box anak-tunggal, abaikan `justify`.

4. **`justify` hanya pernah menghasilkan `start|center|end`** (walau bertipe `Align` yang memuat
   `stretch`). `align` **bisa** menghasilkan `stretch` (fall-through di `deriveAlign`) di cross-axis —
   tangani itu.

5. **Inset negatif di-clamp ke 0.** `derivePadding`/`deriveSizing` pakai `Math.max(0, …)`. Kalau anak
   meluap (overflow) dari parent (umum di Figma berantakan), padding terbaca 0 tanpa penanda. → IR
   tidak memberi tahu soal overflow; pertimbangkan menyurfacing-nya di tahap verify nanti.

## Field yang SENGAJA belum ada (mapper harus menyediakan sendiri)

- **`style`** (warna, tipografi, radius, fill) — engine ini murni geometri. Spec §4.2 menyebut `style`,
  tapi `LayoutBox` belum membawanya. Mapper harus ambil sendiri dari data Figma MCP.
- **`role`** (section/container/card/text/…) — juga belum ada di `LayoutBox`.
- **`"hug"` sizing** — belum diturunkan (hanya `fill`/`fixed`).
- **Containment reconstruction dari rect flat** — diasumsikan pakai tree Figma yang ada.

## Refinement yang ditunda (boleh diabaikan dulu)

- **Grid detection** gagal jika kolom antar-baris tidak sejajar (x-span tak overlap) → jatuh ke
  `stack`/confidence 0.4 (benar: low-confidence akan dirutekan ke vision). Ini "banding refinement"
  yang memang sudah ditandai ditunda.
- **`deriveJustify` cenderung `center`** untuk anak tunggal dengan padding simetris (lihat poin 3).

## Catatan kontrak untuk Plan #4 (merger) — dari final review Plan #3

Modul enrichment (`role.ts`, `type-style.ts`, `resolve-style.ts`) sudah jadi & merged. Merger
yang menyusun IR diperkaya WAJIB memperhatikan:

1. **Role taxonomy = struktural saja.** `detectRole` hanya keluar `image|divider|text|container|unknown`
   — TIDAK bisa bedakan button/link/icon/list (inputnya tak cukup). Merger harus **refine semantik**
   pakai sinyal DC: `container→button` (frame + child text + bg), `text→link` (interaksi/href),
   `image→icon` (vector kecil). Jangan paksa ke `detectRole`; tambah pass kedua di merger.
2. **`colorVar` & `textStyle` selalu di-set ke "terdekat"** (snap tanpa threshold). AMAN hanya kalau
   konsumen membaca sinyal pendampingnya: **gate `colorDistance`** (jauh → tandai review, jangan pakai)
   dan **gate `textStyleResidualPx`** (mis. |residual|>threshold → emit size override, kalau tidak
   heading 100px ke-render 64px → meleset diam-diam). Tentukan threshold di Plan #4/#5, surface
   `colorNeedsReview`/`sizeNeedsOverride` sebagai satu sumber kebenaran (translator + linter sepakat).
3. **Background/fill color BELUM ditangkap.** `parseTailwind` hanya parse `text-*` (warna teks), bukan
   `bg-*`. Container fill akan **hilang diam-diam** — ini silent-loss paling mungkin berikutnya.
   Plan #4 (atau ekstensi kecil `parseTailwind`) harus tambah `bg-*` → `bgColorVar`/`bgColorAlpha`.
4. **Field IR diperkaya yang harus di-thread merger:** `text` verbatim (dari DC), `asset` URL
   (`assets[assetVar]`) + flag placeholder bila kedaluwarsa, `confidence` (band 0.3–0.9; 1.0 ≠ terverifikasi),
   `bgColor`, dan flag review di atas.
5. **Multi-text-run collapse:** satu node text dengan beberapa gaya/weight per-span → `StyleFacts`/`StyleInfo`
   memodelkan SATU gaya per node. Batas data-loss yang diketahui; translator jangan asумsikan per-node = per-run uniform.

## Catatan kontrak untuk Plan #5 (agent translator + linter) — dari final review Plan #4

Merger (`merge.ts` → `mergeDesign`) sudah jadi & merged. Output = pohon `EnrichedNode`
(role, text, style, asset, layout). Translator + linter (Plan #5) WAJIB menerapkan KEBIJAKAN
berikut (sengaja TIDAK di-patch di branch merger — biar merge atomic):

1. **Gap-suppression:** `resolveLayout` memanggil `snapSpacing` walau gap inferred = 0 → bisa keluar
   token gap palsu (mis. `space--3 residual -16`) untuk container 1-anak/stack. Translator harus
   **abaikan gap** kalau `children.length < 2` ATAU `|gap.residualPx| >= px-stop-terdekat`.
2. **Route by confidence band, BUKAN `source`.** Leaf & container 1-anak sama-sama `confidence:1` dan
   `source:"autolayout"` (mislabel — leaf bukan autolayout). Pakai band `[0.3–0.9]` untuk routing
   review/vision; `1.0` = "trivial tak ambigu", BUKAN terverifikasi. (Opsional: rename leaf `source`
   jadi `"none"`.)
3. **Threshold gates (sinyal mentah sudah ada di `StyleInfo`):**
   - `colorDistance`/`bgColorDistance` > toleransi → `colorNeedsReview`, jangan diam-diam cat ke var terdekat.
   - `|textStyleResidualPx|` > toleransi → emit size override eksplisit (jebakan "heading 100px ke-render 64px";
     fixture merge memang kena ini: 100→`u-text-style-h1`(64) residual +36).
   - Definisikan threshold SEKALI, dipakai bersama translator + linter.
4. **Asset expiry:** `AssetRef.url` = URL Figma live (~7 hari), belum ada flag placeholder. Tahap
   konsumsi aset harus download/snapshot + flag placeholder.
5. **Semantic role pass-2:** `detectRole` struktural saja → tambah refinement `container→button` /
   `text→link` / `image→icon` pakai sinyal DC (interaksi/href, bentuk anak) yang belum di-plumb (work item nyata).
