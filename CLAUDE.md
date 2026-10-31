# CLAUDE.md

Petunjuk untuk asisten AI (dan pengembang) yang mengubah proyek ini. Bahasa kode, komentar, dan dokumen: Bahasa Indonesia.

## Proyek

Game gaple 2vs2 berbasis web. Satu pemain (Selatan) dan mitra komputer (Utara) melawan Barat dan Timur. Struktur: pertandingan (bo3 atau bo5) > partai (sampai markah 100) > kocokan. Peta lengkap ada di `docs/GUIDE.md`.

## Perintah

- `npm install`, lalu `npm run cek` (typecheck, aturan, format, tes, build). Harus hijau sebelum menyerahkan pekerjaan.
- `npm run dev` untuk pengembangan, `npm run build` lalu `npm run preview` untuk mencoba hasil build (port 4173 menyajikan folder `dist`, jadi build ulang dulu).

## Aturan kode

- TypeScript ketat: tanpa `any`, tanpa `as` (kecuali `as const`), tanpa `!`, tanpa `@ts-ignore`. Diperiksa `npm run aturan`.
- Mesin permainan murni dan tidak berubah (immutable); acak hanya lewat `src/rng.ts` dengan benih.
- Hanya `src/main.ts` yang menyentuh halaman. `src/tampilan/` hanya menghasilkan teks HTML/SVG.
- AI dan pelacak membaca keadaan hanya lewat `pandangan()` di `src/pelacak.ts` (tidak boleh mengintip tangan lawan).
- Tata letak rantai (`src/tampilan/tata-rantai.ts`) terkunci: kartu yang sudah keluar tidak boleh berpindah atau berubah bentuk. Tes `posisi terkunci` menjaga ini.

## Cara bekerja

- Setiap perubahan: kode + tes + `README.md` bila perlu + `docs/GUIDE.md` + entri baru di bagian atas `docs/DEVLOG.md` + naikkan versi di `package.json`.
- Jangan mengubah keputusan yang sudah diambil tanpa memberi tahu; laporkan bila ada beda antara permintaan dan kode.
- Jawaban singkat dan langsung.
- Bila pengantaran lewat zip: zip tidak menghapus berkas, jadi buat `HAPUS.txt` hanya bila ada berkas lain yang memang harus dihapus.
- Satu proses saja yang mengubah folder proyek dalam satu waktu.

## Berkas terkait

`docs/GUIDE.md` (panduan), `docs/DEVLOG.md` (catatan proses), `TECHSTACK.md`, `SKILSS.md`, `SECURITY.md`.
