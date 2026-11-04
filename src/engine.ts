// engine.ts: mesin aturan gaple.
//
// Aturan penting untuk file ini (lihat docs/GUIDE.md):
//   1. Hanya berisi fungsi MURNI: hasilnya hanya bergantung pada masukan, dan
//      masukan tidak diubah. Fungsi tidak boleh menyentuh `document` atau `window`.
//   2. Angka acak tidak diambil dari Math.random(). Fungsi yang butuh acak
//      menerima fungsi `acak` sebagai parameter (lihat src/rng.ts).
//
// Berisi: konstanta, pemain dan tim, kartu, dek, kocok, dan bagi.

import type { FungsiAcak } from './rng.ts';

// ---------------------------------------------------------------------------
// Konstanta permainan
// ---------------------------------------------------------------------------

/** Angka di satu sisi kartu. */
export type Angka = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const ANGKA_TERBESAR = 6; // set double-six: angka 0 sampai 6
export const JUMLAH_KARTU = 28; // 0-0 sampai 6-6
export const JUMLAH_PEMAIN = 4;
export const KARTU_PER_PEMAIN = 7;

// ---------------------------------------------------------------------------
// Pemain dan tim
// ---------------------------------------------------------------------------

/** Nomor pemain: 0 Selatan, 1 Barat, 2 Utara, 3 Timur (searah jarum jam). */
export type NomorPemain = 0 | 1 | 2 | 3;
/** Nomor tim: tim 0 = pemain 0 dan 2, tim 1 = pemain 1 dan 3. */
export type NomorTim = 0 | 1;

/** Nama pemain menurut nomornya. Nomor 0 adalah pemain manusia. */
/** Nama yang tampil. Kursi tetap bernomor: 0 selatan (Anda), 1 barat (lawan kiri), 2 utara (rekan), 3 timur (lawan kanan). */
export const NAMA_PEMAIN = ['Anda', 'Lawan Kiri', 'Rekan', 'Lawan Kanan'] as const;

const PEMAIN_BERIKUTNYA = { 0: 1, 1: 2, 2: 3, 3: 0 } as const satisfies Record<NomorPemain, NomorPemain>;
const TIM_PEMAIN = { 0: 0, 1: 1, 2: 0, 3: 1 } as const satisfies Record<NomorPemain, NomorTim>;

/** Pemain berikutnya, searah jarum jam: 0, 1, 2, 3, 0, ... */
export function giliranBerikutnya(pemain: NomorPemain): NomorPemain {
  return PEMAIN_BERIKUTNYA[pemain];
}

/** Apakah nilai ini nomor pemain yang sah (0 sampai 3)? */
export function adalahNomorPemain(n: unknown): n is NomorPemain {
  return n === 0 || n === 1 || n === 2 || n === 3;
}

/** Tim sebuah pemain: pemain 0 dan 2 tim 0, pemain 1 dan 3 tim 1. */
export function timPemain(pemain: NomorPemain): NomorTim {
  return TIM_PEMAIN[pemain];
}

// ---------------------------------------------------------------------------
// Kartu
// ---------------------------------------------------------------------------

/** Satu kartu domino. Tidak pernah diubah setelah dibuat. */
export interface Kartu {
  readonly a: Angka; // sisi kecil
  readonly b: Angka; // sisi besar (a <= b)
  readonly id: `${Angka}-${Angka}`; // unik, mis. "3-6"
}

/** Empat tangan; indeks = nomor pemain. */
export type EmpatTangan = readonly [readonly Kartu[], readonly Kartu[], readonly Kartu[], readonly Kartu[]];

/** Apakah bilangan ini angka kartu yang sah (bulat, 0 sampai 6)? */
export function adalahAngka(n: number): n is Angka {
  return Number.isInteger(n) && n >= 0 && n <= ANGKA_TERBESAR;
}

