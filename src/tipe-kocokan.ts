// tipe-kocokan.ts: bentuk data state kocokan dan riwayatnya.
//
// Hanya tipe (tidak ada kode yang berjalan). Dipisah supaya akhir.ts, markah.ts
// dan modul lain bisa memakainya tanpa saling mengimpor secara melingkar.

import type { Angka, EmpatTangan, Kartu, NomorPemain } from './engine.ts';
import type { Meja, Sisi } from './meja.ts';
import type { Syarat } from './pembuka.ts';

/** Angka di dua ujung rangkaian pada satu saat (null bila meja kosong). */
export interface UjungSebelum {
  readonly kiri: Angka | null;
  readonly kanan: Angka | null;
}

/** Pemain memainkan sebuah kartu. */
export interface KejadianMain {
  readonly pemain: NomorPemain;
  readonly aksi: 'main';
  readonly kartu: Kartu;
  readonly sisi: Sisi;
  readonly ujungSebelum: UjungSebelum;
}

/** Pemain melewati gilirannya. */
export interface KejadianLewat {
  readonly pemain: NomorPemain;
  readonly aksi: 'lewat';
  readonly ujungSebelum: UjungSebelum;
}

export type Kejadian = KejadianMain | KejadianLewat;

/** State satu kocokan. Tidak pernah diubah; setiap langkah menghasilkan state baru. */
export interface StateKocokan {
  readonly tangan: EmpatTangan;
  readonly meja: Meja;
  readonly giliran: NomorPemain;
  readonly syaratPembuka: Syarat;
  readonly riwayat: readonly Kejadian[];
}
