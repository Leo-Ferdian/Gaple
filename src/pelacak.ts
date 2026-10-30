// pelacak.ts: pelacak kartu dan peluang (tahap 5).
//
// Murni. Bekerja dari "pandangan seorang pemain": tangannya sendiri, meja, riwayat, dan jumlah
// kartu tiap pemain. Tangan pemain lain TIDAK dibaca (aturan GUIDE 3, dijaga tes).
//
// Yang dihitung:
//  - kartu yang sudah keluar, dan kartu yang belum terlihat (bukan di meja, bukan di tangan sendiri);
//  - angka yang terbukti tidak dimiliki tiap pemain (dari riwayat lewat);
//  - PELUANG tepat: kartu yang belum terlihat dibagikan acak ke tiga pemain lain, dengan jumlah kartu
//    tiap pemain tetap dan larangan angka dari riwayat lewat. Semua pembagian yang cocok dianggap
//    sama mungkin; peluang kartu c ada di pemain p = (banyak pembagian cocok dengan c di p) / (banyak
//    seluruh pembagian cocok). Dihitung dengan pemrograman dinamis, tanpa tebakan acak.
//
// Yang TIDAK dimodelkan: pilihan langkah pemain lain (mis. "ia memilih 3-4 padahal bisa 3-6") tidak
// dipakai sebagai petunjuk; hanya fakta pasti (lewat) yang dipakai.

import { ANGKA_TERBESAR, buatDek } from './engine.ts';
import type { Angka, Kartu, NomorPemain } from './engine.ts';
import type { Meja } from './meja.ts';
import type { Kejadian, StateKocokan } from './tipe-kocokan.ts';

/** Apa yang boleh diketahui satu pemain tentang kocokan. */
export interface Pandangan {
  readonly pemain: NomorPemain;
  readonly tangan: readonly Kartu[];
  readonly meja: Meja;
  readonly riwayat: readonly Kejadian[];
  /** Jumlah kartu di tangan tiap pemain (indeks = nomor pemain); jumlah ini kelihatan di meja. */
  readonly jumlahKartu: readonly [number, number, number, number];
}

/** Mengambil pandangan satu pemain dari state penuh (satu-satunya tempat state penuh dibaca). */
export function pandangan(state: StateKocokan, pemain: NomorPemain): Pandangan {
  const t = state.tangan;
  return {
    pemain,
    tangan: t[pemain],
    meja: state.meja,
    riwayat: state.riwayat,
    jumlahKartu: [t[0].length, t[1].length, t[2].length, t[3].length],
  };
}

/** Angka yang terbukti tidak dimiliki `pemain`: angka di dua ujung meja setiap kali ia lewat. */
export function angkaTerlarang(riwayat: readonly Kejadian[], pemain: NomorPemain): ReadonlySet<Angka> {
  const hasil = new Set<Angka>();
  for (const k of riwayat) {
    if (k.aksi !== 'lewat' || k.pemain !== pemain) continue;
    if (k.ujungSebelum.kiri !== null) hasil.add(k.ujungSebelum.kiri);
    if (k.ujungSebelum.kanan !== null) hasil.add(k.ujungSebelum.kanan);
  }
  return hasil;
}

const SEMUA_PEMAIN: readonly NomorPemain[] = [0, 1, 2, 3];

const punyaAngka = (kartu: Kartu, angka: Angka): boolean => kartu.a === angka || kartu.b === angka;

/** Banyak cara membagi kartu ke tiga pemain dengan jumlah tertentu, bila tiap kartu hanya boleh ke pemain tertentu. */
function banyakPembagian(izin: readonly (readonly [boolean, boolean, boolean])[], ukuran: readonly [number, number, number]): number {
  const [n0, n1, n2] = ukuran;
  const lebar = n1 + 1;
  let dp = new Array<number>((n0 + 1) * lebar).fill(0);
  dp[0] = 1;
  for (let i = 0; i < izin.length; i++) {
    const baris = izin[i];
    if (baris === undefined) throw new Error('baris izin hilang');
    const baru = new Array<number>((n0 + 1) * lebar).fill(0);
    for (let c0 = 0; c0 <= Math.min(i, n0); c0++) {
      for (let c1 = 0; c1 <= Math.min(i - c0, n1); c1++) {
        const jumlah = dp[c0 * lebar + c1] ?? 0;
        if (jumlah === 0) continue;
        const c2 = i - c0 - c1;
        if (baris[0] && c0 < n0) baru[(c0 + 1) * lebar + c1] = (baru[(c0 + 1) * lebar + c1] ?? 0) + jumlah;
        if (baris[1] && c1 < n1) baru[c0 * lebar + c1 + 1] = (baru[c0 * lebar + c1 + 1] ?? 0) + jumlah;
        if (baris[2] && c2 < n2) baru[c0 * lebar + c1] = (baru[c0 * lebar + c1] ?? 0) + jumlah;
      }
    }
    dp = baru;
  }
  return dp[n0 * lebar + n1] ?? 0;
}

