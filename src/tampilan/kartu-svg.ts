// kartu-svg.ts: menggambar kartu domino sebagai teks SVG.
//
// Fungsi di sini murni: masukan angka, keluaran string. Karena itu bisa diuji
// di Node tanpa browser. Warna dan ukuran diatur oleh style.css lewat nama kelas
// (kartu, garis, titik, punggung), bukan ditulis di sini.
//
// Tiap kartu terdiri dari dua separuh. Titik (pip) tiap separuh diletakkan di
// kisi 3x3:
//
//   0 .  .  .      1 .  .  .      2 o  .  .      ...
//     .  .  .        .  o  .        .  .  .
//     .  .  .        .  .  .        .  .  o

import { adalahAngka } from '../engine.ts';
import type { Angka } from '../engine.ts';

type Petak = 0 | 1 | 2;
/** Posisi sebuah titik di kisi 3x3: [kolom, baris]. */
type PosisiTitik = readonly [Petak, Petak];

const POLA_TITIK: Record<Angka, readonly PosisiTitik[]> = {
  0: [],
  1: [[1, 1]],
  2: [
    [0, 0],
    [2, 2],
  ],
  3: [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  4: [
    [0, 0],
    [2, 0],
    [0, 2],
    [2, 2],
  ],
  5: [
    [0, 0],
    [2, 0],
    [1, 1],
    [0, 2],
    [2, 2],
  ],
  6: [
    [0, 0],
    [2, 0],
    [0, 1],
    [2, 1],
    [0, 2],
    [2, 2],
  ],
};

export const ARAH_TEGAK = 'tegak'; // dua separuh atas-bawah (kartu di tangan)
export const ARAH_DATAR = 'datar'; // dua separuh kiri-kanan (kartu di meja)

export type ArahKartu = typeof ARAH_TEGAK | typeof ARAH_DATAR;

const SISI_SEPARUH = 60; // tiap separuh persegi 60 x 60

/** Ukuran kartu datar (satuan viewBox): dipakai tata-rantai.ts untuk menata kartu di meja. */
export const PANJANG_KARTU = 2 * SISI_SEPARUH;
export const LEBAR_KARTU = SISI_SEPARUH;
const JARAK_TITIK = 15;
const JARI_JARI = 5;

function pastikanAngkaSah(n: number): asserts n is Angka {
  if (!adalahAngka(n)) throw new RangeError(`Angka kartu harus 0 sampai 6, diterima: ${n}`);
}

function pastikanArahSah(arah: string): asserts arah is ArahKartu {
  if (arah !== ARAH_TEGAK && arah !== ARAH_DATAR)
    throw new RangeError(`Arah harus "${ARAH_TEGAK}" atau "${ARAH_DATAR}", diterima: ${arah}`);
}

/** Isi gambar sebuah kartu (tanpa pembungkus <svg>), untuk disusun di dalam gambar lain. */
export function isiKartu(awal: number, akhir: number, arah: ArahKartu = ARAH_TEGAK): string {
  pastikanAngkaSah(awal);
  pastikanAngkaSah(akhir);
  pastikanArahSah(arah);

  const datar = arah === ARAH_DATAR;
  const lebar = datar ? 2 * SISI_SEPARUH : SISI_SEPARUH;
  const tinggi = datar ? SISI_SEPARUH : 2 * SISI_SEPARUH;

  const garis = datar
    ? `<line class="garis" x1="${SISI_SEPARUH}" y1="8" x2="${SISI_SEPARUH}" y2="${tinggi - 8}"/>`
    : `<line class="garis" x1="8" y1="${SISI_SEPARUH}" x2="${lebar - 8}" y2="${SISI_SEPARUH}"/>`;

  const titik = [awal, akhir]
    .flatMap((angka, separuh) =>
      POLA_TITIK[angka].map(([kolom, baris]) => {
        const cx = (datar ? separuh * SISI_SEPARUH : 0) + JARAK_TITIK + kolom * JARAK_TITIK;
        const cy = (datar ? 0 : separuh * SISI_SEPARUH) + JARAK_TITIK + baris * JARAK_TITIK;
        return `<circle class="titik" cx="${cx}" cy="${cy}" r="${JARI_JARI}"/>`;
      }),
    )
    .join('');

  return `<rect class="badan" x="1" y="1" width="${lebar - 2}" height="${tinggi - 2}" rx="8"/>` + garis + titik;
}

/**
 * Kartu bergambar. Separuh pertama memuat angka `awal`, separuh kedua `akhir`
 * (tegak: atas lalu bawah; datar: kiri lalu kanan).
 */
export function svgKartu(awal: number, akhir: number, arah: ArahKartu = ARAH_TEGAK): string {
  const isi = isiKartu(awal, akhir, arah); // sekaligus memeriksa masukan
  const datar = arah === ARAH_DATAR;
  const lebar = datar ? 2 * SISI_SEPARUH : SISI_SEPARUH;
  const tinggi = datar ? SISI_SEPARUH : 2 * SISI_SEPARUH;
  return `<svg class="kartu kartu-${arah}" viewBox="0 0 ${lebar} ${tinggi}" role="img" aria-label="Kartu ${awal}-${akhir}">${isi}</svg>`;
}

/** Punggung kartu (kartu lawan yang tertutup). */
export function svgPunggung(arah: ArahKartu = ARAH_TEGAK): string {
  pastikanArahSah(arah);
  const datar = arah === ARAH_DATAR;
  const lebar = datar ? 2 * SISI_SEPARUH : SISI_SEPARUH;
  const tinggi = datar ? SISI_SEPARUH : 2 * SISI_SEPARUH;
  return (
    `<svg class="kartu punggung kartu-${arah}" viewBox="0 0 ${lebar} ${tinggi}" aria-hidden="true">` +
    `<rect class="badan" x="1" y="1" width="${lebar - 2}" height="${tinggi - 2}" rx="8"/>` +
    `<rect class="hiasan" x="10" y="10" width="${lebar - 20}" height="${tinggi - 20}" rx="4"/>` +
    `</svg>`
  );
}
