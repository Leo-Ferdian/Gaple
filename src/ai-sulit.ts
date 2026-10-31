// ai-sulit.ts: pemain komputer tingkat Sulit (tahap 6).
//
// Murni: masukan state kocokan, keluaran satu langkah. Tidak mengubah apa pun.
//
// Cara kerja (determinisasi + simulasi, dikenal sebagai PIMC):
//  1. Dari PANDANGAN pemain (tangan sendiri, meja, riwayat, jumlah kartu) pelacak.ts membuat dugaan
//     pembagian kartu pemain lain yang cocok dengan semua fakta pasti (jumlah kartu, riwayat lewat).
//     Dugaan ditarik seragam dari semua kemungkinan (tepat, bukan perkiraan kasar).
//  2. Untuk tiap dugaan, setiap langkah legal dicoba, lalu kocokan dimainkan sampai selesai oleh
//     keempat pemain dengan AI Sedang. Nilai langkah = markah tambahan lawan dikurangi markah
//     tambahan tim sendiri (bonus dan tabrak ikut terhitung).
//  3. Langkah dengan nilai rata-rata tertinggi dipilih; seri dipilih acak.
//
// AI tidak pernah membaca tangan pemain lain: hanya `pandangan`. Semua keacakan lewat `acak` yang dioper,
// jadi hasilnya bisa diulang dengan benih yang sama.

import { timPemain } from './engine.ts';
import type { Kartu, NomorPemain } from './engine.ts';
import { akhirKocokan } from './akhir.ts';
import { kartuLegalPemain, lewat, mainkan } from './kocokan.ts';
import { hitungHasil } from './markah.ts';
import type { Sisi } from './meja.ts';
import type { FungsiAcak } from './rng.ts';
import type { LangkahAcak } from './simulasi.ts';
import type { StateKocokan } from './tipe-kocokan.ts';
import { buatPelacak, pandangan } from './pelacak.ts';
import { pilihLangkahSedang } from './ai-sedang.ts';

/** Banyak dugaan pembagian per keputusan. Makin besar makin teliti dan makin lambat. */
export const DUGAAN_BAWAAN = 60;

/** Batas langkah satu simulasi; kocokan nyata paling banyak sekitar 60 langkah. */
const BATAS_LANGKAH = 300;

export interface NilaiLangkah {
  readonly kartu: Kartu;
  readonly sisi: Sisi;
  /** Rata-rata (markah tambahan lawan - markah tambahan tim sendiri) pada dugaan yang disimulasikan. */
  readonly nilai: number;
}

export interface OpsiSulit {
  readonly dugaan?: number;
}

/** Memainkan kocokan sampai berakhir dengan AI Sedang di semua kursi; hasilnya selisih markah dari sudut pandang `tim`. */
function nilaiAkhir(awal: StateKocokan, tim: 0 | 1, acak: FungsiAcak): number {
  let s = awal;
  for (let i = 0; i < BATAS_LANGKAH && akhirKocokan(s) === null; i++) {
    const langkah = pilihLangkahSedang(s, acak);
    s = langkah.aksi === 'lewat' ? lewat(s, langkah.pemain) : mainkan(s, langkah.pemain, langkah.kartu, langkah.sisi);
  }
  const { tambahan } = hitungHasil(s);
  const lawan = tim === 0 ? 1 : 0;
  return tambahan[lawan] - tambahan[tim];
}

/**
 * Nilai tiap langkah legal bagi pemain yang sedang giliran, dari yang terbaik. Kosong bila harus lewat.
 * Dipakai AI Sulit dan fitur Saran di mode latihan.
 */
export function nilaiLangkahSulit(state: StateKocokan, acak: FungsiAcak, { dugaan = DUGAAN_BAWAAN }: OpsiSulit = {}): NilaiLangkah[] {
  const pemain: NomorPemain = state.giliran;
  const pilihan = kartuLegalPemain(state, pemain).flatMap((p) => p.sisi.map((sisi) => ({ kartu: p.kartu, sisi })));
  if (pilihan.length === 0) return [];
  if (pilihan.length === 1) return pilihan.map((p) => ({ ...p, nilai: 0 }));

  const pelacak = buatPelacak(pandangan(state, pemain));
  const tim = timPemain(pemain);
  const jumlah = pilihan.map(() => 0);
  for (let d = 0; d < dugaan; d++) {
    const tangan = pelacak.ambilTangan(acak);
    const dugaanState: StateKocokan = { ...state, tangan };
    pilihan.forEach((p, i) => {
      const sesudah = mainkan(dugaanState, pemain, p.kartu, p.sisi);
      jumlah[i] = (jumlah[i] ?? 0) + nilaiAkhir(sesudah, tim, acak);
    });
  }
  return pilihan.map((p, i) => ({ ...p, nilai: (jumlah[i] ?? 0) / dugaan })).sort((a, b) => b.nilai - a.nilai);
}

/** Memilih langkah untuk pemain yang sedang giliran. Lewat bila tidak ada kartu legal. */
export function pilihLangkahSulit(state: StateKocokan, acak: FungsiAcak, opsi: OpsiSulit = {}): LangkahAcak {
  const pemain = state.giliran;
  const nilai = nilaiLangkahSulit(state, acak, opsi);
  const terbaik = nilai[0];
  if (terbaik === undefined) return { aksi: 'lewat', pemain };
  const kandidat = nilai.filter((n) => Math.abs(n.nilai - terbaik.nilai) <= 1e-9);
  const dipilih = kandidat[Math.floor(acak() * kandidat.length)];
  if (dipilih === undefined) throw new Error('Tidak ada kandidat langkah, seharusnya tidak mungkin');
  return { aksi: 'main', pemain, kartu: dipilih.kartu, sisi: dipilih.sisi };
}
