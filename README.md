<div align="center">

# 🁣 Gaple 2vs2

**Game gaple berbasis web: Anda dan komputer melawan dua komputer.**

Berjalan penuh di peramban. Tanpa server, tanpa akun, tanpa dependensi runtime.

![versi](https://img.shields.io/badge/versi-0.31.0-blue) ![node](https://img.shields.io/badge/node-%3E%3D22.18-green) ![typescript](https://img.shields.io/badge/TypeScript-ketat-3178c6) ![tes](https://img.shields.io/badge/tes-278%20lolos-brightgreen)

</div>

## Ringkasan

Anda berpasangan dengan Rekan (komputer) melawan Lawan Kiri dan Lawan Kanan. Satu pertandingan terdiri dari beberapa partai, dan tiap partai dimainkan dalam beberapa kocokan sampai satu tim mencapai markah 100.

## Fitur

- **Pertandingan bo3 atau bo5** dengan bonus double 20, triplet 30, dan quartet 50.
- **Tiga tingkat AI:** Mudah, Sedang (menilai tiap langkah), dan Sulit (menduga tangan lawan, lalu mensimulasikan langkah).
- **Bantuan hitung:** kartu yang sudah keluar, sisa per angka, dan peluang kartu lawan.
- **Mode Latihan:** pertandingan biasa dengan Bantuan hitung dan tombol Saran (langkah terbaik menurut AI Sulit).
- **Rantai kartu rapi:** kartu yang sudah keluar tidak pernah berpindah, belokan siku, balak di sudut berdiri melintang, dan ukuran kartu menyesuaikan layar desktop.
- **Terasa hidup:** kartu meluncur dari kursi pemain, kartu dibagi satu per satu, penanda giliran, +markah dan cap bonus, kontrol papan ketik (Tab, Enter, panah, Esc, P). Kartu sisa lawan terbuka di akhir kocokan, zoom halus saat rantai mengecil, pratinjau bayangan di dua ujung saat memilih sisi, papan skor berhitung, ketukan kartu, balon Lewat, dan jeda berpikir komputer yang menyesuaikan jumlah pilihan. Tingkat animasi Penuh, Kurang, atau Mati di menu; otomatis mati bila sistem meminta gerak dikurangi.
- **Tampilan warung malam:** meja beludru di bingkai kayu, papan skor kapur, dan efek suara sintetis (bisa dimatikan).
- **Tema warna:** Hijau, Biru, Anggur, dan Kontras tinggi.
- **Pengaturan tersimpan** di peramban.

## Aturan singkat

| Tingkat    | Arti                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------ |
| Kocokan    | 28 kartu dibagi 7 per pemain; main sampai ada yang habis atau tabrak (tidak ada yang bisa jalan) |
| Partai     | Rangkaian kocokan; tim yang lebih dulu mencapai markah (penalti) 100 kalah                       |
| Pertandingan | Tim yang lebih dulu menang 2 partai (bo3) atau 3 partai (bo5) menjadi juara                    |

Aturan lengkap dan istilah ada di [`docs/GUIDE.md`](docs/GUIDE.md).

## Mulai cepat

Prasyarat: [Node.js](https://nodejs.org) 22.18 atau lebih baru.

```bash
npm install
npm run dev
```

Buka http://localhost:8080. Halaman tidak bisa dibuka dengan klik dua kali pada `index.html`, karena peramban menolak memuat modul dari `file://`.

| Parameter alamat | Fungsi                                |
| ---------------- | ------------------------------------- |
| `?benih=7`       | Kocokan yang sama setiap kali         |
| `?jeda=0`        | Komputer bermain tanpa jeda           |

Untuk versi produksi: `npm run build`, lalu `npm run preview` (http://localhost:4173). Build ulang setiap kode berubah, karena preview menyajikan folder `dist`. Hasil build berupa berkas statis yang bisa dihosting di mana saja (mis. GitHub Pages).

## Perintah

| Perintah                            | Fungsi                                                         |
| ----------------------------------- | -------------------------------------------------------------- |
| `npm run dev`                       | Server pengembangan                                            |
| `npm run build` / `npm run preview` | Build produksi ke `dist/` / mencobanya                         |
| `npm run cek`                       | Typecheck, aturan penulisan, format, tes, dan build sekaligus  |
| `npm test`                          | Semua tes (Vitest)                                             |
| `npm run gerbang`                   | 10.000 kocokan acak diperiksa ulang oleh pemeriksa mandiri     |
| `npm run demo`                      | Satu pertandingan penuh di terminal (`-- 123 bo5`: benih, format) |
| `npm run demo:ai` / `demo:sulit`    | Mengukur kekuatan AI (`demo:sulit` lambat)                     |

Daftar perintah lengkap ada di [`docs/GUIDE.md`](docs/GUIDE.md).

## Kekuatan AI

Diukur dengan kursi ditukar ([`docs/DEVLOG.md`](docs/DEVLOG.md) memuat rinciannya):

| Pertandingan         | Hasil                         |
| -------------------- | ----------------------------- |
| Sedang melawan Mudah | menang 87,5% (1.200 partai)   |
| Sulit melawan Sedang | menang 62,0% (200 partai)     |
| Sulit melawan Mudah  | menang 93,0% (200 partai)     |

## Arsitektur

Mesin permainan murni, tidak berubah (immutable), dan berbenih, sehingga setiap kocokan bisa diulang dan diuji.

```
src/
  engine, meja, pembuka, akhir, markah   aturan kocokan
  partai, pertandingan, kocokan          alur permainan
  pelacak, ai-sedang, ai-sulit           pemain komputer
  controller, penyimpanan                jembatan mesin dan tampilan
  suara                                  efek suara sintetis
  tampilan/                              kartu SVG, meja HTML, tata letak rantai
  main.ts                                satu-satunya yang menyentuh halaman
bantu/    alat uji (pemeriksa mandiri, gerbang, aturan penulisan)
demo/     skrip demo dan pengukuran
test/     tes Vitest
docs/     panduan, catatan, hasil simulasi
```

Teknologi: TypeScript 7 (ketat), Vite, Vitest, Prettier ([`TECHSTACK.md`](TECHSTACK.md)).

## Dokumen

| Berkas                                                 | Isi                                      |
| ------------------------------------------------------ | ---------------------------------------- |
| [`docs/GUIDE.md`](docs/GUIDE.md)                       | Panduan struktur, alur, fungsi, istilah  |
| [`docs/DEVLOG.md`](docs/DEVLOG.md)                     | Catatan pengembangan                     |
| [`docs/HASIL-SIMULASI.md`](docs/HASIL-SIMULASI.md)     | Hasil gerbang 10.000 kocokan             |
| [`docs/VALIDASI-MIGRASI.md`](docs/VALIDASI-MIGRASI.md) | Bukti migrasi ke TypeScript              |
| [`CLAUDE.md`](CLAUDE.md)                               | Petunjuk untuk asisten AI dan pengembang |
| [`TECHSTACK.md`](TECHSTACK.md)                         | Teknologi yang dipakai                   |
| [`SKILSS.md`](SKILSS.md)                               | Kemampuan yang dibutuhkan                |
| [`SECURITY.md`](SECURITY.md)                           | Kebijakan keamanan dan cara melapor      |

## Berkontribusi

Jalankan `npm run cek` sebelum mengirim perubahan. CI menjalankan pemeriksaan yang sama ditambah `npm run gerbang`. Setiap perubahan disertai tes dan entri baru di `docs/DEVLOG.md`.

## Rilis

Naikkan versi di `package.json`, push, lalu `git tag vX.Y.Z` dan `git push origin vX.Y.Z`. GitHub Actions menjalankan semua pemeriksaan dan membuat rilis berisi `gaple-vX.Y.Z.zip` (hasil build; sajikan lewat server statis).
