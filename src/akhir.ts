// akhir.ts: kapan sebuah kocokan berakhir, dan bonus apa yang didapat penutup.
//
// Kocokan berakhir dalam dua cara:
//   - HABIS : seorang pemain menghabiskan kartunya. Dialah penutup.
//   - TABRAK: meja sudah berisi, dan tidak ada satu pun pemain yang bisa
//             memainkan kartu (buntu).
//
// Fungsi di sini hanya MEMBACA state. Menghitung markah ada di markah.ts.

import { adalahBalak } from './engine.ts';
import type { NomorPemain } from './engine.ts';
import { adaKartuLegal } from './meja.ts';
import type { StateKocokan } from './tipe-kocokan.ts';

export type AkhirHabis = { readonly akhir: 'habis'; readonly penutup: NomorPemain };
export type AkhirTabrak = { readonly akhir: 'tabrak' };
export type AkhirKocokan = AkhirHabis | AkhirTabrak;

export type JenisBonus = 'double' | 'triplet' | 'quartet';

/**
 * Apakah kocokan sudah berakhir?
 * null berarti kocokan masih berjalan.
 */
export function akhirKocokan(state: StateKocokan): AkhirKocokan | null {
  const { tangan } = state;
  // Urutan pemeriksaan sama dengan nomor pemain: yang kosong lebih dulu menang.
  for (const pemain of [0, 1, 2, 3] as const) {
    if (tangan[pemain].length === 0) return { akhir: 'habis', penutup: pemain };
  }

  // Di meja kosong pembuka selalu bisa jalan, jadi tabrak hanya mungkin sesudah
  // ada kartu di meja.
  if (state.meja.rangkaian.length > 0 && tangan.every((t) => !adaKartuLegal(t, state.meja))) {
    return { akhir: 'tabrak' };
  }
  return null;
}

/**
 * Bonus untuk penutup, dibaca dari kartu terakhir yang ia mainkan.
 *   double  : kedua ujung rangkaian berangka sama saat menutup.
 *   triplet : menutup dengan balak.
 *   quartet : gabungan keduanya.
 */
export function jenisBonus(state: StateKocokan, penutup: NomorPemain): JenisBonus | null {
  const terakhir = state.riwayat.at(-1);
  if (!terakhir || terakhir.aksi !== 'main' || terakhir.pemain !== penutup) {
    throw new Error('Kartu terakhir di riwayat bukan kartu penutup');
  }
  const balak = adalahBalak(terakhir.kartu);
  const samaUjung = state.meja.ujungKiri === state.meja.ujungKanan;

  if (balak && samaUjung) return 'quartet';
  if (balak) return 'triplet';
  if (samaUjung) return 'double';
  return null;
}
