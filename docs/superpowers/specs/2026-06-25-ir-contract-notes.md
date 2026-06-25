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
