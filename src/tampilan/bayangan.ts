// bayangan.ts: pratinjau tempat jatuh kartu yang dipilih, di tiap ujung rantai yang boleh dipakai.
//
// Murni. Posisi bayangan dihitung dengan menata rantai seandainya kartu itu sudah dipasang. Karena tata
// letak terkunci (kartu yang sudah ada tidak berpindah), posisi kartu baru dalam satuan kartu asli sama
// persis dengan posisi aslinya nanti; di sini hanya diubah ke skala gambar sekarang.

import type { Kartu, Angka } from '../engine.ts';
import { letakkan } from '../meja.ts';
import type { Sisi } from '../meja.ts';
import type { StateKocokan } from '../tipe-kocokan.ts';
import { tataRantai, indeksAnchor } from './tata-rantai.ts';
import type { Area, HasilTata } from './tata-rantai.ts';

export interface Bayangan {
  readonly sisi: 'kiri' | 'kanan';
  /** Titik tengah dalam satuan area pada skala gambar sekarang. */
  readonly x: number;
  readonly y: number;
  readonly rotasi: number;
  readonly awal: Angka;
  readonly akhir: Angka;
}

/** Bayangan kartu `kartu` di tiap sisi dari `sisi` yang berupa ujung rantai (kiri atau kanan). */
export function hitungBayangan(kocokan: StateKocokan, kartu: Kartu, sisi: readonly Sisi[], area: Area, sekarang: HasilTata): Bayangan[] {
  const { rangkaian } = kocokan.meja;
  const idxAnchor = indeksAnchor(kocokan);
  const idAnchor = rangkaian[idxAnchor]?.kartu.id;
  if (idAnchor === undefined) return [];
  const hasil: Bayangan[] = [];
  for (const s of sisi) {
    if (s !== 'kiri' && s !== 'kanan') continue;
    const baru = letakkan(kocokan.meja, kartu, s);
    const idx = baru.rangkaian.findIndex((l) => l.kartu.id === idAnchor);
    const tata = tataRantai(baru.rangkaian, { area, indeksAnchor: idx });
    const k = tata.kartu.find((t) => t.id === kartu.id);
    if (k === undefined) continue;
    hasil.push({
      sisi: s,
      x: area.lebar / 2 + ((k.x - area.lebar / 2) / tata.skala) * sekarang.skala,
      y: area.tinggi / 2 + ((k.y - area.tinggi / 2) / tata.skala) * sekarang.skala,
      rotasi: k.rotasi,
      awal: k.awal,
      akhir: k.akhir,
    });
  }
  return hasil;
}
