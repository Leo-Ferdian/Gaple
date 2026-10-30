// partai.ts: jalannya satu PARTAI, yaitu rangkaian kocokan sampai markah satu
// tim mencapai 100.
//
// State partai adalah objek biasa:
//   {
//     poin:              [p0, p1],   // poin pertandingan saat partai ini dimulai
//     markah:            [m0, m1],   // markah tim, mulai [0, 0]
//     nomorKocokan:      0,          // jumlah kocokan yang sudah dibagi
//     rencana:           {...},      // rencana pembukaan kocokan berikutnya (pembuka.ts)
//     status:            'siap' | 'berjalan' | 'ringkasan' | 'selesai',
//     kocokan:           state kocokan | null,
//     infoPembuka:       {pembuka, syarat, alasan, ulang} | null,
//     hasilTerakhir:     hasil kocokan terakhir | null,
//     riwayatHasil:      [ ...hasil tiap kocokan, urut ],
//     jumlahKocokUlang:  0,          // berapa kali kocokan diulang karena tidak adil
//     pemenang:          null | {kalah, menang}
//   }
//
// Alur status:
//
//   siap ──bagiKocokan──> berjalan ──mainkanPartai / lewatPartai──> ringkasan
//    ^                                (kocokan berakhir, markah dihitung)  │
//    └──────────────── lanjutkanPartai (belum ada yang 100) ──────────────┤
//                                                                          v
//                                     lanjutkanPartai (ada yang 100) ──> selesai
//
// Semua fungsi murni: state lama tidak berubah, hasilnya state baru. Satu-satunya
// hal yang "bergerak" adalah fungsi acak `acak` yang dipakai membagi kartu.
// Langkah yang tidak cocok dengan status (misalnya membagi saat kocokan
// berjalan) melempar Error.

import { buatDek, kocok, bagi } from './engine.ts';
import type { Kartu, NomorPemain } from './engine.ts';
import type { FungsiAcak } from './rng.ts';
import type { Sisi } from './meja.ts';
import { rencanaKocokanPertama } from './pembuka.ts';
import type { RencanaPembukaan, Syarat } from './pembuka.ts';
import { mulaiDariRencana, mainkan, lewat } from './kocokan.ts';
import { akhirKocokan } from './akhir.ts';
import { hitungHasil, terapkanHasil, pemenangPartai } from './markah.ts';
import type { HasilKocokan, Markah, PemenangPartai } from './markah.ts';
import type { StateKocokan } from './tipe-kocokan.ts';

export const STATUS_SIAP = 'siap';
export const STATUS_BERJALAN = 'berjalan';
export const STATUS_RINGKASAN = 'ringkasan';
export const STATUS_SELESAI = 'selesai';

export type StatusPartai = typeof STATUS_SIAP | typeof STATUS_BERJALAN | typeof STATUS_RINGKASAN | typeof STATUS_SELESAI;

/** Keterangan pembuka kocokan yang sedang/baru dimainkan. */
export interface InfoPembuka {
  readonly pembuka: NomorPemain;
  readonly syarat: Syarat;
  readonly alasan: string;
  /** Berapa kali kartu dikocok ulang karena tidak adil. */
  readonly ulang: number;
}

/** Hasil satu kocokan, lengkap dengan nomor, pembuka, dan jumlah langkah. */
export type HasilPartai = HasilKocokan & {
  readonly nomor: number;
  readonly pembuka: NomorPemain;
  readonly jumlahLangkah: number;
};

interface DasarPartai {
  /** Poin pertandingan saat partai ini dimulai. */
  readonly poin: readonly [number, number];
  readonly markah: Markah;
  /** Jumlah kocokan yang sudah dibagi. */
  readonly nomorKocokan: number;
  /** Rencana pembukaan kocokan berikutnya. */
  readonly rencana: RencanaPembukaan;
  readonly riwayatHasil: readonly HasilPartai[];
  readonly jumlahKocokUlang: number;
}

/** Menunggu kartu dibagi. */
export interface PartaiSiap extends DasarPartai {
  readonly status: typeof STATUS_SIAP;
  readonly kocokan: null;
  readonly infoPembuka: null;
  readonly hasilTerakhir: HasilPartai | null;
  readonly pemenang: null;
}
/** Kocokan sedang dimainkan. */
export interface PartaiBerjalan extends DasarPartai {
  readonly status: typeof STATUS_BERJALAN;
  readonly kocokan: StateKocokan;
  readonly infoPembuka: InfoPembuka;
  readonly hasilTerakhir: HasilPartai | null;
  readonly pemenang: null;
}
/** Kocokan baru berakhir; ringkasan hasil ditampilkan. */
export interface PartaiRingkasan extends DasarPartai {
  readonly status: typeof STATUS_RINGKASAN;
  readonly kocokan: StateKocokan;
  readonly infoPembuka: InfoPembuka;
  readonly hasilTerakhir: HasilPartai;
  readonly pemenang: PemenangPartai | null;
}
/** Satu tim sudah mencapai batas markah. */
export interface PartaiSelesai extends DasarPartai {
  readonly status: typeof STATUS_SELESAI;
  readonly kocokan: null;
  readonly infoPembuka: null;
  readonly hasilTerakhir: HasilPartai;
  readonly pemenang: PemenangPartai;
}

export type Partai = PartaiSiap | PartaiBerjalan | PartaiRingkasan | PartaiSelesai;

