# SKILSS.md

Kemampuan dan pengetahuan yang dibutuhkan untuk mengerjakan proyek ini, dan tempat mempelajarinya di dalam proyek.

| Bidang                                        | Dipakai untuk                                                     | Rujukan                                                    |
| --------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------- |
| TypeScript ketat                              | Seluruh kode; tipe sebagai penjaga aturan                         | `docs/GUIDE.md` bagian 2b dan 3                            |
| Aturan gaple                                  | Mesin, pembuka, markah, bonus (double 20, triplet 30, quartet 50) | `src/engine.ts`, `src/markah.ts`, `docs/GUIDE.md` bagian 8 |
| Pemrograman fungsional (murni, tidak berubah) | Keadaan permainan dan tes yang bisa diulang                       | `src/rng.ts`, `src/kocokan.ts`                             |
| Probabilitas dan pemrograman dinamis          | Pelacak kartu dan peluang lawan                                   | `src/pelacak.ts`                                           |
| Simulasi Monte Carlo (determinisasi)          | AI Sulit                                                          | `src/ai-sulit.ts`, `npm run demo:sulit`                    |
| Geometri 2D                                   | Tata letak rantai, belokan, balak di sudut, kamera                | `src/tampilan/tata-rantai.ts`                              |
| SVG, HTML, CSS                                | Kartu, meja, layar menu                                           | `src/tampilan/`, `style.css`                               |
| Pengujian                                     | Tes sifat atas ribuan kocokan acak, tes kekuatan AI               | `test/`, `bantu/gerbang.ts`                                |
| Git dan GitHub                                | CI, rilis                                                         | `.github/workflows/ci.yml`, `SECURITY.md`                  |

## Kebiasaan yang diharapkan

- Menulis tes bersama kode, dan mengujinya dengan data acak berbenih, bukan satu contoh saja.
- Mencatat keputusan di `docs/DEVLOG.md` dan memperbarui `docs/GUIDE.md`.
- Memverifikasi tampilan di peramban (desktop) setelah mengubah `src/tampilan/` atau `style.css`.
