// pembuka.ts: aturan siapa yang membuka kocokan dan dengan kartu apa.
//
// Ada tiga jenis RENCANA pembukaan:
//
//   { jenis: 'poin', poin: [p0, p1] }
//       Kocokan pertama tiap partai. Dibuka pemegang kartu yang angkanya sesuai
//       poin pertandingan: poin 0-0 dibuka kartu 0-0, poin 1-0 dibuka kartu 1-0
//       (sama dengan 0-1), poin 2-1 dibuka kartu 1-2, dan seterusnya.
//
//   { jenis: 'netral' }
//       Kocokan netral setelah tabrak seri. Dibuka pemegang kartu 0-0.
//
//   { jenis: 'balak', calon: pemain }
//       Kocokan berikutnya dalam partai yang sama. Pembukanya `calon`, dan ia
//       wajib membuka dengan balak (angka bebas). Bila `calon` tidak punya
//       balak, hak pindah ke pemain berikutnya sesuai giliran. Bila pemain itu
//       juga tidak punya balak, kocokan dianggap tidak adil dan diulang.
//
// Siapa yang menjadi `calon`:
//   - kocokan sebelumnya berakhir HABIS : pemain yang menutup.
//   - kocokan sebelumnya berakhir TABRAK: tim dengan total titik sisa lebih
//     kecil menang; calonnya pemain tim itu dengan titik paling sedikit (bila
//     sama, yang nomornya lebih kecil). Bila total kedua tim sama (seri), yang
//     dipakai rencana 'netral'.
//
// Fungsi `tentukanPembuka` mengubah rencana + tangan yang baru dibagi menjadi
// keputusan: siapa pembukanya dan syarat kartu pertamanya, atau 'ulang'.

import {
  ANGKA_TERBESAR,
  JUMLAH_PEMAIN,
  NAMA_PEMAIN,
  adalahBalak,
  adalahNomorPemain,
  buatKartu,
  giliranBerikutnya,
  nilaiKartu,
} from './engine.ts';
import type { EmpatTangan, Kartu, NomorPemain } from './engine.ts';

// ---------------------------------------------------------------------------
// Tipe
// ---------------------------------------------------------------------------

export interface SyaratBebas {
  readonly jenis: 'bebas';
}
export interface SyaratBalak {
  readonly jenis: 'balak';
}
export interface SyaratKartu {
  readonly jenis: 'kartu';
  readonly kartu: Kartu;
}
/** Syarat untuk kartu pertama di meja. */
export type Syarat = SyaratBebas | SyaratBalak | SyaratKartu;

export interface RencanaPoin {
  readonly jenis: 'poin';
  readonly poin: readonly [number, number];
}
export interface RencanaNetral {
  readonly jenis: 'netral';
}
export interface RencanaBalak {
  readonly jenis: 'balak';
  readonly calon: NomorPemain;
}
/** Rencana pembukaan sebuah kocokan. */
export type RencanaPembukaan = RencanaPoin | RencanaNetral | RencanaBalak;
/** Rencana yang bisa muncul sesudah sebuah kocokan berakhir. */
export type RencanaBerikutnya = RencanaNetral | RencanaBalak;

/** Hasil kocokan sebelumnya, sebagai masukan `rencanaKocokanBerikutnya`. */
export type MasukanRencana =
  { readonly akhir: 'habis'; readonly penutup: NomorPemain } | { readonly akhir: 'tabrak'; readonly tangan: EmpatTangan };

export interface PembukaSiap {
  readonly status: 'siap';
  readonly pembuka: NomorPemain;
  readonly syarat: Syarat;
  readonly alasan: string;
}
export interface PembukaUlang {
  readonly status: 'ulang';
  readonly pembuka: NomorPemain;
  readonly alasan: string;
}
export type KeputusanPembuka = PembukaSiap | PembukaUlang;

// ---------------------------------------------------------------------------
// Syarat untuk kartu pertama di meja
// ---------------------------------------------------------------------------

