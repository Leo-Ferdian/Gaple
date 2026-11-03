// tata-rantai.ts: menata kartu rantai di meja (posisi dan putaran). Murni, tanpa DOM.
//
// Masukan: meja.rangkaian (urutan kiri ke kanan, lihat meja.ts) dan area meja.
// Keluaran: untuk tiap kartu, titik tengahnya, putarannya, dan angka mana yang
// menghadap anchor. Yang menggambar (rangkaian-svg.ts) tinggal mengikutinya.
//
// Aturan tata letak:
//  1. Kartu yang pertama dimainkan (anchor) ada di pusat kerangka maya (0, 0), lalu rantai
//     tumbuh ke dua arah. Tiap ujung ditata sendiri, kartu demi kartu, TANPA melihat ke depan
//     dan tanpa melihat ujung lain, jadi posisi kartu yang sudah keluar terkunci: menambah kartu
//     tidak pernah memindahkan atau memutar kartu lama.
//  2. Kartu biasa memanjang searah rantai; kartu double melintang (tegak lurus).
//  3. Bila kartu berikutnya tidak muat di kerangka (atau tidak menyisakan ruang satu panjang
//     kartu untuk belokan), rantai membelok siku 90 derajat: kartu belokan diletakkan di UJUNG
//     kartu terakhir lalu rantai lanjut tegak lurus. Ujung kiri: ke atas, lalu ke kanan. Ujung
//     kanan: ke bawah, lalu ke kiri. Paling banyak dua belokan; segmen ketiga tidak dibatasi.
//  (Kartu double yang menjadi kartu sudut digambar sebagai kartu biasa, bukan melintang.)
//  4. Belokan tidak boleh langsung sesudah double (kartu belokan akan sejajar menempel). Karena
//     tidak melihat ke depan: double hanya dipasang lurus bila sesudahnya masih muat satu kartu
//     biasa; jika tidak, double itulah kartu belokannya.
//  5. Kartu yang bukan tetangga di rantai berjarak JARAK_BEBAS dari kartu lain.
//  6. Kamera: seluruh hasil diskalakan seragam di sekitar anchor. Skala awal SKALA_AWAL; hanya
//     mengecil bila segmen ketiga melewati area. Rantai tidak pernah terpotong.
//  7. Angka yang bersentuhan sama; yang berubah hanya putaran kartu (0, 90, 180, 270 derajat).
//     `awal` = angka di separuh yang menghadap anchor, `akhir` = angka di separuh yang menghadap
//     ujung rantai. Kartu datar bergambar separuh pertama di kiri, jadi putarannya selalu
//     membawa `awal` ke sisi anchor.

import { PANJANG_KARTU, LEBAR_KARTU } from './kartu-svg.ts';
import type { Angka, Kartu } from '../engine.ts';
import type { Letak } from '../meja.ts';
import type { KejadianMain, StateKocokan } from '../tipe-kocokan.ts';

// ---------------------------------------------------------------------------
// Tipe
// ---------------------------------------------------------------------------

export interface Area {
  readonly lebar: number;
  readonly tinggi: number;
}
export interface UkuranKartu {
  readonly panjang: number;
  readonly lebar: number;
}
interface Titik {
  readonly x: number;
  readonly y: number;
}
interface Kotak {
  readonly x1: number;
  readonly x2: number;
  readonly y1: number;
  readonly y2: number;
}

type ArahJalan = 'timur' | 'selatan' | 'barat' | 'utara';
/** Arah kartu dalam rantai; 'pusat' khusus kartu anchor. */
export type ArahKartuTata = ArahJalan | 'pusat';
export type SisiRantai = 'anchor' | 'kiri' | 'kanan';

/** Satu kartu rantai yang sudah ditata. */
export interface KartuTata {
  readonly id: string;
  /** Titik tengah kartu dalam satuan area. */
  readonly x: number;
  readonly y: number;
  /** Putaran dalam derajat: 0, 90, 180, atau 270. */
  readonly rotasi: number;
  /** Angka di separuh yang menghadap anchor. */
  readonly awal: Angka;
  /** Angka di separuh yang menghadap ujung rantai. */
  readonly akhir: Angka;
  readonly double: boolean;
  readonly arah: ArahKartuTata;
  readonly sisi: SisiRantai;
  /** Kartu paling kiri atau paling kanan. */
  readonly ujung: boolean;
}