export interface Pelacak {
  readonly pandangan: Pandangan;
  /** Kartu yang sudah di meja, dari kiri ke kanan. */
  readonly keluar: readonly Kartu[];
  /** Kartu yang bukan di meja dan bukan di tangan sendiri (ada di tangan tiga pemain lain). */
  readonly belumTerlihat: readonly Kartu[];
  /** Per angka 0..6: banyak kartu belum terlihat yang memuat angka itu (balak dihitung satu). */
  readonly sisaPerAngka: readonly number[];
  /** Angka yang terbukti tidak dimiliki pemain itu. */
  readonly terlarang: (pemain: NomorPemain) => ReadonlySet<Angka>;
  /** Peluang (0..1) kartu ini ada di tangan pemain itu. Tangan sendiri: 1 atau 0. Kartu di meja: 0. */
  readonly peluangKartu: (idKartu: string, pemain: NomorPemain) => number;
  /** Peluang pemain itu memegang setidaknya satu kartu berangka ini. */
  readonly peluangPunyaAngka: (pemain: NomorPemain, angka: Angka) => number;
  /** Peluang pemain itu tidak punya kartu berangka `a` maupun `b` (yaitu lewat bila ujung meja a dan b). */
  readonly peluangTidakPunya: (pemain: NomorPemain, a: Angka, b: Angka) => number;
}

/** Membangun pelacak dari pandangan seorang pemain. */
export function buatPelacak(v: Pandangan): Pelacak {
  const diMeja = new Set<string>(v.meja.rangkaian.map((l) => l.kartu.id));
  const dimiliki = new Set<string>(v.tangan.map((k) => k.id));
  const keluar = v.meja.rangkaian.map((l) => l.kartu);
  const belumTerlihat = buatDek().filter((k) => !diMeja.has(k.id) && !dimiliki.has(k.id));

  const lain = SEMUA_PEMAIN.filter((n) => n !== v.pemain);
  const [p0, p1, p2] = lain;
  if (p0 === undefined || p1 === undefined || p2 === undefined) throw new Error('harus ada tiga pemain lain');
  const ukuran: [number, number, number] = [v.jumlahKartu[p0], v.jumlahKartu[p1], v.jumlahKartu[p2]];
  if (ukuran[0] + ukuran[1] + ukuran[2] !== belumTerlihat.length) {
    throw new Error(`Jumlah kartu pemain lain (${ukuran.join('+')}) tidak sama dengan kartu belum terlihat (${belumTerlihat.length})`);
  }
  const terlarangLain = lain.map((p) => angkaTerlarang(v.riwayat, p));
  const dasar: [boolean, boolean, boolean][] = belumTerlihat.map((k) => [
    !(terlarangLain[0]?.has(k.a) || terlarangLain[0]?.has(k.b)),
    !(terlarangLain[1]?.has(k.a) || terlarangLain[1]?.has(k.b)),
    !(terlarangLain[2]?.has(k.a) || terlarangLain[2]?.has(k.b)),
  ]);
  const total = banyakPembagian(dasar, ukuran);
  if (total === 0) throw new Error('Tidak ada pembagian kartu yang cocok dengan riwayat (state tidak konsisten)');

  const indeksLain = (pemain: NomorPemain): number => lain.indexOf(pemain);

  /** Banyak pembagian cocok bila izin tiap kartu dibatasi lebih jauh oleh `ubah`. */
  const hitungDengan = (ubah: (baris: readonly [boolean, boolean, boolean], kartu: Kartu) => [boolean, boolean, boolean]): number =>
    banyakPembagian(
      dasar.map((baris, i) => {
        const kartu = belumTerlihat[i];
        if (kartu === undefined) throw new Error('kartu hilang');
        return ubah(baris, kartu);
      }),
      ukuran,
    );

  const peluangPerKartu = new Map<string, readonly [number, number, number]>();
  for (const kartu of belumTerlihat) {
    const di = (j: 0 | 1 | 2): number =>
      hitungDengan((b, k) => (k.id === kartu.id ? [j === 0 && b[0], j === 1 && b[1], j === 2 && b[2]] : [b[0], b[1], b[2]])) / total;
    peluangPerKartu.set(kartu.id, [di(0), di(1), di(2)]);
  }

  const peluangKartu = (idKartu: string, pemain: NomorPemain): number => {
    if (pemain === v.pemain) return dimiliki.has(idKartu) ? 1 : 0;
    const baris = peluangPerKartu.get(idKartu);
    if (baris === undefined) return 0; // di meja
    return baris[indeksLain(pemain)] ?? 0;
  };

  const peluangTidakPunya = (pemain: NomorPemain, a: Angka, b: Angka): number => {
    if (pemain === v.pemain) return v.tangan.some((k) => punyaAngka(k, a) || punyaAngka(k, b)) ? 0 : 1;
    const j = indeksLain(pemain);
    return (
      hitungDengan((baris, k) => {
        const salinan: [boolean, boolean, boolean] = [baris[0], baris[1], baris[2]];
        if (punyaAngka(k, a) || punyaAngka(k, b)) salinan[j] = false;
        return salinan;
      }) / total
    );
  };

  const sisaPerAngka = Array.from(
    { length: ANGKA_TERBESAR + 1 },
    (_, angka) => belumTerlihat.filter((k) => k.a === angka || k.b === angka).length,
  );

  return {
    pandangan: v,
    keluar,
    belumTerlihat,
    sisaPerAngka,
    terlarang: (pemain) => (pemain === v.pemain ? new Set<Angka>() : (terlarangLain[indeksLain(pemain)] ?? new Set<Angka>())),
    peluangKartu,
    peluangPunyaAngka: (pemain, angka) => 1 - peluangTidakPunya(pemain, angka, angka),
    peluangTidakPunya,
  };
}
