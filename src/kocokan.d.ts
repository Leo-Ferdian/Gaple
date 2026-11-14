// SEMENTARA: tipe untuk kocokan.js selama belum dimigrasi (dihapus di potongan 13
// bersama kocokan.js). Berisi hanya tanda tangan fungsi, tanpa kode yang berjalan.

import type { EmpatTangan, Kartu, NomorPemain } from './engine.ts';
import type { PilihanKartu, Sisi } from './meja.ts';
import type { KeputusanPembuka, RencanaPembukaan, Syarat } from './pembuka.ts';
import type { StateKocokan } from './tipe-kocokan.ts';

export { NAMA_PEMAIN, giliranBerikutnya, timPemain } from './engine.ts';

export function mulaiKocokan(tangan: EmpatTangan, pembuka: NomorPemain, syarat?: Syarat): StateKocokan;
export function mulaiDariRencana(
  tangan: EmpatTangan,
  rencana: RencanaPembukaan,
): { status: 'siap'; state: StateKocokan; pembuka: NomorPemain; alasan: string } | Extract<KeputusanPembuka, { status: 'ulang' }>;
export function kartuLegalPemain(state: StateKocokan, pemain: NomorPemain): PilihanKartu[];
export function mainkan(state: StateKocokan, pemain: NomorPemain, kartu: Kartu, sisi: Sisi): StateKocokan;
export function lewat(state: StateKocokan, pemain: NomorPemain): StateKocokan;