export interface HasilTata {
  readonly area: Area;
  readonly skala: number;
  /** Ukuran kartu sudah dikalikan skala. */
  readonly ukuran: UkuranKartu;
  readonly kartu: readonly KartuTata[];
}

export interface OpsiTata {
  readonly area?: Area;
  readonly indeksAnchor?: number;
  readonly ukuran?: UkuranKartu;
}

/** Kartu rantai dengan angka yang menghadap anchor dan ujung. */
interface KartuTarget {
  readonly kartu: Kartu;
  readonly dobel: boolean;
  readonly awal: Angka;
  readonly akhir: Angka;
}
interface KartuTertata {
  readonly kartu: KartuTarget;
  readonly pusat: Titik;
  readonly arah: ArahJalan;
  /** Digambar melintang? False untuk double yang menjadi kartu sudut (digambar sebagai kartu biasa). */
  readonly melintang: boolean;
}
interface PosisiKartu {
  readonly id: string;
  readonly pusat: Titik;
  readonly arah: ArahKartuTata;
  readonly putar: number;
  readonly awal: Angka;
  readonly akhir: Angka;
  readonly dobel: boolean;
  readonly melintang: boolean;
  readonly sisi: SisiRantai;
}

// ---------------------------------------------------------------------------
// Konstanta
// ---------------------------------------------------------------------------

/** Ukuran satu kartu datar dalam satuan area (sama dengan viewBox kartu-svg). */
export const UKURAN_KARTU: UkuranKartu = Object.freeze({ panjang: PANJANG_KARTU, lebar: LEBAR_KARTU });
/** Area untuk layar lebar dan layar sempit (HP). Aspeknya mengikuti ruang yang tersedia. */
export const AREA_LUAS: Area = Object.freeze({ lebar: 1000, tinggi: 500 });
export const AREA_SEMPIT: Area = Object.freeze({ lebar: 600, tinggi: 440 });

export const MARGIN = 8; // jarak minimal kartu dari tepi area
/** Skala awal kartu. Disisakan ruang (kartu tidak dimulai pada ukuran penuh) supaya rantai jarang perlu mengecil. */
export const SKALA_AWAL = 0.8;
/** Ukuran kerangka minimal (dalam panjang kartu, setengah lebar dan setengah tinggi). */
const KERANGKA_MIN_LEBAR = 3;
const KERANGKA_MIN_TINGGI = 2.5;
/**
 * Segmen tengah (antara belokan pertama dan kedua) harus cukup panjang sebelum boleh berbelok lagi:
 * ujungnya sekurang-kurangnya sejauh satu panjang kartu (setengah balak baris utama + setengah balak baris terakhir)
 * ditambah JARAK_BEBAS dan setengah lebar kartu belokan dari sumbu baris utama. Dengan begitu balak melintang di baris
 * terakhir tidak pernah menempel pada balak baris utama, tanpa melihat ujung rantai yang lain.
 * (Dua kartu biasa sudah cukup; kartu balak melintang di kolom pendek, jadi bisa perlu satu kartu lagi.)
 */
const JARAK_SEGMEN_MIN = PANJANG_KARTU + LEBAR_KARTU * 0.4 + LEBAR_KARTU / 2;
const TOLERANSI = 0.01;
const MAKS_BELOKAN = 2;
/** Jarak bebas minimal antara dua kartu yang bukan tetangga di rantai, supaya tidak tampak bertumpuk. */
const JARAK_BEBAS = LEBAR_KARTU * 0.4;

const ARAH = {
  timur: { dx: 1, dy: 0, putar: 0 },
  selatan: { dx: 0, dy: 1, putar: 90 },
  barat: { dx: -1, dy: 0, putar: 180 },
  utara: { dx: 0, dy: -1, putar: 270 },
} as const satisfies Record<ArahJalan, { dx: number; dy: number; putar: number }>;
const URUTAN_BELOK_KIRI: readonly ArahJalan[] = ['utara', 'timur'];
const URUTAN_BELOK_KANAN: readonly ArahJalan[] = ['selatan', 'barat'];

