# Analisa revisi bentuk video — v1 (voxel) → v2 (gaya film CTA)

![Sebelum (atas, v1) dan sesudah (bawah, v2) pada detik yang sama](revision_before_after.png)

Atas: v1. Bawah: v2. Keduanya pada detik yang sama: 7.7, 16.2, 23.0, 29.2, 46.4 dan 56.0 s
(masuk ke kaki, disfungsi endotel, progresi plak, oklusi, pengisian kontras, oklusi pada CTA).

## Kesimpulan

v1 tampak jelek karena semua model dibangun dari kubus voxel. Bentuk kecil seperti sel darah, plak, kalsium dan
pembuluh tibial hanya beberapa kubus lebarnya. Pada ukuran sekecil itu kubus tidak bisa membentuk lengkungan, dan
dither transparansi mengubahnya menjadi noise.

v2 dibangun ulang dengan mesin render film CTA, sesuai harapan klien ("closer to the style of your original CT
animation"):

- model 3D halus dengan shading bertingkat (ramp + dither), rim light, kilap kecil dan outline 1 piksel;
- dalam close-up arteri, bidang potong dindingnya digambar sebagai pixel art 2D, piksel demi piksel.

Ini campuran 2D pixel + 3D yang diminta. Bagian 3D-nya bukan lagi kubus voxel, karena justru kubus itulah sumber
ketidakjelasan dan film CTA juga tidak memakai kubus.

## Masalah per bentuk dan perbaikannya

| Bentuk | Masalah di v1 | Penyebab | Perbaikan di v2 |
|---|---|---|---|
| Sel darah merah | Kepingan bergerigi seperti kue, tidak terbaca sebagai cakram | Cakram dari sedikit kubus: sisi lengkungnya menjadi tangga | Cakram bikonkaf 3D halus seperti di film CTA: merah tua, cekung di tengah, kilap kecil, outline gelap |
| Dinding arteri (permukaan dalam) | Pola kotak-kotak cyan, seperti ubin kamar mandi | Wajah kubus terlihat sebagai grid; warna cyan | Lapisan dalam merah-pink yang diterangi lembut, dengan kabut plasma ke arah belakang |
| Lapisan dinding (penampang) | Hanya beberapa garis tipis | Satu kubus terlalu kasar untuk 4 lapisan | Pixel art 2D di bidang potong: endotel dengan inti, lamina elastika interna putih bergelombang, media merah bergaris, adventisia cokelat berserat |
| Warna arteri | Cyan, bertabrakan dengan konvensi (arteri = merah) dan mirip warna kontras | Pilihan palet v1 | Kode warna baru: arteri merah, vena biru baja, kontras putih-biru, plak kuning-oranye, kalsium putih, oklusi oranye-cokelat |
| Plak dan kalsium | Bintik oranye dan putih acak, tanpa struktur | Noise per kubus | Tudung fibrosa krem di atas inti lipid kuning, celah kolesterol, sel busa, nodul kalsium putih bulat dengan outline |
| Oklusi | Kotak oranye dengan bintik putih acak | Isi kubus acak | Sumbat fibrosa oranye-cokelat berserat dengan nodul kalsium; saluran mengerucut berbentuk V lalu berhenti; lapisan dinding tetap terlihat di kedua sisi |
| Pohon arteri (kaki dan tubuh) | Pipa tipis yang putus-putus | Diameter hanya beberapa kubus, lalu dipecah oleh dither | Tabung halus (3,9× kaliber asli; 4,6× di perbandingan akhir): dinding kaca merah, kolom lumen yang berubah dari darah ke kontras, selongsong plak kuning |
| Kaki tembus pandang | Kulit dan otot menjadi kabut titik-titik | Dither pada kubus | Kaca dengan dither paling rapat di siluet: bentuk kaki tetap terbaca, otot dan arteri jelas di dalamnya |
| CTA | Tulang ber-dither menjadi noise abu-abu, pembuluh kasar | Kubus + transparansi | Volume rendering gading-putih halus seperti film CTA; tulang samar di belakang; kalsium putih paling terang dengan outline gelap |
| Pasien | Badan dari balok kaku | Model voxel | Tubuh halus (iso-surface) dengan rim light dan bayangan kontak; gerak jalan dan pegang betis tetap sama |
| Ruang CT dan sirkulasi | Versi voxel sederhana | — | Aset film CTA: gantry, meja, pasien di bawah selimut, kanula, injector, jalur kontras lewat jantung dan paru |

## Kenapa 360×640 ×3, bukan 540×960 ×2

Film CTA digambar pada grid 360×640 lalu diperbesar tepat 3× (nearest-neighbour) ke 1080×1920. Pikselnya lebih
besar dan tegas: itu ciri khas gaya yang diminta klien. Bentuknya tetap halus karena cahaya dihitung per titik model
dan transisi warnanya memakai dither teratur, bukan kubus.

## Yang tidak berubah

- Cerita, 21 adegan × 3 detik dan semua waktu kejadian (`EV`). Timing sheet untuk voice-over Azerbaijan tetap berlaku.
- Musik dan SFX (80 BPM, −22 LUFS, 72 SFX tepat pada kejadian gambar).
- Semua label, file label yang bisa diedit, dan versi clean tanpa teks.
- Peta lesi (L1 stenosis SFA, L2 oklusi popliteal, kolateral, L3 di bawah lutut) dan aturan medis
  (glukosa tidak menyumbat, plak di dalam dinding, kalsium ≠ kontras, CTA hanya mendiagnosis).

## Summary for the client (English)

Version 2 is rebuilt on the renderer of the CTA film:

- smooth shaded 3D models with dithered tone steps, rim light, small highlights and 1-px outlines;
- the artery close-ups pair a 3D lumen (glossy biconcave red cells) with a 2D pixel-art cut face of the wall:
  - endothelium, the internal elastic lamina, media and adventitia;
  - the plaque with its cap, lipid core and calcium;
  - the organised occlusion;
- a red-artery colour code, ivory volume-rendered CTA views, and the CTA film's scanner room and contrast route.

The story, the 3-second scene timing, the audio, the labels and the lesion map are unchanged, so the voice-over
timing sheet still applies.
