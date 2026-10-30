// pertandingan.ts: rangkaian partai, bo3 atau bo5.
//
// Tim yang lebih dulu menang 2 partai (bo3) atau 3 partai (bo5) menjadi juara.
// Menang partai bernilai 1 poin. Poin menentukan kartu pembuka kocokan pertama
// tiap partai (lihat pembuka.ts).
//
// State pertandingan:
//   {
//     format:        'bo3' | 'bo5',
//     target:        2 | 3,            // poin untuk jadi juara
//     poin:          [p0, p1],
//     partai:        state partai | null,   // partai yang sedang berjalan
//     riwayatPartai: [ {nomor, poinAwal, menang, markahAkhir, jumlahKocokan, jumlahKocokUlang} ],
//     juara:         null | 0 | 1
//   }
//
// Alurnya:
//   mulaiPertandingan -> mulaiPartaiBerikutnya -> (ubahPartai berkali-kali, sampai
//   partai berstatus 'selesai') -> catatPartai -> mulaiPartaiBerikutnya ... -> juara
//
// Semua fungsi murni dan melempar Error bila dipanggil di saat yang tidak cocok.

import { mulaiPartai, STATUS_SELESAI } from './partai.ts';
import type { Partai } from './partai.ts';
import type { NomorTim } from './engine.ts';
import type { Markah } from './markah.ts';

export const FORMAT_BO3 = 'bo3';
export const FORMAT_BO5 = 'bo5';

export type FormatPertandingan = typeof FORMAT_BO3 | typeof FORMAT_BO5;

/** Jumlah poin yang dibutuhkan untuk menjadi juara. */
export const TARGET_POIN = { [FORMAT_BO3]: 2, [FORMAT_BO5]: 3 } as const satisfies Record<FormatPertandingan, number>;

/** Catatan satu partai yang sudah selesai. */
export interface CatatanPartai {
  readonly nomor: number;
  readonly poinAwal: readonly [number, number];
  readonly menang: NomorTim;
  readonly markahAkhir: Markah;
  readonly jumlahKocokan: number;
  readonly jumlahKocokUlang: number;
}

export interface Pertandingan {
  readonly format: FormatPertandingan;
  /** Poin untuk jadi juara. */
  readonly target: 2 | 3;
  readonly poin: readonly [number, number];
  /** Partai yang sedang berjalan. */
  readonly partai: Partai | null;
  readonly riwayatPartai: readonly CatatanPartai[];
  readonly juara: NomorTim | null;
}

/** Apakah teks ini format pertandingan yang dikenal? */
export function adalahFormat(teks: string): teks is FormatPertandingan {
  return teks === FORMAT_BO3 || teks === FORMAT_BO5;
}

export function mulaiPertandingan(format: FormatPertandingan): Pertandingan {
  if (!adalahFormat(format)) {
    throw new RangeError(`Format harus "${FORMAT_BO3}" atau "${FORMAT_BO5}", diterima: ${String(format)}`);
  }
  return {
    format,
    target: TARGET_POIN[format],
    poin: [0, 0],
    partai: null,
    riwayatPartai: [],
    juara: null,
  };
}

/** Memulai partai berikutnya dengan poin pertandingan saat ini. */
export function mulaiPartaiBerikutnya(pertandingan: Pertandingan): Pertandingan {
  if (pertandingan.juara !== null) throw new Error('Pertandingan sudah selesai, sudah ada juara');
  if (pertandingan.partai !== null) throw new Error('Partai sebelumnya belum dicatat');
  return { ...pertandingan, partai: mulaiPartai(pertandingan.poin) };
}

/**
 * Mengganti partai yang sedang berjalan dengan hasil sebuah fungsi.
 * Contoh: `ubahPartai(p, (partai) => bagiKocokan(partai, acak))`.
 */
export function ubahPartai(pertandingan: Pertandingan, ubah: (partai: Partai) => Partai): Pertandingan {
  if (pertandingan.partai === null) throw new Error('Tidak ada partai yang sedang berjalan');
  return { ...pertandingan, partai: ubah(pertandingan.partai) };
}

/**
 * Mencatat partai yang sudah selesai: poin pemenang bertambah, dan bila poinnya
 * mencapai target, tim itu juara.
 */
export function catatPartai(pertandingan: Pertandingan): Pertandingan {
  const partai = pertandingan.partai;
  if (partai === null || partai.status !== STATUS_SELESAI) {
    throw new Error('Partai belum selesai, belum bisa dicatat');
  }

  const menang = partai.pemenang.menang;
  const poin: [number, number] = [pertandingan.poin[0], pertandingan.poin[1]];
  poin[menang] += 1;

  return {
    ...pertandingan,
    poin,
    partai: null,
    riwayatPartai: [
      ...pertandingan.riwayatPartai,
      {
        nomor: pertandingan.riwayatPartai.length + 1,
        poinAwal: [pertandingan.poin[0], pertandingan.poin[1]],
        menang,
        markahAkhir: [partai.markah[0], partai.markah[1]],
        jumlahKocokan: partai.nomorKocokan,
        jumlahKocokUlang: partai.jumlahKocokUlang,
      },
    ],
    juara: poin[menang] >= pertandingan.target ? menang : null,
  };
}
