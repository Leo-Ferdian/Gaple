// markah.ts: menghitung hasil sebuah kocokan dan mengubah markah tim.
//
// MARKAH adalah "nyawa" tim dalam satu partai: mulai 0, hanya bertambah. Tim
// yang markahnya mencapai 100 atau lebih kalah partai.
//
// Aturan penambahan:
//   HABIS : tim lawan dari penutup mendapat markah sebesar total sisa titik
//           KEDUA pemainnya, ditambah bonus (double, triplet, quartet) bila ada.
//           Sisa kartu rekan penutup tidak dihitung.
//   TABRAK: tiap tim menjumlahkan titik sisa kedua pemainnya. Tim dengan total
//           lebih banyak kalah dan markahnya bertambah sebesar totalnya sendiri.
//           Bila total sama (seri), tidak ada markah dan kocokan berikutnya
//           netral. Bonus tidak berlaku pada tabrak.
//
// Nilai bonus diletakkan di satu tempat (BONUS) supaya mudah diubah.

import { timPemain } from './engine.ts';
import type { NomorPemain, NomorTim } from './engine.ts';
import { akhirKocokan, jenisBonus } from './akhir.ts';
import type { JenisBonus } from './akhir.ts';
import { rencanaKocokanBerikutnya, titikSisaTim } from './pembuka.ts';
import type { RencanaBerikutnya } from './pembuka.ts';
import type { StateKocokan } from './tipe-kocokan.ts';

/** Markah (nyawa) tim mencapai angka ini: tim itu kalah partai. */
export const BATAS_MARKAH = 100;

/** Tambahan markah untuk tim lawan dari penutup. */
export const BONUS = { double: 20, triplet: 30, quartet: 50 } as const satisfies Record<JenisBonus, number>;

/** Markah dua tim: [tim 0, tim 1]. */
export type Markah = readonly [number, number];

export interface Bonus {
  readonly jenis: JenisBonus;
  readonly nilai: number;
}

/** Kocokan berakhir habis: lawan penutup yang markahnya bertambah. */
export interface HasilHabis {
  readonly akhir: 'habis';
  readonly penutup: NomorPemain;
  readonly seri: false;
  readonly timKena: NomorTim;
  readonly titikSisa: readonly [number, number];
  readonly bonus: Bonus | null;
  readonly tambahan: readonly [number, number];
  readonly rencanaBerikutnya: RencanaBerikutnya;
}

/** Kocokan berakhir tabrak: tidak ada penutup, bonus tidak berlaku. */
export interface HasilTabrak {
  readonly akhir: 'tabrak';
  readonly penutup: undefined;
  readonly seri: boolean;
  readonly timKena: NomorTim | null; // null bila seri
  readonly titikSisa: readonly [number, number];
  readonly bonus: null;
  readonly tambahan: readonly [number, number];
  readonly rencanaBerikutnya: RencanaBerikutnya;
}

/** Hasil lengkap sebuah kocokan yang sudah berakhir. */
export type HasilKocokan = HasilHabis | HasilTabrak;

/** Tambahan markah untuk tim `tim` sebesar `nilai`, tim lain 0. */
function tambahanUntuk(tim: NomorTim, nilai: number): [number, number] {
  return tim === 0 ? [nilai, 0] : [0, nilai];
}

/** Menghitung hasil sebuah kocokan yang sudah berakhir. */
export function hitungHasil(state: StateKocokan): HasilKocokan {
  const akhir = akhirKocokan(state);
  if (!akhir) throw new Error('Kocokan belum berakhir, hasil belum bisa dihitung');

  const titikSisa = titikSisaTim(state.tangan);

  if (akhir.akhir === 'habis') {
    const timKena: NomorTim = timPemain(akhir.penutup) === 0 ? 1 : 0;
    const jenis = jenisBonus(state, akhir.penutup);
    const bonus: Bonus | null = jenis ? { jenis, nilai: BONUS[jenis] } : null;
    return {
      akhir: 'habis',
      penutup: akhir.penutup,
      seri: false,
      timKena,
      titikSisa,
      bonus,
      tambahan: tambahanUntuk(timKena, titikSisa[timKena] + (bonus ? bonus.nilai : 0)),
      rencanaBerikutnya: rencanaKocokanBerikutnya({ akhir: 'habis', penutup: akhir.penutup }),
    };
  }

  // tabrak
  const rencanaBerikutnya = rencanaKocokanBerikutnya({ akhir: 'tabrak', tangan: state.tangan });
  const seri = titikSisa[0] === titikSisa[1];
  const timKena: NomorTim | null = seri ? null : titikSisa[0] > titikSisa[1] ? 0 : 1;
  const tambahan = timKena === null ? tambahanUntuk(0, 0) : tambahanUntuk(timKena, titikSisa[timKena]);
  return { akhir: 'tabrak', penutup: undefined, seri, timKena, titikSisa, bonus: null, tambahan, rencanaBerikutnya };
}

/** Markah baru setelah hasil kocokan diterapkan. Markah lama tidak diubah. */
export function terapkanHasil(markah: Markah, hasil: Pick<HasilKocokan, 'tambahan'>): [number, number] {
  pastikanMarkahSah(markah);
  return [markah[0] + hasil.tambahan[0], markah[1] + hasil.tambahan[1]];
}

/** Hasil akhir sebuah partai. */
export interface PemenangPartai {
  readonly kalah: NomorTim;
  readonly menang: NomorTim;
}

/** Apakah partai sudah selesai? null bila belum. */
export function pemenangPartai(markah: Markah): PemenangPartai | null {
  pastikanMarkahSah(markah);
  const kalah0 = markah[0] >= BATAS_MARKAH;
  const kalah1 = markah[1] >= BATAS_MARKAH;
  if (kalah0 && kalah1) {
    throw new Error('Kedua tim melewati batas markah sekaligus, seharusnya tidak mungkin');
  }
  if (kalah0) return { kalah: 0, menang: 1 };
  if (kalah1) return { kalah: 1, menang: 0 };
  return null;
}

function pastikanMarkahSah(markah: Markah): void {
  const sah = Array.isArray(markah) && markah.length === 2 && markah.every((m) => Number.isInteger(m) && m >= 0);
  if (!sah) throw new RangeError('Markah harus dua bilangan bulat tidak negatif');
}
