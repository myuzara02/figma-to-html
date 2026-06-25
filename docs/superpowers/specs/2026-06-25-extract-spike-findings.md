# Extract Spike — Figma MCP output findings

Spike pada sampel: file `40H_Snackd` (`MbE3bWQfUbxG17rZ0LiMXN`), node `4388:3408`
("Desktop - 4" — section about/stats: label + intro besar + paragraf kanan + 3 kolom statistik).

## Tool MCP yang relevan untuk Extract

### 1. `get_metadata` → struktur + geometri (XML)
Mengembalikan pohon node ringkas:
```xml
<frame id="4388:3413" name="Frame 39703" x="40" y="691" width="1360" height="222">
  <frame id="4388:3414" name="Frame 39674" x="0"   y="0" width="440" height="222">…</frame>
  <frame id="4388:3419" name="Frame 39675" x="460" y="0" width="440" height="222">…</frame>
  <frame id="4388:3424" name="Frame 39676" x="920" y="0" width="440" height="222">…</frame>
</frame>
```
- Berisi: `id`, `name`, layer type (`frame`/`text`/`vector`), `x/y/w/h`. **Tanpa style.**
- **PENTING: koordinat `x/y` RELATIF terhadap parent langsung** (anak Frame 39703 mulai dari x=0). →
  Extract harus **mengakumulasi offset jadi absolut** sebelum dipakai inference engine (yang
  mengasumsikan rect absolut).
- Cocok sebagai **sumber geometri untuk inference engine** (kasus non-autolayout).
- Nama frame sering generik (`Frame 39646`) — kurang andal untuk penamaan komponen. Tapi **nama
  node text = isi teksnya** (mis. `[ WIR SIND SNCKD ]`).

### 2. `get_design_context` → React + Tailwind (kaya: layout + style + teks + aset)
Contoh untuk node 4388:3414:
```jsx
<div className="flex flex-col gap-[80px] items-center justify-center …" data-node-id="4388:3414">
  <div className="h-0 w-full …" data-node-id="4388:3415"><img src={imgVector6} /></div>
  <div className="flex flex-col gap-[20px] items-center justify-center text-center" data-node-id="4388:3416">
    <p className="font-['Aeonik:Regular'] leading-[1.1] text-[100px] text-white tracking-[-1px] w-[330px]">60+</p>
    <p className="font-['Aeonik:Medium'] text-[16px] text-[rgba(255,255,255,0.3)] tracking-[0.32px]">Projekte…</p>
  </div>
</div>
```
Memberi sekaligus:
- **Layout dari autolayout** → `flex flex-col gap-[80px] items-center justify-center` (arah, gap, align, justify).
- **Tipografi** → font family/weight, `text-[100px]`, `leading`, `tracking`.
- **Warna** → `text-white`, `text-[rgba(255,255,255,0.3)]`.
- **Teks** (konten asli) dan **aset** (SVG/gambar sebagai URL `figma.com/api/mcp/asset/…`, kedaluwarsa ~7 hari).
- `data-node-id` menautkan tiap elemen kembali ke node Figma.
- Server **secara eksplisit menyuruh mengonversi Tailwind → sistem target** (= Lumos).

### 3. `get_screenshot` → URL PNG (short-lived), hemat token. Untuk grounding & Verify nanti.

## Implikasi besar (mengubah desain)

1. **Sampel ini PUNYA autolayout** → `get_design_context` **sudah** memberi flex/gap/align langsung.
   Artinya untuk design autolayout, **inference engine kita tidak terpakai** — layout sudah ada.
2. Jadi peran sebenarnya:
   - **autolayout ada** → ambil layout+style+teks dari `get_design_context`.
   - **autolayout TIDAK ada** → `get_design_context` keluar `position: absolute` (kasus "berantakan")
     → di sinilah **inference engine** (atas geometri `get_metadata`) menyala.
3. `get_design_context` outputnya **kode (Tailwind), bukan JSON terstruktur** → mem-parse-nya jadi IR
   tidak trivial. Ini keputusan desain Extract: parse Tailwind, atau pakai metadata untuk struktur +
   ekstraksi style terarah.
4. IR perlu diperkaya dengan: `style` (warna→theme, tipografi), `role` (heading/text/image/divider),
   teks, dan referensi aset — semuanya tersedia dari `get_design_context`.

## Pertanyaan terbuka untuk brainstorm Extract
- Sumber utama layout: **autolayout via get_design_context** vs **inference via metadata** — kapan pakai yang mana?
- Bentuk parsing get_design_context (Tailwind code) jadi IR terstruktur.
- Pemetaan warna Tailwind/rgba → variabel theme Lumos (butuh `get_variable_defs`?).
- Strategi penamaan komponen (nama layer generik).
