PERAN
Anda melanjutkan proyek "Gaple 2vs2": game gaple (domino) berbasis web, satu pemain manusia + 1 komputer sebagai partner melawan 2 komputer. Pemilik proyek sedang belajar web coding, jadi kerjakan dalam potongan kecil, jelaskan tiap keputusan dengan bahasa sederhana (Bahasa Indonesia), dan jangan melompat jauh.

CARA KERJA YANG SUDAH DISEPAKATI

- Satu potongan = kode + tes + pembaruan README.md, docs/DEVLOG.md (entri terbaru di atas), docs/GUIDE.md, lalu kirim sebagai zip dengan instruksi ekstrak yang jelas.
- Folder proyek pemilik (Windows, VS Code, Node 24, npm 11): D:\1. Job\Project\gaple-potongan-1\gaple. Zip diekstrak ke situ dengan "Replace the files in the destination". Di PowerShell, bila npm diblokir, pakai npm.cmd atau Command Prompt.
- Bahasa nama fungsi, berkas, komentar, dan dokumen: Indonesia.
- Jangan ubah keputusan tanpa bertanya. Ketidakcocokan antara brief dan kode dilaporkan, tidak diubah diam-diam.
- Berkas yang sengaja ditunda sampai diminta: CLAUDE.md, TECHSTACK.md, SKILSS.md, SECURITY.md.
- Brief lengkap ada di Claude Docs (18 bagian). Bagian 18 = catatan pengembangan berikutnya.