/** Indeks (di meja.rangkaian) kartu yang pertama dimainkan di kocokan ini; -1 bila meja masih kosong. */
export function indeksAnchor(kocokan: Pick<StateKocokan, 'riwayat' | 'meja'>): number {
  const pertama = kocokan.riwayat.find((r): r is KejadianMain => r.aksi === 'main');
  if (!pertama) return -1;
  return kocokan.meja.rangkaian.findIndex((l) => l.kartu.id === pertama.kartu.id);
}

// ---------------------------------------------------------------------------
// Geometri
// ---------------------------------------------------------------------------

function kotakKartu(pusat: Titik, arah: ArahJalan, dobel: boolean, ukuran: UkuranKartu): Kotak {
  const sepanjang = (dobel ? ukuran.lebar : ukuran.panjang) / 2; // setengah panjang searah rantai
  const melintang = (dobel ? ukuran.panjang : ukuran.lebar) / 2;
  const mendatar = ARAH[arah].dx !== 0;
  const hw = mendatar ? sepanjang : melintang;
  const hh = mendatar ? melintang : sepanjang;
  return { x1: pusat.x - hw, x2: pusat.x + hw, y1: pusat.y - hh, y2: pusat.y + hh };
}

const bertumpuk = (p: Kotak, q: Kotak): boolean =>
  Math.min(p.x2, q.x2) - Math.max(p.x1, q.x1) > TOLERANSI && Math.min(p.y2, q.y2) - Math.max(p.y1, q.y1) > TOLERANSI;

/** Kotak yang dibesarkan `jarak` ke semua sisi. */
const dibesarkan = (k: Kotak, jarak: number): Kotak => ({ x1: k.x1 - jarak, x2: k.x2 + jarak, y1: k.y1 - jarak, y2: k.y2 + jarak });

/** Kotak dalam kerangka maya: pusat anchor di (0, 0), kerangka selebar area / SKALA_AWAL. */
export interface Kerangka {
  readonly setengahLebar: number;
  readonly setengahTinggi: number;
}

/** Apakah kotak masih di dalam kerangka maya. */
function didalamKerangka(k: Kotak, kerangka: Kerangka): boolean {
  return (
    Math.abs(k.x1) <= kerangka.setengahLebar + TOLERANSI &&
    Math.abs(k.x2) <= kerangka.setengahLebar + TOLERANSI &&
    Math.abs(k.y1) <= kerangka.setengahTinggi + TOLERANSI &&
    Math.abs(k.y2) <= kerangka.setengahTinggi + TOLERANSI
  );
}

/**
 * Menata satu ujung rantai, kartu demi kartu menjauhi anchor, dalam kerangka maya (anchor di 0,0).
 *
 * Penting: hasil tiap kartu hanya bergantung pada kartu-kartu sebelumnya di ujung ini (tanpa
 * melihat ke depan dan tanpa melihat ujung lain). Jadi kartu yang sudah keluar tidak pernah
 * pindah atau berubah bentuk ketika kartu baru ditambahkan: posisinya terkunci oleh konstruksi.
 *
 * Belokan tidak boleh langsung sesudah double (kartu belokan akan sejajar menempel di sisi
 * panjang double). Karena tidak boleh melihat ke depan, aturannya: double hanya boleh dipasang
 * lurus bila sesudahnya masih muat satu kartu biasa; bila tidak, double itulah yang menjadi
 * kartu belokan. Dengan begitu kartu sesudah double selalu muat lurus.
 */
