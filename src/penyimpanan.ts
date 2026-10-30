// penyimpanan.ts: menyimpan pengaturan pemain di browser (localStorage).
//
// `storage` dioper sebagai argumen (bukan memakai localStorage langsung) supaya
// bisa diuji di Node dengan penyimpanan palsu. Browser kadang melarang atau
// mengosongkan penyimpanan (mode pribadi, data situs diblokir), jadi semua
// akses dibungkus try/catch dan game tetap jalan dengan pengaturan bawaan.

import { rapikanPengaturan, PENGATURAN_BAWAAN } from './controller.ts';
import type { Pengaturan } from './controller.ts';

/** Bagian dari `localStorage` yang dipakai di sini; mudah dipalsukan di tes. */
export interface Penyimpanan {
  getItem(kunci: string): string | null;
  setItem(kunci: string, nilai: string): void;
}

export const KUNCI_PENGATURAN = 'gaple:pengaturan:v1';

/** Pengaturan tersimpan, atau bawaan bila kosong, rusak, atau tidak bisa dibaca. */
export function muatPengaturan(storage: Penyimpanan | null): Pengaturan {
  // null = localStorage tidak tersedia sama sekali (mode pribadi, diblokir).
  if (storage === null) return { ...PENGATURAN_BAWAAN };
  try {
    const teks = storage.getItem(KUNCI_PENGATURAN);
    return rapikanPengaturan(teks === null ? null : JSON.parse(teks));
  } catch {
    return { ...PENGATURAN_BAWAAN };
  }
}

/** true bila tersimpan, false bila penyimpanan menolak. */
export function simpanPengaturan(storage: Penyimpanan | null, pengaturan: unknown): boolean {
  if (storage === null) return false;
  try {
    storage.setItem(KUNCI_PENGATURAN, JSON.stringify(rapikanPengaturan(pengaturan)));
    return true;
  } catch {
    return false;
  }
}