/**
 * Membuat satu kartu. Dua sisinya selalu disimpan terurut (a <= b), sehingga
 * kartu 3-1 dan 1-3 adalah kartu yang sama persis, yaitu {a: 1, b: 3, id: "1-3"}.
 *
 * @param sisi1 angka 0 sampai 6
 * @param sisi2 angka 0 sampai 6
 */
export function buatKartu(sisi1: number, sisi2: number): Kartu {
  if (!adalahAngka(sisi1) || !adalahAngka(sisi2)) {
    const salah = adalahAngka(sisi1) ? sisi2 : sisi1;
    throw new RangeError(`Angka kartu harus bilangan bulat 0 sampai ${ANGKA_TERBESAR}, diterima: ${salah}`);
  }
  const a = sisi1 <= sisi2 ? sisi1 : sisi2;
  const b = sisi1 <= sisi2 ? sisi2 : sisi1;
  return { a, b, id: `${a}-${b}` };
}

/** Nilai titik sebuah kartu: jumlah titik kedua sisinya. 0-0 bernilai 0, 6-6 bernilai 12. */
export function nilaiKartu(kartu: Kartu): number {
  return kartu.a + kartu.b;
}

/** Balak = kartu dengan kedua sisi sama (0-0, 1-1, ..., 6-6). */
export function adalahBalak(kartu: Kartu): boolean {
  return kartu.a === kartu.b;
}

// ---------------------------------------------------------------------------
// Dek
// ---------------------------------------------------------------------------

/**
 * Membuat dek lengkap berisi 28 kartu unik, berurutan dari 0-0, 0-1, ..., 6-6.
 * Dek ini belum dikocok.
 */
export function buatDek(): Kartu[] {
  const dek: Kartu[] = [];
  for (let a = 0; a <= ANGKA_TERBESAR; a++) {
    for (let b = a; b <= ANGKA_TERBESAR; b++) {
      dek.push(buatKartu(a, b));
    }
  }
  return dek;
}

/**
 * Mengocok dek dengan algoritma Fisher-Yates dan mengembalikan SALINAN baru.
 * Dek asli tidak berubah.
 *
 * Cara kerja Fisher-Yates: mulai dari posisi terakhir, tukar kartu di posisi
 * itu dengan kartu di posisi acak yang tidak lebih besar, lalu mundur satu
 * posisi. Setiap urutan yang mungkin punya peluang yang sama.
 *
 * @param dek isi apa saja (biasanya kartu)
 * @param acak fungsi acak dari buatAcak()
 */
export function kocok<T>(dek: readonly T[], acak: FungsiAcak): T[] {
  const hasil = [...dek]; // salin supaya dek asli tidak berubah
  for (let i = hasil.length - 1; i > 0; i--) {
    const j = Math.floor(acak() * (i + 1)); // 0 sampai i
    const isiI = hasil[i];
    const isiJ = hasil[j];
    if (isiI === undefined || isiJ === undefined) throw new RangeError('Fungsi acak menghasilkan angka di luar [0, 1)');
    hasil[i] = isiJ; // tukar posisi
    hasil[j] = isiI;
  }
  return hasil;
}

/**
 * Membagi dek yang sudah dikocok menjadi 4 tangan berisi 7 kartu.
 * Indeks tangan = nomor pemain: 0 Selatan, 1 Barat, 2 Utara, 3 Timur.
 * Tim 0 = pemain 0 dan 2. Tim 1 = pemain 1 dan 3.
 *
 * @param dek harus berisi tepat 28 kartu
 */
export function bagi(dek: readonly Kartu[]): EmpatTangan {
  if (dek.length !== JUMLAH_KARTU) {
    throw new RangeError(`Dek harus berisi ${JUMLAH_KARTU} kartu, diterima: ${dek.length}`);
  }
  const ambil = (pemain: NomorPemain): Kartu[] => dek.slice(pemain * KARTU_PER_PEMAIN, (pemain + 1) * KARTU_PER_PEMAIN);
  return [ambil(0), ambil(1), ambil(2), ambil(3)];
}
