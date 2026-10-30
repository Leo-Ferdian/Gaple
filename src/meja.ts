// meja.ts: rangkaian kartu di meja dan aturan menyambung.
//
// Meja menyimpan kartu dari kiri ke kanan. Setiap kartu yang sudah diletakkan
// ditulis lengkap dengan arah hadapnya:
//
//   { kartu, kiri: 1, kanan: 3 }   artinya di meja tampil sebagai [1|3]
//
// Dua kartu bersebelahan selalu "nyambung": angka kanan kartu sebelah kiri
// sama dengan angka kiri kartu sebelah kanan.
//
//   [1|3][3|5][5|5]
//
// Angka paling kiri dan paling kanan disebut UJUNG. Pemain hanya boleh
// menyambung kartu yang punya angka sama dengan salah satu ujung.
//
// Semua fungsi di sini murni: meja lama tidak pernah diubah, hasilnya meja baru.

import type { Angka, Kartu } from './engine.ts';

/** Sisi tempat kartu diletakkan. */
export const SISI_AWAL = 'awal'; // khusus kartu pertama di meja kosong
export const SISI_KIRI = 'kiri';
export const SISI_KANAN = 'kanan';

export type Sisi = typeof SISI_AWAL | typeof SISI_KIRI | typeof SISI_KANAN;

/** Apakah teks ini nama sisi yang sah? */
export function adalahSisi(teks: string): teks is Sisi {
  return teks === SISI_AWAL || teks === SISI_KIRI || teks === SISI_KANAN;
}

/** Sebuah kartu di meja, lengkap dengan angka yang tampil di kiri dan kanan. */
export interface Letak {
  readonly kartu: Kartu;
  readonly kiri: Angka;
  readonly kanan: Angka;
}

/** Meja: rangkaian dari kiri ke kanan dan angka di dua ujungnya (null bila kosong). */
export interface Meja {
  readonly rangkaian: readonly Letak[];
  readonly ujungKiri: Angka | null;
  readonly ujungKanan: Angka | null;
}

/** Kartu yang boleh dimainkan beserta sisi-sisi yang mungkin. */
export interface PilihanKartu {
  readonly kartu: Kartu;
  readonly sisi: readonly Sisi[];
}

/**
 * Membuat meja kosong.
 */
export function buatMejaKosong(): Meja {
  return { rangkaian: [], ujungKiri: null, ujungKanan: null };
}

/**
 * Sisi mana saja yang boleh dipakai untuk meletakkan sebuah kartu.
 *  - Meja kosong: hanya 'awal'.
 *  - Kartu punya angka sama dengan ujung kiri: 'kiri' boleh.
 *  - Kartu punya angka sama dengan ujung kanan: 'kanan' boleh.
 *  - Jika kedua ujung bernilai sama, 'kiri' dan 'kanan' sama-sama boleh.
 * Hasil array kosong berarti kartu itu tidak bisa dimainkan.
 */
export function sisiLegal(kartu: Kartu, meja: Meja): Sisi[] {
  if (meja.rangkaian.length === 0) return [SISI_AWAL];
  const sisi: Sisi[] = [];
  if (kartu.a === meja.ujungKiri || kartu.b === meja.ujungKiri) sisi.push(SISI_KIRI);
  if (kartu.a === meja.ujungKanan || kartu.b === meja.ujungKanan) sisi.push(SISI_KANAN);
  return sisi;
}

/**
 * Dari sebuah tangan, kartu mana saja yang boleh dimainkan dan di sisi mana.
 * Contoh hasil: [{ kartu: {...3-5}, sisi: ['kanan'] }, ...]
 */
export function kartuLegal(tangan: readonly Kartu[], meja: Meja): PilihanKartu[] {
  return tangan.map((kartu) => ({ kartu, sisi: sisiLegal(kartu, meja) })).filter((pilihan) => pilihan.sisi.length > 0);
}

/** Benar bila tangan punya setidaknya satu kartu yang bisa dimainkan. */
export function adaKartuLegal(tangan: readonly Kartu[], meja: Meja): boolean {
  return kartuLegal(tangan, meja).length > 0;
}

/**
 * Meletakkan kartu di meja dan mengembalikan MEJA BARU.
 * Melempar Error bila kartu tidak bisa diletakkan di sisi itu.
 */
export function letakkan(meja: Meja, kartu: Kartu, sisi: Sisi): Meja {
  if (!sisiLegal(kartu, meja).includes(sisi)) {
    throw new Error(`Kartu ${kartu.id} tidak bisa diletakkan di sisi "${sisi}"`);
  }

  if (sisi === SISI_AWAL) {
    const letak: Letak = { kartu, kiri: kartu.a, kanan: kartu.b };
    return { rangkaian: [letak], ujungKiri: kartu.a, ujungKanan: kartu.b };
  }

  const { ujungKiri, ujungKanan } = meja;
  if (ujungKiri === null || ujungKanan === null) throw new Error('Meja kosong hanya menerima sisi "awal"'); // tidak terjangkau: sisiLegal sudah memeriksa

  if (sisi === SISI_KIRI) {
    // Sisi kartu yang menempel ke meja = ujungKiri lama.
    // Sisi satunya menjadi ujung kiri yang baru.
    const kiriBaru = kartu.a === ujungKiri ? kartu.b : kartu.a;
    const letak: Letak = { kartu, kiri: kiriBaru, kanan: ujungKiri };
    return {
      rangkaian: [letak, ...meja.rangkaian],
      ujungKiri: kiriBaru,
      ujungKanan,
    };
  }

  // sisi kanan
  const kananBaru = kartu.a === ujungKanan ? kartu.b : kartu.a;
  const letak: Letak = { kartu, kiri: ujungKanan, kanan: kananBaru };
  return {
    rangkaian: [...meja.rangkaian, letak],
    ujungKiri,
    ujungKanan: kananBaru,
  };
}

/**
 * Menampilkan meja sebagai teks, berguna untuk uji dan mencetak di terminal.
 * Contoh: "[1|3][3|5]". Meja kosong: "(kosong)".
 */
export function teksMeja(meja: Meja): string {
  if (meja.rangkaian.length === 0) return '(kosong)';
  return meja.rangkaian.map((letak) => `[${letak.kiri}|${letak.kanan}]`).join('');
}