/** Kartu pertama bebas (dipakai dalam pengujian dan simulasi sederhana). */
export const SYARAT_BEBAS: SyaratBebas = { jenis: 'bebas' };

/** Kartu pertama harus balak, angka bebas. */
export const SYARAT_BALAK: SyaratBalak = { jenis: 'balak' };

/** Kartu pertama harus persis kartu ini. */
export function syaratKartu(kartu: Kartu): SyaratKartu {
  return { jenis: 'kartu', kartu };
}

/** Apakah kartu ini boleh dipakai sebagai kartu pertama menurut syaratnya? */
export function kartuMemenuhiSyarat(kartu: Kartu, syarat: Syarat): boolean {
  switch (syarat.jenis) {
    case 'bebas':
      return true;
    case 'balak':
      return adalahBalak(kartu);
    case 'kartu':
      return kartu.id === syarat.kartu.id;
    default:
      throw new Error(`Jenis syarat tidak dikenal: ${JSON.stringify(syarat)}`);
  }
}

/** Uraian syarat dalam kalimat, untuk pesan kesalahan dan tampilan. */
export function deskripsiSyarat(syarat: Syarat): string {
  switch (syarat.jenis) {
    case 'bebas':
      return 'kartu bebas';
    case 'balak':
      return 'harus membuka dengan balak';
    case 'kartu':
      return `harus membuka dengan kartu ${syarat.kartu.id}`;
    default:
      throw new Error(`Jenis syarat tidak dikenal: ${JSON.stringify(syarat)}`);
  }
}

// ---------------------------------------------------------------------------
// Hitungan titik
// ---------------------------------------------------------------------------

/** Jumlah titik seluruh kartu dalam satu tangan. */
export function totalTitik(tangan: readonly Kartu[]): number {
  return tangan.reduce((jumlah, kartu) => jumlah + nilaiKartu(kartu), 0);
}

/** Total titik sisa tiap tim: tim 0 = pemain 0 dan 2, tim 1 = pemain 1 dan 3. */
export function titikSisaTim(tangan: EmpatTangan): [number, number] {
  return [totalTitik(tangan[0]) + totalTitik(tangan[2]), totalTitik(tangan[1]) + totalTitik(tangan[3])];
}

// ---------------------------------------------------------------------------
// Rencana pembukaan
// ---------------------------------------------------------------------------

function pastikanPemainSah(pemain: number): NomorPemain {
  if (!adalahNomorPemain(pemain)) {
    throw new RangeError(`Nomor pemain harus 0 sampai ${JUMLAH_PEMAIN - 1}, diterima: ${pemain}`);
  }
  return pemain;
}

/**
 * Rencana untuk kocokan pertama sebuah partai, dari poin pertandingan.
 * @param poin poin tim 0 dan tim 1
 */
export function rencanaKocokanPertama(poin: readonly [number, number]): RencanaPoin {
  const sah = Array.isArray(poin) && poin.length === 2 && poin.every((p) => Number.isInteger(p) && p >= 0 && p <= ANGKA_TERBESAR);
  if (!sah) {
    throw new RangeError(`Poin harus dua bilangan bulat 0 sampai ${ANGKA_TERBESAR}`);
  }
  return { jenis: 'poin', poin: [poin[0], poin[1]] };
}

/**
 * Rencana untuk kocokan berikutnya dalam partai yang sama, dari hasil kocokan
 * sebelumnya.
 *   - habis : `penutup` = nomor pemain yang menghabiskan kartu.
 *   - tabrak: `tangan` = sisa kartu keempat pemain saat tabrak.
 */
