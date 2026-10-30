// simulasi.ts: memainkan kocokan secara acak dari awal sampai selesai.
//
// Dipakai untuk dua hal:
//   1. Pengujian: memainkan ratusan kocokan acak dan memeriksa bahwa aturan
//      tidak pernah rusak.
//   2. Demo di terminal (lihat folder demo/).
//
// Deteksi habis dan tabrak sekarang ada di akhir.ts. `akhirSementara` tetap
// ada sebagai bungkus tipis yang hanya mengembalikan 'habis', 'tabrak', atau null.

import { mulaiKocokan, mainkan, lewat, kartuLegalPemain } from './kocokan.ts';
import type { EmpatTangan, Kartu, NomorPemain } from './engine.ts';
import type { Sisi } from './meja.ts';
import type { FungsiAcak } from './rng.ts';
import { SYARAT_BEBAS } from './pembuka.ts';
import type { Syarat } from './pembuka.ts';
import { akhirKocokan } from './akhir.ts';
import type { StateKocokan } from './tipe-kocokan.ts';
import {
  bagiKocokan,
  mainkanPartai,
  lewatPartai,
  lanjutkanPartai,
  STATUS_SIAP,
  STATUS_BERJALAN,
  STATUS_RINGKASAN,
  STATUS_SELESAI,
} from './partai.ts';
import type { Partai } from './partai.ts';
import { mulaiPertandingan, mulaiPartaiBerikutnya, ubahPartai, catatPartai } from './pertandingan.ts';
import type { FormatPertandingan, Pertandingan } from './pertandingan.ts';

/** Satu langkah yang dipilih acak. */
export type LangkahAcak =
  | { readonly aksi: 'lewat'; readonly pemain: NomorPemain }
  | { readonly aksi: 'main'; readonly pemain: NomorPemain; readonly kartu: Kartu; readonly sisi: Sisi };

/** Hasil memainkan kocokan sampai selesai. */
export interface HasilSimulasi {
  readonly state: StateKocokan;
  readonly akhir: 'habis' | 'tabrak';
}

/**
 * Apakah kocokan sudah selesai?
 *  - 'habis'  : ada pemain yang kartunya kosong
 *  - 'tabrak' : tidak ada satu pun pemain yang bisa memainkan kartu
 *  - null     : kocokan masih berjalan
 */
export function akhirSementara(state: StateKocokan): 'habis' | 'tabrak' | null {
  const akhir = akhirKocokan(state);
  return akhir ? akhir.akhir : null;
}

/**
 * Memilih satu langkah acak untuk pemain yang sedang giliran: salah satu kartu
 * legal (dan salah satu sisi legalnya), atau lewat bila tidak ada. Syarat
 * pembuka ikut diperhitungkan. Belum mengubah apa pun.
 */
export function pilihLangkahAcak(state: StateKocokan, acak: FungsiAcak): LangkahAcak {
  const pemain = state.giliran;
  const pilihan = kartuLegalPemain(state, pemain);
  if (pilihan.length === 0) return { aksi: 'lewat', pemain };

  const terpilih = pilihan[Math.floor(acak() * pilihan.length)];
  const sisiDipilih = terpilih?.sisi[Math.floor(acak() * terpilih.sisi.length)];
  if (terpilih === undefined || sisiDipilih === undefined) {
    throw new Error('Pilihan kartu legal kosong, seharusnya tidak mungkin');
  }
  return { aksi: 'main', pemain, kartu: terpilih.kartu, sisi: sisiDipilih };
}

/** Satu langkah acak pada sebuah kocokan. */
export function langkahAcak(state: StateKocokan, acak: FungsiAcak): StateKocokan {
  const langkah = pilihLangkahAcak(state, acak);
  return langkah.aksi === 'lewat' ? lewat(state, langkah.pemain) : mainkan(state, langkah.pemain, langkah.kartu, langkah.sisi);
}

/**
 * Melanjutkan sebuah kocokan secara acak sampai selesai.
 */
export function mainAcakDariState(state: StateKocokan, acak: FungsiAcak, batasLangkah = 500): HasilSimulasi {
  for (let i = 0; i < batasLangkah; i++) {
    const akhir = akhirSementara(state);
    if (akhir) return { state, akhir };
    state = langkahAcak(state, acak);
  }
  throw new Error(`Kocokan tidak selesai dalam ${batasLangkah} langkah`);
}

/**
 * Memainkan satu kocokan secara acak sampai selesai, dari tangan yang dibagi.
 */
