# HASIL SIMULASI: gerbang tahap 1

Versi kode: 0.22.0. Benih 1 sampai 518 (bo3 untuk benih ganjil, bo5 untuk benih genap). Semua pemain bermain acak.

**Hasil: 10.002 kocokan dalam 1.738 partai dan 518 pertandingan, tanpa satu pelanggaran aturan pun.**

Tiap kocokan diperiksa ulang oleh pemeriksa mandiri (`bantu/pemeriksa.ts`) yang tidak memakai kode di `src/`: dek lengkap, giliran, kartu menyambung, lewat hanya bila tidak punya kartu cocok, berakhir tepat saat habis atau tabrak, pembuka sesuai rencana, markah, bonus, dan rencana kocokan berikutnya.

## Akhir kocokan

| Hal | Jumlah | Persentase |
| --- | --- | --- |
| Habis | 7717 | 77,2% dari kocokan |
| Tabrak | 2285 | 22,8% dari kocokan |
| Tabrak seri (kocokan netral berikutnya) | 160 | 1,6% dari kocokan |
| Bonus double | 1244 | 16,1% dari yang habis |
| Bonus triplet | 1072 | 13,9% dari yang habis |
| Bonus quartet | 203 | 2,6% dari yang habis |

## Panjang kocokan

- Langkah per kocokan (main dan lewat): rata-rata 25,79, terpendek 11, terpanjang 39.
- Lewat per kocokan: rata-rata 3,19.
- Markah yang ditambahkan dalam sebuah kocokan (kocokan tabrak seri tidak dihitung): rata-rata 27,90, terkecil 1, terbesar 95.

## Pembukaan kocokan

| Jenis | Jumlah |
| --- | --- |
| Berdasarkan poin (kocokan pertama partai) | 1738 |
| Wajib balak (kocokan berikutnya) | 8104 |
| Netral (setelah tabrak seri) | 160 |

- Hak membuka pindah karena calon tanpa balak: 773 dari 8104 kocokan wajib balak (9,5%).
- Kocok ulang karena kocokan tidak adil: 24 kali dari 10002 pembagian yang berhasil (0,2% dari seluruh pembagian).

## Partai dan pertandingan

- Kocokan per partai: rata-rata 5,75, terpendek 2, terpanjang 12.
- Kemenangan partai: tim 0 824, tim 1 914 (kedua tim sama kuat, selisihnya hanya kebetulan).
- Juara pertandingan: tim 0 236, tim 1 282.

| Jumlah partai | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- |
| bo3 | 121 | 138 | - | - |
| bo5 | - | 62 | 89 | 108 |

