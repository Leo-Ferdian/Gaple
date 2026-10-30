// rng.ts: pembangkit angka acak berbenih (seed).
//
// Kenapa tidak pakai Math.random()?
// Math.random() menghasilkan angka berbeda setiap dijalankan dan tidak bisa
// diulang. Untuk game kartu kita ingin kocokan yang BISA DIULANG: dengan benih
// yang sama, urutan kartu selalu sama. Ini memudahkan mencari bug dan menguji.
//
// Algoritma yang dipakai: mulberry32 (kecil, cepat, cukup untuk game).

/** Fungsi acak: tiap pemanggilan menghasilkan desimal dari 0 (termasuk) sampai 1 (tidak termasuk). */
export type FungsiAcak = () => number;

/**
 * Membuat fungsi acak dari sebuah benih.
 * Setiap pemanggilan fungsi yang dikembalikan menghasilkan angka desimal
 * antara 0 (termasuk) dan 1 (tidak termasuk), mirip Math.random().
 *
 * @param benih bilangan bulat apa saja, misalnya 12345
 */
export function buatAcak(benih: number): FungsiAcak {
  // `>>> 0` memaksa angka menjadi bilangan bulat 32-bit tanpa tanda.
  let keadaan = benih >>> 0;

  return function acak(): number {
    // Math.imul adalah perkalian bilangan bulat 32-bit yang aman.
    keadaan = (keadaan + 0x6d2b79f5) >>> 0;
    let t = keadaan;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Membuat benih baru dari waktu saat ini. Dipakai saat game dimulai tanpa
 * benih yang ditentukan. Benih ini sebaiknya disimpan supaya kocokan bisa diulang.
 */
export function buatBenihBaru(): number {
  return Date.now() % 2147483647;
}
