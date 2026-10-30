// bantu/skenario.ts: kocokan buatan sendiri untuk pengujian.
//
// Folder ini sengaja di luar `test/` supaya `node --test` tidak menjalankannya
// sebagai tes. Dipakai oleh test/akhir.test.ts dan test/markah.test.ts.

import { buatKartu } from '../src/engine.ts';
import type { EmpatTangan, Kartu, NomorPemain } from '../src/engine.ts';
import { SISI_AWAL, SISI_KIRI, SISI_KANAN } from '../src/meja.ts';
import type { Sisi } from '../src/meja.ts';
import type { StateKocokan } from '../src/tipe-kocokan.ts';
import { mulaiKocokan, mainkan, lewat } from '../src/kocokan.ts';

const k = buatKartu;

/**
 * Menjalankan daftar langkah dari tangan buatan sendiri.
 * Langkah: ['m', pemain, kartu, sisi] untuk main, ['l', pemain] untuk lewat.
 */
export type Langkah = readonly ['m', NomorPemain, Kartu, Sisi] | readonly ['l', NomorPemain];

export function jalankan(tangan: EmpatTangan, pembuka: NomorPemain, langkah: readonly Langkah[]): StateKocokan {
  let state = mulaiKocokan(tangan, pembuka);
  for (const l of langkah) {
    state = l[0] === 'm' ? mainkan(state, l[1], l[2], l[3]) : lewat(state, l[1]);
  }
  return state;
}

// ---------------------------------------------------------------------------
// Skenario siap pakai
// ---------------------------------------------------------------------------

/** Selatan menutup dengan satu kartu: tanpa bonus. Rekan penutup masih pegang 6-6. */
export const habisBiasa = (): StateKocokan =>
  jalankan([[k(2, 3)], [k(3, 5), k(1, 1)], [k(6, 6)], [k(0, 4)]], 0, [['m', 0, k(2, 3), SISI_AWAL]]);

/** Timur menutup dengan 1-3 sehingga kedua ujung jadi 3: double. */
export const habisDouble = (): StateKocokan =>
  jalankan([[k(1, 2), k(6, 6)], [k(2, 3), k(4, 5)], [k(5, 6)], [k(1, 3)]], 0, [
    ['m', 0, k(1, 2), SISI_AWAL], // [1|2]
    ['m', 1, k(2, 3), SISI_KANAN], // [1|2][2|3]
    ['l', 2],
    ['m', 3, k(1, 3), SISI_KIRI], // [3|1][1|2][2|3]
  ]);

/** Barat menutup dengan balak 2-2, ujung 1 dan 2 tidak sama: triplet. */
export const habisTriplet = (): StateKocokan =>
  jalankan([[k(1, 2), k(6, 6)], [k(2, 2)], [k(0, 1)], [k(3, 4)]], 0, [
    ['m', 0, k(1, 2), SISI_AWAL],
    ['m', 1, k(2, 2), SISI_KANAN],
  ]);

/** Timur menutup dengan balak 3-3 saat kedua ujung 3: quartet. Sisa lawan 5-5 dan 6-6. */
export const habisQuartet = (): StateKocokan =>
  jalankan([[k(1, 2), k(5, 5)], [k(2, 3), k(4, 5)], [k(1, 3), k(6, 6)], [k(3, 3)]], 0, [
    ['m', 0, k(1, 2), SISI_AWAL], // ujung 1 dan 2
    ['m', 1, k(2, 3), SISI_KANAN], // ujung 1 dan 3
    ['m', 2, k(1, 3), SISI_KIRI], // ujung 3 dan 3
    ['m', 3, k(3, 3), SISI_KIRI], // menutup
  ]);

/** Tabrak: kartu 1-2 di meja, tidak ada yang cocok. Sisa tim 0 = 18, tim 1 = ikut parameter. */
export const tabrak = (kartuTimur: Kartu, kartuUtara: Kartu = k(4, 4)): StateKocokan =>
  jalankan([[k(1, 2), k(5, 5)], [k(6, 6)], [kartuUtara], [kartuTimur]], 0, [['m', 0, k(1, 2), SISI_AWAL]]);
