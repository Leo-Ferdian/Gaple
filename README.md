# Gaple 2vs2

Game gaple 2vs2 berbasis web: satu pemain manusia berpasangan dengan satu komputer, melawan dua komputer.

**Status:** game sudah bisa dimainkan satu pertandingan penuh (tahap 1 sampai 6 selesai, plus tata letak rantai; lawan bisa AI Mudah, Sedang, atau Sulit). Migrasi ke TypeScript selesai (potongan 11 sampai 18, bukti di `docs/VALIDASI-MIGRASI.md`). Ada saklar Bantuan hitung (kartu tersisa dan peluang kartu lawan). Mode Latihan menambah tombol Saran (langkah terbaik menurut AI Sulit). Semua tahap peta jalan sudah selesai. Lihat `docs/DEVLOG.md` untuk perkembangan.

## Struktur permainan

- **Pertandingan:** bo3 atau bo5. Tim yang lebih dulu menang 2 partai (bo3) atau 3 partai (bo5) menjadi juara.
- **Partai:** rangkaian kocokan. Markah (nyawa) tiap tim mulai dari 0. Tim yang markahnya lebih dulu mencapai 100 kalah partai, lawannya mendapat 1 poin.
- **Kocokan:** satu kali bagi 28 kartu (7 per pemain) sampai ada yang habis atau terjadi tabrak.

Aturan lengkap ada di brief proyek (bagian 3) dan diringkas di `docs/GUIDE.md`.

## Prasyarat