function tataSatuSisi(
  kartuKeluar: readonly KartuTarget[],
  awalArah: ArahJalan,
  urutanBelok: readonly ArahJalan[],
  lebarAcrossAwal: number,
  kursorAwal: Titik,
  kotakAnchor: Kotak,
  kerangka: Kerangka,
  ukuran: UkuranKartu,
): KartuTertata[] {
  let arah = awalArah;
  let kursor: Titik = { ...kursorAwal }; // pusat sisi depan kartu terakhir
  let setengahMelintangSebelum = lebarAcrossAwal;
  let belok = 0;
  const hasil: KartuTertata[] = [];
  const milik: Kotak[] = []; // kotak kartu di ujung ini, dari yang terdekat ke anchor

  /** Kotak yang bukan tetangga (dua kartu terakhir, atau anchor bila baru satu) harus berjarak JARAK_BEBAS. */
  const bentrok = (kotak: Kotak, dengan: readonly Kotak[]): boolean => {
    const tetangga = new Set<Kotak>(dengan.slice(-2));
    if (dengan.length < 2) tetangga.add(kotakAnchor);
    return [kotakAnchor, ...dengan].some((k) => (tetangga.has(k) ? bertumpuk(k, kotak) : bertumpuk(dibesarkan(k, JARAK_BEBAS), kotak)));
  };

  /**
   * Muat di kerangka DAN masih menyisakan ruang satu panjang kartu di depannya, supaya kartu
   * belokan (paling lebar: double, selebar satu panjang kartu) selalu muat bila kartu berikutnya harus belok.
   */
  const muatDenganCadangan = (kotak: Kotak, arahKartu: ArahJalan): boolean => {
    const { dx, dy } = ARAH[arahKartu];
    const lebih: Kotak = {
      x1: Math.min(kotak.x1, kotak.x1 + dx * ukuran.panjang),
      x2: Math.max(kotak.x2, kotak.x2 + dx * ukuran.panjang),
      y1: Math.min(kotak.y1, kotak.y1 + dy * ukuran.panjang),
      y2: Math.max(kotak.y2, kotak.y2 + dy * ukuran.panjang),
    };
    return didalamKerangka(lebih, kerangka);
  };

  for (const kartu of kartuKeluar) {
    let sudut = false; // sudah berbelok untuk kartu ini: double menjadi kartu sudut, digambar sebagai kartu biasa
    for (;;) {
      const terakhir = belok >= MAKS_BELOKAN; // segmen terakhir: panjangnya tidak dibatasi
      const coba = (m: boolean) => {
        const sepanjang = m ? ukuran.lebar : ukuran.panjang;
        const pusat: Titik = { x: kursor.x + ARAH[arah].dx * (sepanjang / 2), y: kursor.y + ARAH[arah].dy * (sepanjang / 2) };
        return { sepanjang, pusat, kotak: kotakKartu(pusat, arah, m, ukuran) };
      };
      const melintang = kartu.dobel && !sudut;
      const { sepanjang, pusat, kotak } = coba(melintang);

      // Segmen tengah belum cukup panjang: kartu diterima. Balak hanya bila kartu sesudahnya juga masih wajib
      // (kalau tidak, balak itu menjadi kartu sudut).
      const jarakSumbu = Math.abs(ARAH[arah].dx !== 0 ? kursor.x : kursor.y);
      const wajib = belok === 1 && jarakSumbu + (melintang ? ukuran.lebar : 0) < JARAK_SEGMEN_MIN && !bentrok(kotak, milik);
      let terima = terakhir || wajib || (muatDenganCadangan(kotak, arah) && !bentrok(kotak, milik));
      if (terima && melintang && !terakhir && !wajib) {
        // Double hanya dipasang lurus bila sesudahnya masih muat satu kartu biasa.
        const kursorBerikut: Titik = { x: kursor.x + ARAH[arah].dx * sepanjang, y: kursor.y + ARAH[arah].dy * sepanjang };
        const pusatBerikut: Titik = {
          x: kursorBerikut.x + ARAH[arah].dx * (ukuran.panjang / 2),
          y: kursorBerikut.y + ARAH[arah].dy * (ukuran.panjang / 2),
        };
        const berikut = kotakKartu(pusatBerikut, arah, false, ukuran);
        terima = muatDenganCadangan(berikut, arah) && !bentrok(berikut, [...milik, kotak]);
      }

      if (terima) {
        milik.push(kotak);
        hasil.push({ kartu, pusat, arah, melintang });
        kursor = { x: kursor.x + ARAH[arah].dx * sepanjang, y: kursor.y + ARAH[arah].dy * sepanjang };
        setengahMelintangSebelum = (melintang ? ukuran.panjang : ukuran.lebar) / 2;
        break;
      }

      // Double di sudut: tetap balak, berdiri melintang di tengah sumbu baris, lalu rantai tersambung dari
      // ujung atas/bawahnya (sisi arah belok). Bila tidak muat, kembali ke belokan siku biasa di bawah.
      const arahBaru = urutanBelok[belok];
      if (kartu.dobel && !sudut && !terakhir && arahBaru !== undefined) {
        const pusatBerikut: Titik = {
          x: pusat.x + ARAH[arahBaru].dx * ukuran.panjang,
          y: pusat.y + ARAH[arahBaru].dy * ukuran.panjang,
        };
        const berikut = kotakKartu(pusatBerikut, arahBaru, false, ukuran);
        if (
          didalamKerangka(kotak, kerangka) &&
          !bentrok(kotak, milik) &&
          didalamKerangka(berikut, kerangka) &&
          !bentrok(berikut, [...milik, kotak])
        ) {
          milik.push(kotak);
          hasil.push({ kartu, pusat, arah, melintang: true });
          kursor = { x: pusat.x + ARAH[arahBaru].dx * (ukuran.panjang / 2), y: pusat.y + ARAH[arahBaru].dy * (ukuran.panjang / 2) };
          setengahMelintangSebelum = ukuran.lebar / 2;
          arah = arahBaru;
          belok++;
          break;
        }
      }

      // Belokan siku: kartu belokan diletakkan DI UJUNG kartu terakhir (sisi pendeknya menempel pada
      // sisi ujung kartu terakhir, rata dengan tepi yang menjauhi arah belok), lalu rantai lanjut tegak lurus.
      const baru = urutanBelok[belok];
      if (baru === undefined) throw new Error('urutan belok habis');
      const setengahMelintangBaru = ukuran.lebar / 2; // kartu sudut selalu digambar sebagai kartu biasa
      kursor = {
        x: kursor.x + ARAH[arah].dx * setengahMelintangBaru - ARAH[baru].dx * setengahMelintangSebelum,
        y: kursor.y + ARAH[arah].dy * setengahMelintangBaru - ARAH[baru].dy * setengahMelintangSebelum,
      };
      arah = baru;
      belok++;
      sudut = true;
    }
  }
  return hasil;
}