STACK SAAT INI (tahap A)
JavaScript ES modules ("type": "module"), tanpa build, tanpa pustaka luar. Tes: `node --test` (node:test, node:assert/strict). Server berkas: `npm run tampil` (bantu/server.js, http://localhost:8080). Rencana bertahap: A (sekarang) -> B (TypeScript + Vite + Vitest, sebelum tahap AI) -> C (online, ditunda).

STRUKTUR PERMAINAN
Tiga lapis: Pertandingan (bo3 atau bo5; tim pertama menang 2 atau 3 partai) > Partai (markah tiap tim naik dari 0; tim yang mencapai >= 100 kalah, lawannya +1 poin) > Kocokan (28 kartu, 7 per pemain, tanpa tumpukan ambil).
Pemain: 0 Selatan (manusia, tim 0 "Kita"), 1 Barat, 2 Utara (partner), 3 Timur (tim 1 "Lawan"); searah jarum jam; tim = nomor mod 2.

ATURAN (sudah diimplementasikan dan diverifikasi)

- Kartu {a, b, id} dengan a <= b, angka 0-6; nilai = a + b; balak bila a = b.
- Meja: rangkaian [{kartu, kiri, kanan}] + ujungKiri/ujungKanan. Lewat hanya sah bila tidak punya kartu legal.
- Pembukaan: rencana 'poin' (kocokan pertama partai: pemegang kartu sesuai poin pertandingan, mis. poin 0-0 -> kartu 0-0), 'balak' (calon = penutup, atau pada tabrak pemain tim pemenang dengan titik paling sedikit; wajib membuka dengan balak; tanpa balak hak pindah ke pemain berikutnya; keduanya tanpa balak -> kocok ulang), 'netral' (setelah tabrak seri: dibuka 0-0).
- Habis: tim LAWAN penutup menerima total sisa titik kedua pemainnya + bonus. Tabrak (meja berisi dan tak ada yang bisa main): tim bertitik lebih banyak menerima totalnya sendiri, tanpa bonus. Seri: tanpa markah.
- Bonus hanya saat habis: double +20 (kedua ujung sama), triplet +30 (menutup dengan balak), quartet +50 (keduanya). Nilai ada di konstanta BONUS (markah.js).
- Keputusan pemilik: kocokan netral setelah tabrak seri MEMAKAI NOMOR KOCOKAN BARU (kode benar; brief bagian 13 sudah disesuaikan). Opsi "nomor tidak naik" dicatat di brief bagian 18 untuk nanti.

ARSITEKTUR (src/)
Prinsip: semua logika berupa fungsi murni dan immutable; error dilempar untuk langkah ilegal; acak berbenih agar bisa diulang; hanya main.js yang menyentuh halaman dan waktu.

- rng.js: buatAcak(benih) (mulaiberry32), buatBenihBaru.
- engine.js: konstanta, buatKartu, buatDek, kocok (Fisher-Yates), bagi, giliranBerikutnya, timPemain.
- meja.js: sisiLegal, kartuLegal, letakkan, teksMeja. SISI_AWAL/KIRI/KANAN.
- pembuka.js: rencanaKocokanPertama(poin), rencanaKocokanBerikutnya(hasil), tentukanPembuka -> {status:'siap'|'ulang', ...}.
- akhir.js: akhirKocokan(state) -> null | {akhir:'habis', penutup} | {akhir:'tabrak'}; jenisBonus.
- markah.js: BATAS_MARKAH=100, BONUS, hitungHasil(state), terapkanHasil, pemenangPartai -> null | {kalah, menang} (indeks tim).
- kocokan.js: mulaiKocokan, kartuLegalPemain (memperhitungkan syarat pembuka), mainkan, lewat.
- partai.js: status 'siap' -> 'berjalan' -> 'ringkasan' -> 'siap' | 'selesai'. mulaiPartai(poin), bagiKocokan(partai, acak) (kocok ulang otomatis), mainkanPartai, lewatPartai, lanjutkanPartai. State: {poin, markah, nomorKocokan, rencana, status, kocokan, infoPembuka, hasilTerakhir, riwayatHasil, jumlahKocokUlang, pemenang}.
- pertandingan.js: mulaiPertandingan(format), mulaiPartaiBerikutnya, ubahPartai(p, fn), catatPartai. State: {format, target, poin, partai, riwayatPartai, juara}.
- simulasi.js: pemain acak (pilihLangkahAcak, langkahAcakPartai, mainAcakPertandingan) untuk tes dan sebagai AI Mudah.
- controller.js: jembatan murni mesin<->tampilan. Manusia = Selatan. menungguManusia, adaLangkahOtomatis, langkahOtomatis (komputer acak atau manusia tanpa kartu cocok lewat otomatis), pilihanKartu (bila kedua ujung meja sama, sisi dipilihkan 'kanan'), mainkanManusia. Alur aplikasi: state {pengaturan:{format, ai}, pertandingan|null}; layar DITURUNKAN lewat layarAktif() -> 'menu'|'meja'|'partai-selesai'|'akhir'; mulaiPermainan, lanjutkan, kembaliKeMenu, ubahPengaturan, rapikanPengaturan (data dari luar tidak dipercaya).
- penyimpanan.js: muatPengaturan/simpanPengaturan(storage, ...) dengan storage dioper sebagai argumen; kunci 'gaple:pengaturan:v1'; try/catch, fallback ke bawaan.
- tampilan/kartu-svg.js: svgKartu(awal, akhir, arah 'tegak'|'datar'), svgPunggung. Titik di kisi 3x3 tiap separuh; warna lewat kelas CSS (badan, garis, titik).
- tampilan/meja-html.js: htmlMeja(partai, {nomorPartai, dijeda, pilihan}). Kartu tangan berupa <button> (disabled bila tidak legal). Atribut data-kartu, data-sisi, data-aksi dipakai delegasi klik.
- tampilan/layar-html.js: htmlMenu, htmlPartaiSelesai, htmlAkhir (aturan singkat memakai angka yang sama dengan mesin).
- main.js: satu variabel state aplikasi, gambar() menulis ulang #app, satu pendengar 'click' dan satu 'change', setTimeout untuk langkah komputer. Parameter URL: ?benih=7 &jeda=700 (0 = tanpa jeda).
- bantu/ (alat uji, bukan game): skenario.js, pemeriksa.js (pemeriksa mandiri yang menulis ulang aturan TANPA impor dari src/ dan memutar ulang riwayat), gerbang.js, server.js. demo/potongan-2..6.js. docs/HASIL-SIMULASI.md.

DESAIN TAMPILAN

- Satu layar meja: bar atas (markah Kita/Lawan dengan batang menuju 100, "Poin a-b - Partai n - Kocokan n", tombol Jeda dan Menu); tiga lawan sebagai punggung kartu + jumlah sisa (Utara atas, Barat kiri, Timur kanan; di layar <= 640 px ketiganya sebaris di atas); rangkaian di tengah (kartu datar, dua ujung diberi garis aksen, dibungkus ke baris berikutnya); status giliran + langkah terakhir; tangan Anda di bawah (kartu legal terangkat berbingkai aksen, lainnya redup, menempel di bawah layar dengan position: sticky); tombol Kiri/Kanan/Batal bila perlu memilih sisi; ringkasan kocokan dengan tombol "Kocokan berikutnya" atau "Lihat hasil partai".
- Warna (variabel CSS di :root style.css): latar #14352b, meja #1d5a46, teks #f3efe3, aksen #ffd166, punggung kartu #7a2f35. Semua warna di CSS, SVG hanya memberi kelas.
- Aksesibilitas/mobile: target ketuk >= 44 px (lebar kartu tangan clamp(44px, 11vw, 56px)), minimal layar 360 px, <button> asli, aria-label pada kartu dan meja, prefers-reduced-motion dihormati, tanpa bunyi bawaan.

STATUS

- Tahap 1 (mesin aturan) selesai: gerbang lulus 10.002 kocokan resmi + 300.038 kocokan tambahan tanpa pelanggaran (statistik: habis 77,2%, tabrak 22,8%, seri 1,6%).
- Tahap 2 (potongan 7-8: kartu SVG, meja, ketukan, AI Mudah) dan tahap 3 (potongan 9: menu, bo3/bo5, antar partai, layar hasil, simpan pengaturan) selesai di kode. 188 tes lulus, versi 0.9.0. Diuji di browser otomatis (Playwright, 360 px dan 1280 px), BELUM di HP asli.
- Belum ada: saklar Bantuan hitung, AI Sedang dan Sulit (tombolnya sudah tampil nonaktif "segera"), pelacak kartu dan peluang, mode latihan, penyempurnaan visual (rangkaian masih membungkus seperti teks, belum melengkung seperti ular).

LANGKAH BERIKUTNYA YANG DIRENCANAKAN

1. Pemilik mencoba di HP/desktop dan melaporkan hal yang janggal.
2. Tahap 4: naik ke TypeScript + Vite + Vitest (tanpa mengubah perilaku; 188 tes dan gerbang harus tetap lulus), lalu AI Sedang (heuristik di brief bagian 6; menang > 60% partai melawan AI Mudah dalam 1.000 partai). AI hanya boleh menerima "pandangan seorang pemain", tidak pernah tangan pemain lain; tes memastikan keputusan tidak berubah bila tangan pemain lain diacak.
3. Tahap 5: pelacak kartu dan peluang (brief bagian 7). Tahap 6: AI Sulit dan mode latihan.

ATURAN KODE
Fungsi murni; tidak ada Math.random di logika (pakai acak berbenih); tes memakai benih tetap; helper uji di bantu/, bukan test/ (agar tidak terhitung sebagai tes); jangan menulis ulang kode mesin yang sudah lulus gerbang kecuali ada alasan dan gerbang dijalankan ulang (`npm run gerbang`).
