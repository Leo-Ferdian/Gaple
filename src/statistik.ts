// statistik.ts: rekor pemain, disimpan di browser. Murni; penyimpanannya dioper dari luar.
//
// Setiap kejadian dicatat sekali saja: `dicatat` menyimpan kunci beberapa kejadian terakhir, jadi memuat ulang
// halaman di layar yang sama tidak menghitung ganda.

import { timPemain } from './engine.ts';
import type { NomorTim } from './engine.ts';
import { AI_TERSEDIA } from './controller.ts';
import type { TingkatAi } from './controller.ts';
import type { HasilKocokan } from './markah.ts';
import type { Penyimpanan } from './penyimpanan.ts';

export const KUNCI_STATISTIK = 'gaple:statistik:v1';

export interface Hitungan {
  readonly main: number;
  readonly menang: number;
}

export interface Statistik {
  readonly pertandingan: Hitungan;
  readonly partai: Hitungan;
  /** Kocokan: `menang` = lawan yang kena markah, `kalah` = tim Anda yang kena, sisanya seri. */
  readonly kocokan: Hitungan & { readonly kalah: number };
  /** Bonus yang Anda atau Rekan dapatkan saat menutup kocokan. */
  readonly bonus: { readonly double: number; readonly triplet: number; readonly quartet: number };
  readonly beruntun: number;
  readonly beruntunTerbaik: number;
  readonly perAi: Readonly<Record<TingkatAi, Hitungan>>;
  readonly dicatat: readonly string[];
}

const KOSONG: Hitungan = { main: 0, menang: 0 };

export function statistikBaru(): Statistik {
  return {
    pertandingan: KOSONG,
    partai: KOSONG,
    kocokan: { main: 0, menang: 0, kalah: 0 },
    bonus: { double: 0, triplet: 0, quartet: 0 },
    beruntun: 0,
    beruntunTerbaik: 0,
    perAi: { mudah: KOSONG, sedang: KOSONG, sulit: KOSONG },
    dicatat: [],
  };
}

const tambah = (h: Hitungan, menang: boolean): Hitungan => ({ main: h.main + 1, menang: h.menang + (menang ? 1 : 0) });
const batasi = (kunci: readonly string[], baru: string): string[] => [...kunci, baru].slice(-8);

/** Kocokan berakhir. `kunci` unik per kocokan; kejadian yang sama tidak dihitung dua kali. */
export function catatKocokan(s: Statistik, hasil: HasilKocokan, kunci: string): Statistik {
  if (s.dicatat.includes(kunci)) return s;
  const menang = hasil.timKena === 1;
  const kalah = hasil.timKena === 0;
  const bonus =
    hasil.akhir === 'habis' && hasil.bonus !== null && timPemain(hasil.penutup) === 0
      ? { ...s.bonus, [hasil.bonus.jenis]: s.bonus[hasil.bonus.jenis] + 1 }
      : s.bonus;
  return {
    ...s,
    kocokan: { main: s.kocokan.main + 1, menang: s.kocokan.menang + (menang ? 1 : 0), kalah: s.kocokan.kalah + (kalah ? 1 : 0) },
    bonus,
    dicatat: batasi(s.dicatat, kunci),
  };
}

export function catatPartai(s: Statistik, menang: NomorTim, kunci: string): Statistik {
  if (s.dicatat.includes(kunci)) return s;
  return { ...s, partai: tambah(s.partai, menang === 0), dicatat: batasi(s.dicatat, kunci) };
}

/** Pertandingan berakhir dengan juara `juara`, melawan AI `ai`. */
export function catatPertandingan(s: Statistik, juara: NomorTim, ai: TingkatAi, kunci: string): Statistik {
  if (s.dicatat.includes(kunci)) return s;
  const menang = juara === 0;
  const beruntun = menang ? s.beruntun + 1 : 0;
  return {
    ...s,
    pertandingan: tambah(s.pertandingan, menang),
    beruntun,
    beruntunTerbaik: Math.max(s.beruntunTerbaik, beruntun),
    perAi: { ...s.perAi, [ai]: tambah(s.perAi[ai], menang) },
    dicatat: batasi(s.dicatat, kunci),
  };
}

type Objek = Record<string, unknown>;
const adalahObjek = (x: unknown): x is Objek => typeof x === 'object' && x !== null && !Array.isArray(x);
const bilangan = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0);

function hitungan(x: unknown): Hitungan {
  if (!adalahObjek(x)) return KOSONG;
  const main = bilangan(x.main);
  return { main, menang: Math.min(main, bilangan(x.menang)) };
}

/** Membersihkan data tak dikenal menjadi statistik yang sah (nilai buruk menjadi 0). */
export function rapikanStatistik(x: unknown): Statistik {
  if (!adalahObjek(x)) return statistikBaru();
  const k = adalahObjek(x.kocokan) ? x.kocokan : {};
  const b = adalahObjek(x.bonus) ? x.bonus : {};
  const a = adalahObjek(x.perAi) ? x.perAi : {};
  const kocokan = hitungan(k);
  const [mudah, sedang, sulit] = AI_TERSEDIA.map((nama) => hitungan(a[nama]));
  return {
    pertandingan: hitungan(x.pertandingan),
    partai: hitungan(x.partai),
    kocokan: { ...kocokan, kalah: Math.min(kocokan.main - kocokan.menang, bilangan(k.kalah)) },
    bonus: { double: bilangan(b.double), triplet: bilangan(b.triplet), quartet: bilangan(b.quartet) },
    beruntun: bilangan(x.beruntun),
    beruntunTerbaik: Math.max(bilangan(x.beruntunTerbaik), bilangan(x.beruntun)),
    perAi: { mudah: mudah ?? KOSONG, sedang: sedang ?? KOSONG, sulit: sulit ?? KOSONG },
    dicatat: Array.isArray(x.dicatat) ? x.dicatat.filter((d): d is string => typeof d === 'string').slice(-8) : [],
  };
}

export function muatStatistik(storage: Penyimpanan | null): Statistik {
  if (storage === null) return statistikBaru();
  try {
    const teks = storage.getItem(KUNCI_STATISTIK);
    return rapikanStatistik(teks === null ? null : JSON.parse(teks));
  } catch {
    return statistikBaru();
  }
}

export function simpanStatistik(storage: Penyimpanan | null, s: Statistik): boolean {
  if (storage === null) return false;
  try {
    storage.setItem(KUNCI_STATISTIK, JSON.stringify(rapikanStatistik(s)));
    return true;
  } catch {
    return false;
  }
}

export function hapusStatistik(storage: Penyimpanan | null): void {
  if (storage === null) return;
  try {
    storage.removeItem(KUNCI_STATISTIK);
  } catch {
    // penyimpanan menolak: abaikan
  }
}