/** Kerangka maya (setengah lebar dan tinggi, satuan kartu asli) untuk sebuah area. Juga dipakai garis bantu pengembangan. */
export function kerangkaUntuk(area: Area, ukuran: UkuranKartu = UKURAN_KARTU): Kerangka {
  return {
    setengahLebar: Math.max((area.lebar / 2 - MARGIN) / SKALA_AWAL, KERANGKA_MIN_LEBAR * ukuran.panjang),
    setengahTinggi: Math.max((area.tinggi / 2 - MARGIN) / SKALA_AWAL, KERANGKA_MIN_TINGGI * ukuran.panjang),
  };
}

/** Tata letak dalam kerangka maya (anchor di 0,0), lalu kamera: skala seragam sampai semuanya muat di area. */
function susun(rangkaian: readonly Letak[], anchor: number, area: Area, ukuran: UkuranKartu): { skala: number; posisi: PosisiKartu[] } {
  const kartuAnchor = rangkaian[anchor];
  if (kartuAnchor === undefined) throw new RangeError(`Anchor ${anchor} di luar rangkaian`);
  const dobelAnchor = kartuAnchor.kartu.a === kartuAnchor.kartu.b;
  const asal: Titik = { x: 0, y: 0 };
  const kotakAnchor = kotakKartu(asal, 'timur', dobelAnchor, ukuran);
  // Kerangka mengikuti area, tetapi tidak lebih kecil dari beberapa panjang kartu; area yang lebih
  // kecil ditangani kamera (kartu mengecil), bukan dengan membentuk rantai yang berbeda.
  const kerangka = kerangkaUntuk(area, ukuran);
  const separuhSepanjang = (dobelAnchor ? ukuran.lebar : ukuran.panjang) / 2;
  const separuhMelintang = (dobelAnchor ? ukuran.panjang : ukuran.lebar) / 2;

  const sisiKanan: KartuTarget[] = rangkaian
    .slice(anchor + 1)
    .map((l) => ({ kartu: l.kartu, dobel: l.kartu.a === l.kartu.b, awal: l.kiri, akhir: l.kanan }));
  const sisiKiri: KartuTarget[] = rangkaian
    .slice(0, anchor)
    .reverse()
    .map((l) => ({ kartu: l.kartu, dobel: l.kartu.a === l.kartu.b, awal: l.kanan, akhir: l.kiri }));

  const kanan = tataSatuSisi(
    sisiKanan,
    'timur',
    URUTAN_BELOK_KANAN,
    separuhMelintang,
    { x: separuhSepanjang, y: 0 },
    kotakAnchor,
    kerangka,
    ukuran,
  );
  const kiri = tataSatuSisi(
    sisiKiri,
    'barat',
    URUTAN_BELOK_KIRI,
    separuhMelintang,
    { x: -separuhSepanjang, y: 0 },
    kotakAnchor,
    kerangka,
    ukuran,
  );

  const keposisi = (p: KartuTertata, sisi: SisiRantai): PosisiKartu => ({
    id: p.kartu.kartu.id,
    pusat: p.pusat,
    arah: p.arah,
    putar: ARAH[p.arah].putar + (p.melintang ? 90 : 0),
    awal: p.kartu.awal,
    akhir: p.kartu.akhir,
    dobel: p.kartu.dobel,
    melintang: p.melintang,
    sisi,
  });
  const tengah: PosisiKartu = {
    id: kartuAnchor.kartu.id,
    pusat: asal,
    arah: 'pusat',
    putar: dobelAnchor ? 90 : 0,
    awal: kartuAnchor.kiri,
    akhir: kartuAnchor.kanan,
    dobel: dobelAnchor,
    melintang: dobelAnchor,
    sisi: 'anchor',
  };
  // `kiri` ditata menjauhi anchor, jadi dibalik supaya urut dari kiri ke kanan.
  const posisi = [...kiri.map((p) => keposisi(p, 'kiri')).reverse(), tengah, ...kanan.map((p) => keposisi(p, 'kanan'))];

  // Kamera: skala seragam di sekitar anchor. Hanya mengecil bila ada kartu di luar area (segmen terakhir panjang).
  let skala = SKALA_AWAL;
  for (const p of posisi) {
    const k = kotakKartu(p.pusat, p.arah === 'pusat' ? 'timur' : p.arah, p.melintang, ukuran);
    const jx = Math.max(Math.abs(k.x1), Math.abs(k.x2));
    const jy = Math.max(Math.abs(k.y1), Math.abs(k.y2));
    if (jx > 0) skala = Math.min(skala, (area.lebar / 2 - MARGIN) / jx);
    if (jy > 0) skala = Math.min(skala, (area.tinggi / 2 - MARGIN) / jy);
  }
  return { skala, posisi };
}

