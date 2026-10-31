# SECURITY.md

## Cakupan

Game ini berjalan sepenuhnya di peramban. Tidak ada server, akun, atau data pribadi. Satu-satunya data yang disimpan adalah pengaturan menu di `localStorage` perangkat pemain.

## Melaporkan kerentanan

Laporkan lewat GitHub: tab **Security** > **Report a vulnerability** (laporan pribadi). Bila tidak tersedia, buka issue tanpa rincian eksploit dan minta kontak pribadi. Sertakan versi (lihat `package.json`), langkah menirukan, dan dampaknya.

## Praktik yang dipakai

- Tanpa dependensi runtime; semua paket hanya untuk pengembangan. `package-lock.json` dikomit dan CI memakai `npm ci`.
- Tampilan dibuat dari teks HTML/SVG yang dirangkai kode sendiri. Teks dari luar (tidak ada saat ini) harus di-escape sebelum disisipkan.
- `localStorage` dibaca dengan penjagaan (try/catch dan validasi bentuk data); data rusak diganti nilai bawaan.
- Jalankan `npm audit` secara berkala dan perbarui paket yang rentan.
- Jangan mengomit rahasia (token, kunci). Rilis dan hosting memakai rahasia GitHub, bukan berkas di repositori.

## Versi yang didukung

Hanya versi terbaru pada cabang utama.
