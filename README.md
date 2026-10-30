# Gaple 2vs2

Game gaple berbasis web: Anda bermain bersama rekan komputer melawan dua pemain komputer. Mainkan pertandingan lengkap, pilih tingkat lawan, dan aktifkan bantuan hitung kartu jika diperlukan.

> **Status:** Sudah bisa dimainkan dari awal hingga akhir pertandingan. AI Mudah dan Sedang tersedia; AI Sulit dan mode latihan masih direncanakan.

## Fitur

- Pertandingan **terbaik dari 3** atau **terbaik dari 5**.
- Pilihan lawan komputer tingkat **Mudah** atau **Sedang**.
- Tampilan meja dan rantai kartu yang menyesuaikan ukuran layar.
- Bantuan hitung untuk melihat kartu tersisa dan peluang kartu lawan.
- Pengaturan permainan tersimpan di browser.

## Mulai bermain

**Prasyarat:** Node.js 22.18 atau lebih baru.

```bash
npm install
npm run dev
```

Setelah server berjalan, buka [http://localhost:8080](http://localhost:8080). Game perlu dijalankan melalui server ini; membuka `index.html` langsung tidak akan berfungsi.

## Aturan singkat

Anda bermain sebagai **Selatan** bersama **Utara**, melawan **Barat** dan **Timur**. Setiap pemain mendapat 7 kartu. Sambungkan kartu ke ujung rantai dengan angka yang sama; jika tidak punya kartu yang cocok, giliran dilewati.

Kocokan berakhir saat seorang pemain menghabiskan kartu atau tidak ada pemain yang bisa melanjutkan. Tim mengumpulkan markah berdasarkan kartu yang tersisa, dan tim yang markahnya mencapai 100 kalah partai. Menangkan 2 partai dalam format terbaik dari 3, atau 3 partai dalam format terbaik dari 5, untuk menjadi juara.

## Untuk pengembang

Lihat [README-DEV.md](./README-DEV.md) untuk perintah pengembangan dan struktur proyek, atau [panduan proyek](./docs/GUIDE.md) untuk detail teknis. Catatan perkembangan tersedia di [DEVLOG](./docs/DEVLOG.md).