- [Node.js](https://nodejs.org) versi 22.18 atau lebih baru (disarankan versi LTS terbaru). Versi ini menjalankan berkas TypeScript langsung, dipakai oleh skrip demo dan gerbang.
- Sekali setelah mengekstrak proyek (dan setiap `package.json` berubah): `npm install`.

Cek Node.js:

```
node --version
```

## Perintah

Jalankan dari folder proyek (folder yang berisi `package.json`):

| Perintah | Fungsi |
| --- | --- |
| `npm install` | Memasang alat (TypeScript, Vite, Vitest, Prettier) ke folder `node_modules` |
| `npm run dev` | Menjalankan game di http://localhost:8080 (memuat ulang otomatis saat kode berubah). Parameter halaman: `?benih=7` (kocokan sama), `?jeda=0` (komputer tanpa jeda) |
| `npm run build` | Membuat versi produksi di folder `dist` (tidak dimasukkan ke repository) |
| `npm run preview` | Menjalankan hasil build untuk dicoba di browser |
| `npm run typecheck` | Memeriksa tipe TypeScript (harus bersih) |
| `npm run aturan` | Memeriksa aturan penulisan: tanpa `any`, tanpa `as` (kecuali `as const`), tanpa `!` penegas, tanpa `@ts-ignore` |
| `npm run format:cek` / `npm run format` | Memeriksa / merapikan format kode dengan Prettier |
| `npm run cek` | Semua pemeriksaan sekaligus: typecheck, aturan, format, tes, build. Jalankan sebelum menyerahkan pekerjaan |
| `npm test` | Menjalankan semua pengujian (Vitest) |
| `npm run test:watch` | Pengujian yang berjalan ulang otomatis saat file berubah |
| `npm run demo` | Satu pertandingan penuh (bo3) secara acak sampai ada juara (benih bawaan 7) |
| `npm run demo -- 123 bo5` | Benih 123, format bo5. Benih sama selalu menghasilkan pertandingan sama |
| `npm run gerbang` | Gerbang tahap 1: 10.000 kocokan acak, tiap kocokan diperiksa ulang oleh pemeriksa mandiri, lalu mencetak statistik |
| `npm run gerbang -- 100000 500` | 100.000 kocokan mulai benih 500 |
| `npm run demo:sulit` | Mengukur kekuatan AI Sulit melawan Sedang dan Mudah (`-- 400 5`: 400 partai, benih 5; lambat, beberapa menit) |
| `npm run demo:ai` | Mengukur kekuatan AI Sedang melawan AI Mudah (`-- 1000 5`: 1000 partai, benih 5) |
| `npm run demo:4` | Demo potongan 4: satu partai penuh dengan markah dan bonus |
| `npm run demo:3` | Demo potongan 3: rantai kocokan dan aturan pembuka |
| `npm run demo:2` | Demo potongan 2: satu kocokan acak langkah demi langkah |

Untuk membuka game: `npm install` (sekali), lalu `npm run dev`, lalu buka http://localhost:8080. Halaman tidak bisa dibuka dengan klik dua kali pada `index.html`, karena browser menolak memuat modul dari `file://`.

## Struktur folder

```
gaple/
  package.json
  tsconfig.json   pengaturan TypeScript (ketat)
  vite.config.ts  pengaturan Vite (dev, build) dan Vitest (tes)
  .gitignore      node_modules, dist, dan artefak lain tidak masuk repository
  .prettierrc.json  format kode (kutip tunggal, lebar 140)
  .editorconfig   indentasi dan akhir baris
  .github/workflows/ci.yml  pemeriksaan otomatis tiap push dan pull request
  README.md
  index.html      halaman game (potongan 7)
  style.css       tampilan meja dan kartu
  docs/
    DEVLOG.md       catatan pengembangan dari awal sampai selesai
    HASIL-SIMULASI.md  hasil gerbang tahap 1 (10.000 kocokan, statistik)
    VALIDASI-MIGRASI.md  bukti validasi akhir migrasi TypeScript
    GUIDE.md        panduan struktur, alur, fungsi, dan istilah
  src/
    rng.ts          pembangkit angka acak berbenih (TypeScript)
    engine.ts       kartu, dek, kocok, bagi (TypeScript)
    meja.ts         rangkaian di meja, kartu legal, menyambung (TypeScript)
    pembuka.ts      aturan siapa dan dengan kartu apa kocokan dibuka
    akhir.ts        kapan kocokan berakhir (habis atau tabrak) dan bonus penutup
    markah.ts       hasil kocokan, markah tim, pemenang partai
    tipe-kocokan.ts bentuk data state kocokan dan riwayat (hanya tipe)
    partai.ts       alur satu partai: bagi, main, ringkasan, selesai
    pertandingan.ts alur bo3 atau bo5: poin, partai berikutnya, juara
    kocokan.ts      state kocokan, main, lewat
    simulasi.ts     memainkan kocokan (acak atau dengan kebijakan lain) untuk uji dan demo
    ai-sedang.ts    pemain komputer tingkat Sedang: menilai tiap langkah legal
    pelacak.ts      pandangan seorang pemain, kartu keluar, peluang tepat kartu lawan, dugaan tangan lawan
    ai-sulit.ts     pemain komputer tingkat Sulit: dugaan tangan lawan + simulasi tiap langkah
    controller.ts   jembatan mesin dan tampilan: giliran manusia, langkah komputer
    penyimpanan.ts  simpan dan muat pengaturan (localStorage), aman bila ditolak browser
    main.ts         titik masuk browser (satu-satunya yang menyentuh halaman)
    tampilan/
      kartu-svg.ts  menggambar kartu domino sebagai SVG
      meja-html.ts  state partai menjadi HTML meja
      tata-rantai.ts posisi dan putaran tiap kartu rantai di meja (anchor, belok, skala)
      rangkaian-svg.ts seluruh rantai sebagai satu gambar SVG
      layar-html.ts menu, akhir partai, akhir pertandingan
  demo/
    bersama.ts      pembantu skrip demo (namaPemain, wajib)
    potongan-2.ts   demo satu kocokan di terminal
    potongan-3.ts   demo rantai kocokan dan aturan pembuka
    potongan-4.ts   demo satu partai penuh dengan markah dan bonus
    potongan-5.ts   demo satu pertandingan penuh sampai juara
    potongan-6.ts   skrip gerbang tahap 1 (npm run gerbang)
    ai-sedang.ts    ukur kekuatan AI Sedang (npm run demo:ai)
    ai-sulit.ts     ukur kekuatan AI Sulit (npm run demo:sulit)
  bantu/
    skenario.ts     kocokan buatan sendiri untuk pengujian (bukan tes)
    bantuan-tes.ts  pembantu tes bertipe: empat(), nomor(), ada()
    pemeriksa.ts    pemeriksa mandiri: memutar ulang kocokan dari riwayatnya
    gerbang.ts      pelari gerbang: pertandingan acak, pemeriksaan, statistik
    aturan.ts       pemeriksa aturan penulisan (pengganti lint, lihat docs/GUIDE.md)
    periksa-aturan.ts  menjalankan aturan.ts pada semua berkas (npm run aturan)
  test/
    rng.test.ts
    engine.test.ts
    meja.test.ts
    tipe-domain.test.ts
    tipe-kocokan.test.ts
    kocokan.test.ts
    pembuka.test.ts
    kocokan-pembuka.test.ts
    akhir.test.ts
    markah.test.ts
    partai.test.ts
    pertandingan.test.ts
    gerbang.test.ts
    integrasi.test.ts
    aturan.test.ts
    tampilan.test.ts
    controller.test.ts
    alur.test.ts
    penyimpanan.test.ts
    tata-rantai.test.ts
```

## Tahap pengerjaan

1. Mesin aturan dan pengujiannya (selesai)
   - Potongan 1: kartu, dek, pengacak (selesai)
   - Potongan 2: meja, kartu legal, main dan lewat (selesai)
   - Potongan 3: aturan pembuka (selesai)
   - Potongan 4: akhir kocokan, markah, bonus (selesai)
   - Potongan 5: partai dan pertandingan (selesai)
   - Potongan 6: simulasi 10.000 kocokan (selesai, lulus tanpa pelanggaran)
2. Tampilan dasar
   - Potongan 7: kartu SVG dan meja statis (selesai)
   - Potongan 10: tata letak rantai di meja, belok dan skala otomatis (selesai)
   - Potongan 11 sampai 18: migrasi TypeScript + Vite + Vitest, tes integrasi, format, aturan penulisan, CI, validasi akhir (selesai)
   - Potongan 8: memainkan kartu dengan ketukan melawan AI Mudah (selesai)
3. Alur pertandingan
   - Potongan 9: menu, format bo3/bo5, antar partai, layar hasil, simpan pengaturan (selesai)
4. AI Sedang (selesai: menang sekitar 80% melawan AI Mudah)
5. Pelacak kartu dan peluang (selesai: saklar Bantuan hitung di menu, panel di meja)
6. AI Sulit dan mode latihan (selesai: Sulit menang sekitar 70-76% melawan Sedang)
