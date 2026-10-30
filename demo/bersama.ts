// demo/bersama.ts: pembantu kecil untuk skrip demo.

import { NAMA_PEMAIN } from '../src/engine.ts';

/** Nama pemain dari nomor; '?' bila nomornya tidak dikenal. */
export function namaPemain(nomor: number): string {
  return NAMA_PEMAIN[nomor] ?? '?';
}

/** Mengembalikan nilai bila ada; melempar Error bila kosong. */
export function wajib<T>(nilai: T | undefined | null, pesan: string): T {
  if (nilai === undefined || nilai === null) throw new Error(pesan);
  return nilai;
}
