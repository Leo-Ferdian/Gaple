# TECHSTACK.md

| Bagian               | Pilihan                                     | Catatan                                                          |
| -------------------- | ------------------------------------------- | ---------------------------------------------------------------- |
| Bahasa               | TypeScript 7 (mode ketat)                   | Node menjalankan `.ts` langsung untuk skrip `demo/` dan `bantu/` |
| Runtime              | Node >= 22.18                               | Hanya untuk pengembangan, tes, dan build                         |
| Build dan dev server | Vite 8                                      | Target `es2022`, keluaran `dist/`, dev di port 8080              |
| Tes                  | Vitest 5                                    | `test/**/*.test.ts`; sebagian tes memainkan ribuan kocokan       |
| Format               | Prettier 3                                  | `npm run format:cek`                                             |
| Pemeriksa aturan     | `bantu/periksa-aturan.ts`                   | Larangan `any`, `as`, `!`, `@ts-ignore`                          |
| Tampilan             | HTML, CSS, SVG buatan sendiri               | Tanpa kerangka kerja UI, tanpa pustaka runtime                   |
| Penyimpanan          | `localStorage`                              | Hanya pengaturan menu; dibungkus agar aman di mode pribadi       |
| CI                   | GitHub Actions (`.github/workflows/ci.yml`) | Node 22; typecheck, aturan, format, tes, build, gerbang          |

## Prinsip

- Tanpa dependensi runtime: semua paket di `devDependencies`. Hasil build hanya berkas statis (`dist/`) yang bisa dihosting di mana saja.
- Mesin permainan murni dan berbenih, sehingga kocokan bisa diulang dan diuji.
- Arsitektur berlapis (lihat `docs/GUIDE.md` bagian 2c): mesin, kontrol, tampilan, lalu `main.ts`.

## Menambah dependensi

Hanya bila benar-benar perlu. Catat alasannya di `docs/DEVLOG.md` dan perbarui berkas ini.