export function rencanaKocokanBerikutnya(hasil: MasukanRencana): RencanaBerikutnya {
  if (hasil.akhir === 'habis') {
    return { jenis: 'balak', calon: pastikanPemainSah(hasil.penutup) };
  }

  if (hasil.akhir === 'tabrak') {
    const tangan = hasil.tangan;
    if (!Array.isArray(tangan) || tangan.length !== JUMLAH_PEMAIN) {
      throw new RangeError(`Harus ada ${JUMLAH_PEMAIN} tangan`);
    }
    const [titik0, titik1] = titikSisaTim(tangan);
    if (titik0 === titik1) return { jenis: 'netral' }; // tabrak seri

    // Tim yang menang: titik sisa lebih kecil. Anggotanya, nomor kecil lebih dulu.
    const [kecil, besar]: [NomorPemain, NomorPemain] = titik0 < titik1 ? [0, 2] : [1, 3];
    // `<` (bukan `<=`) menjaga pemain bernomor kecil bila titiknya sama.
    const calon = totalTitik(tangan[besar]) < totalTitik(tangan[kecil]) ? besar : kecil;
    return { jenis: 'balak', calon };
  }

  throw new Error(`Akhir kocokan tidak dikenal: ${JSON.stringify(hasil)}`);
}

// ---------------------------------------------------------------------------
// Menentukan pembuka dari tangan yang baru dibagi
// ---------------------------------------------------------------------------

/**
 * Menentukan pembuka dan syarat kartu pertama.
 *
 * Hasilnya salah satu dari:
 *   { status: 'siap',  pembuka, syarat, alasan }
 *   { status: 'ulang', pembuka, alasan }   // kocokan tidak adil: kocok ulang
 *
 * Pada 'ulang', `pembuka` adalah calon yang sama untuk percobaan berikutnya,
 * jadi cukup panggil lagi dengan tangan hasil kocokan ulang dan rencana yang sama.
 */
export function tentukanPembuka(tangan: EmpatTangan, rencana: RencanaPembukaan): KeputusanPembuka {
  if (!Array.isArray(tangan) || tangan.length !== JUMLAH_PEMAIN) {
    throw new RangeError(`Harus ada ${JUMLAH_PEMAIN} tangan`);
  }

  switch (rencana.jenis) {
    case 'poin': {
      const kartu = buatKartu(rencana.poin[0], rencana.poin[1]);
      return bukaDenganKartu(tangan, kartu, `pemegang kartu ${kartu.id} sesuai poin ${rencana.poin[0]}-${rencana.poin[1]}`);
    }
    case 'netral':
      return bukaDenganKartu(tangan, buatKartu(0, 0), 'kocokan netral setelah tabrak seri, dibuka pemegang kartu 0-0');
    case 'balak':
      return bukaDenganBalak(tangan, rencana.calon);
    default:
      throw new Error(`Jenis rencana tidak dikenal: ${JSON.stringify(rencana)}`);
  }
}

function bukaDenganKartu(tangan: EmpatTangan, kartu: Kartu, alasan: string): PembukaSiap {
  for (const pemain of [0, 1, 2, 3] as const) {
    if (tangan[pemain].some((k) => k.id === kartu.id)) {
      return { status: 'siap', pembuka: pemain, syarat: syaratKartu(kartu), alasan };
    }
  }
  throw new Error(`Kartu ${kartu.id} tidak ditemukan di tangan mana pun (dek tidak lengkap?)`);
}

function bukaDenganBalak(tangan: EmpatTangan, calon: NomorPemain): KeputusanPembuka {
  pastikanPemainSah(calon);
  const punyaBalak = (pemain: NomorPemain): boolean => tangan[pemain].some(adalahBalak);

  if (punyaBalak(calon)) {
    return { status: 'siap', pembuka: calon, syarat: SYARAT_BALAK, alasan: `${NAMA_PEMAIN[calon]} punya balak` };
  }

  const berikutnya = giliranBerikutnya(calon);
  if (punyaBalak(berikutnya)) {
    return {
      status: 'siap',
      pembuka: berikutnya,
      syarat: SYARAT_BALAK,
      alasan: `${NAMA_PEMAIN[calon]} tidak punya balak, hak membuka pindah ke ${NAMA_PEMAIN[berikutnya]}`,
    };
  }

  return {
    status: 'ulang',
    pembuka: calon,
    alasan: `${NAMA_PEMAIN[calon]} dan ${NAMA_PEMAIN[berikutnya]} sama-sama tidak punya balak, kocokan tidak adil`,
  };
}
