// SEMENTARA: tipe sebagian simulasi.js untuk tes; dihapus di potongan 14.
import type { EmpatTangan, NomorPemain } from './engine.ts';
import type { FungsiAcak } from './rng.ts';
import type { Syarat } from './pembuka.ts';
import type { StateKocokan } from './tipe-kocokan.ts';

export function mainAcakDariState(
  state: StateKocokan,
  acak: FungsiAcak,
  batasLangkah?: number,
): { state: StateKocokan; akhir: 'habis' | 'tabrak' };
export function mainAcakSampaiSelesai(
  tangan: EmpatTangan,
  pembuka: NomorPemain,
  acak: FungsiAcak,
  batasLangkah?: number,
  syarat?: Syarat,
): { state: StateKocokan; akhir: 'habis' | 'tabrak' };