/** Batas pengaman: kocokan tidak adil hanya ~0,3%, jadi ini tidak akan tercapai. */
const BATAS_KOCOK_ULANG = 1000;

function pastikanStatus(partai: Partai, status: StatusPartai, aksi: string): void {
  if (partai.status !== status) {
    throw new Error(`Tidak bisa ${aksi}: status partai "${partai.status}", seharusnya "${status}"`);
  }
}

function pastikanBerjalan(partai: Partai, aksi: string): asserts partai is PartaiBerjalan {
  pastikanStatus(partai, STATUS_BERJALAN, aksi);
}

/**
 * Memulai partai baru.
 * @param poin poin pertandingan saat ini (menentukan kartu pembuka)
 */
export function mulaiPartai(poin: readonly [number, number]): PartaiSiap {
  const rencana = rencanaKocokanPertama(poin); // melempar RangeError bila poin tidak sah
  return {
    poin: [poin[0], poin[1]],
    markah: [0, 0],
    nomorKocokan: 0,
    rencana,
    status: STATUS_SIAP,
    kocokan: null,
    infoPembuka: null,
    hasilTerakhir: null,
    riwayatHasil: [],
    jumlahKocokUlang: 0,
    pemenang: null,
  };
}

/**
 * Membagi kartu untuk kocokan berikutnya. Bila hasil bagi tidak adil (dua
 * pembuka berturut-turut tanpa balak), kartu dikocok ulang otomatis.
 */
export function bagiKocokan(partai: Partai, acak: FungsiAcak): PartaiBerjalan {
  pastikanStatus(partai, STATUS_SIAP, 'membagi kartu');
  if (partai.status !== STATUS_SIAP) throw new Error('tidak mungkin tercapai'); // penyempit tipe

  let ulang = 0;
  let mulai = mulaiDariRencana(bagi(kocok(buatDek(), acak)), partai.rencana);
  while (mulai.status === 'ulang') {
    ulang++;
    if (ulang > BATAS_KOCOK_ULANG) throw new Error('Kocokan tidak kunjung adil, ada yang salah');
    mulai = mulaiDariRencana(bagi(kocok(buatDek(), acak)), partai.rencana);
  }

  return {
    ...partai,
    status: STATUS_BERJALAN,
    nomorKocokan: partai.nomorKocokan + 1,
    kocokan: mulai.state,
    infoPembuka: {
      pembuka: mulai.pembuka,
      syarat: mulai.state.syaratPembuka,
      alasan: mulai.alasan,
      ulang,
    },
    jumlahKocokUlang: partai.jumlahKocokUlang + ulang,
  };
}

/** Pemain memainkan kartu. Bila kocokan berakhir karenanya, status menjadi 'ringkasan'. */
export function mainkanPartai(partai: Partai, pemain: NomorPemain, kartu: Kartu, sisi: Sisi): PartaiBerjalan | PartaiRingkasan {
  pastikanBerjalan(partai, 'memainkan kartu');
  return akhiriBilaSelesai({ ...partai, kocokan: mainkan(partai.kocokan, pemain, kartu, sisi) });
}

/** Pemain lewat. Bila kocokan berakhir karenanya (tabrak), status menjadi 'ringkasan'. */
export function lewatPartai(partai: Partai, pemain: NomorPemain): PartaiBerjalan | PartaiRingkasan {
  pastikanBerjalan(partai, 'lewat');
  return akhiriBilaSelesai({ ...partai, kocokan: lewat(partai.kocokan, pemain) });
}

/**
 * Bila kocokan sudah berakhir: hitung hasil, tambahkan ke markah, cek pemenang.
 * Markah langsung berubah di sini, supaya tampilan ringkasan sudah punya angkanya.
 */
function akhiriBilaSelesai(partai: PartaiBerjalan): PartaiBerjalan | PartaiRingkasan {
  if (!akhirKocokan(partai.kocokan)) return partai;

  const hasil: HasilPartai = {
    ...hitungHasil(partai.kocokan),
    nomor: partai.nomorKocokan,
    pembuka: partai.infoPembuka.pembuka,
    jumlahLangkah: partai.kocokan.riwayat.length,
  };
  const markah = terapkanHasil(partai.markah, hasil);

  return {
    ...partai,
    status: STATUS_RINGKASAN,
    markah,
    hasilTerakhir: hasil,
    riwayatHasil: [...partai.riwayatHasil, hasil],
    pemenang: pemenangPartai(markah),
  };
}

/**
 * Pindah dari ringkasan kocokan ke langkah berikutnya: kocokan baru (status
 * 'siap') atau akhir partai (status 'selesai') bila ada tim yang mencapai 100.
 */
export function lanjutkanPartai(partai: Partai): PartaiSiap | PartaiSelesai {
  pastikanStatus(partai, STATUS_RINGKASAN, 'melanjutkan');
  if (partai.status !== STATUS_RINGKASAN) throw new Error('tidak mungkin tercapai'); // penyempit tipe

  const { pemenang } = partai;
  if (pemenang) {
    return { ...partai, status: STATUS_SELESAI, kocokan: null, infoPembuka: null, pemenang };
  }
  return {
    ...partai,
    status: STATUS_SIAP,
    rencana: partai.hasilTerakhir.rencanaBerikutnya,
    kocokan: null,
    infoPembuka: null,
    pemenang: null,
  };
}