/**
 * Menata rantai dari meja.rangkaian (kiri ke kanan).
 * `x`, `y` = titik tengah kartu dalam satuan area; `ukuran` sudah dikalikan skala.
 *
 * Hasilnya stabil: menambah kartu di salah satu ujung tidak mengubah bentuk kartu yang sudah ada
 * (posisi relatif terhadap anchor tetap); yang bisa berubah hanya skala seragamnya, dan itu hanya
 * saat rantai melewati kerangka meja.
 */
export function tataRantai(
  rangkaian: readonly Letak[],
  { area = AREA_LUAS, indeksAnchor: anchor = 0, ukuran = UKURAN_KARTU }: OpsiTata = {},
): HasilTata {
  if (!(area.lebar > 0) || !(area.tinggi > 0)) throw new RangeError('Area meja harus punya lebar dan tinggi positif');
  if (rangkaian.length === 0) return { area: { ...area }, skala: 1, ukuran: { ...ukuran }, kartu: [] };
  if (!Number.isInteger(anchor) || anchor < 0 || anchor >= rangkaian.length) {
    throw new RangeError(`indeksAnchor di luar rangkaian: ${anchor} (panjang ${rangkaian.length})`);
  }

  const { skala, posisi } = susun(rangkaian, anchor, area, ukuran);
  return {
    area: { ...area },
    skala,
    ukuran: { panjang: ukuran.panjang * skala, lebar: ukuran.lebar * skala },
    kartu: posisi.map((p, i) => ({
      id: p.id,
      x: area.lebar / 2 + p.pusat.x * skala,
      y: area.tinggi / 2 + p.pusat.y * skala,
      rotasi: p.putar % 360,
      awal: p.awal,
      akhir: p.akhir,
      double: p.dobel,
      arah: p.arah,
      sisi: p.sisi,
      ujung: i === 0 || i === rangkaian.length - 1,
    })),
  };
}