export function mainAcakSampaiSelesai(
  tangan: EmpatTangan,
  pembuka: NomorPemain,
  acak: FungsiAcak,
  batasLangkah = 500,
  syarat: Syarat = SYARAT_BEBAS,
): HasilSimulasi {
  return mainAcakDariState(mulaiKocokan(tangan, pembuka, syarat), acak, batasLangkah);
}

/**
 * Satu langkah pada sebuah partai, apa pun statusnya, dengan pemilih langkah `kebijakan`:
 * siap -> bagi kartu, berjalan -> satu langkah, ringkasan -> lanjutkan.
 * Pada partai yang sudah selesai, mengembalikan partai yang sama.
 */
export function langkahPartaiDengan(partai: Partai, kebijakan: Kebijakan, acak: FungsiAcak): Partai {
  switch (partai.status) {
    case STATUS_SIAP:
      return bagiKocokan(partai, acak);
    case STATUS_BERJALAN: {
      const langkah = kebijakan(partai.kocokan, acak);
      return langkah.aksi === 'lewat'
        ? lewatPartai(partai, langkah.pemain)
        : mainkanPartai(partai, langkah.pemain, langkah.kartu, langkah.sisi);
    }
    case STATUS_RINGKASAN:
      return lanjutkanPartai(partai);
    case STATUS_SELESAI:
      return partai;
  }
}

/** Satu langkah acak pada sebuah partai (lihat `langkahPartaiDengan`). */
export const langkahAcakPartai = (partai: Partai, acak: FungsiAcak): Partai => langkahPartaiDengan(partai, pilihLangkahAcak, acak);

/** Pemilih langkah: dari state kocokan menghasilkan satu langkah untuk pemain yang sedang giliran. */
export type Kebijakan = (state: StateKocokan, acak: FungsiAcak) => LangkahAcak;

/** Empat kebijakan, satu per pemain (indeks = nomor pemain). */
export type EmpatKebijakan = readonly [Kebijakan, Kebijakan, Kebijakan, Kebijakan];

/** Memainkan sebuah partai sampai selesai; tiap pemain memilih langkah dengan kebijakannya sendiri. */
export function mainPartaiDengan(partai: Partai, kebijakan: EmpatKebijakan, acak: FungsiAcak, batasLangkah = 20000): Partai {
  let sekarang = partai;
  for (let i = 0; i < batasLangkah; i++) {
    switch (sekarang.status) {
      case STATUS_SELESAI:
        return sekarang;
      case STATUS_SIAP:
        sekarang = bagiKocokan(sekarang, acak);
        break;
      case STATUS_RINGKASAN:
        sekarang = lanjutkanPartai(sekarang);
        break;
      case STATUS_BERJALAN: {
        const langkah = kebijakan[sekarang.kocokan.giliran](sekarang.kocokan, acak);
        sekarang =
          langkah.aksi === 'lewat'
            ? lewatPartai(sekarang, langkah.pemain)
            : mainkanPartai(sekarang, langkah.pemain, langkah.kartu, langkah.sisi);
        break;
      }
    }
  }
  throw new Error(`Partai tidak selesai dalam ${batasLangkah} langkah`);
}

/** Memainkan sebuah partai secara acak sampai selesai. */
export function mainAcakPartai(partai: Partai, acak: FungsiAcak, batasLangkah = 20000): Partai {
  let sekarang = partai;
  for (let i = 0; i < batasLangkah; i++) {
    if (sekarang.status === STATUS_SELESAI) return sekarang;
    sekarang = langkahAcakPartai(sekarang, acak);
  }
  throw new Error(`Partai tidak selesai dalam ${batasLangkah} langkah`);
}

/** Memainkan satu pertandingan penuh (bo3 atau bo5) secara acak sampai ada juara. */
export function mainAcakPertandingan(format: FormatPertandingan, acak: FungsiAcak, batasPartai = 50): Pertandingan {
  let pertandingan = mulaiPertandingan(format);
  for (let i = 0; i < batasPartai; i++) {
    pertandingan = mulaiPartaiBerikutnya(pertandingan);
    pertandingan = ubahPartai(pertandingan, (partai) => mainAcakPartai(partai, acak));
    pertandingan = catatPartai(pertandingan);
    if (pertandingan.juara !== null) return pertandingan;
  }
  throw new Error(`Pertandingan tidak selesai dalam ${batasPartai} partai`);
}
