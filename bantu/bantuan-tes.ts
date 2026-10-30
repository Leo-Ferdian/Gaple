// bantu/bantuan-tes.ts: pembantu kecil untuk tes bertipe (tanpa `any`/`as`).

import assert from 'node:assert/strict';
import { adalahNomorPemain } from '../src/engine.ts';
import type { EmpatTangan, Kartu, NomorPemain } from '../src/engine.ts';

/** Tangan yang bisa diubah di dalam tes (mis. `push`), lalu diubah menjadi EmpatTangan. */
export type TanganUbah = [Kartu[], Kartu[], Kartu[], Kartu[]];

/** Membuat empat tangan dari daftar kartu tiap pemain. Tangan yang tidak diisi kosong. */
export function empat(...tangan: Kartu[][]): TanganUbah {
  return [tangan[0] ?? [], tangan[1] ?? [], tangan[2] ?? [], tangan[3] ?? []];
}

/** Menegaskan bahwa nilai ini nomor pemain sah, dan mengembalikannya dengan tipe yang tepat. */
export function nomor(n: number): NomorPemain {
  assert.ok(adalahNomorPemain(n), `bukan nomor pemain: ${n}`);
  return n;
}

/** Menegaskan bahwa nilai ini bukan undefined (menggantikan tanda `!`). */
export function ada<T>(nilai: T | undefined | null, pesan = 'nilai tidak boleh kosong'): T {
  assert.ok(nilai !== undefined && nilai !== null, pesan);
  return nilai;
}

export type { EmpatTangan };
