// simpanan.ts: menyimpan pertandingan yang sedang berjalan di browser supaya bisa dilanjutkan.
//
// Yang disimpan: state pertandingan apa adanya (data biasa, aman untuk JSON), tingkat AI dan mode yang
// dipakai pertandingan itu, dan sebuah `id` (dipakai statistik agar satu kejadian tidak dihitung dua kali).
// Pengacak tidak disimpan; kocokan sesudah dilanjutkan memakai benih baru, itu tidak mengubah aturan.
//
// Data dari penyimpanan tidak dipercaya begitu saja: bentuknya diperiksa di `adalahPertandingan`
// (struktur, kartu 28 yang unik, ujung meja cocok dengan rangkaian). Yang tidak lolos dibuang dan
// permainan mulai dari menu. Naikkan `VERSI_SIMPANAN` bila bentuk state pertandingan berubah.

import type { Angka, Kartu } from './engine.ts';
import { adalahAi, adalahMode } from './controller.ts';
import type { ModeMain, TingkatAi } from './controller.ts';
import type { Pertandingan } from './pertandingan.ts';
import { TARGET_POIN, adalahFormat } from './pertandingan.ts';
import type { Penyimpanan } from './penyimpanan.ts';

export const KUNCI_SIMPANAN = 'gaple:simpanan:v1';
export const VERSI_SIMPANAN = 1;

export interface Simpanan {
  readonly versi: typeof VERSI_SIMPANAN;
  readonly id: string;
  readonly ai: TingkatAi;
  readonly mode: ModeMain;
  readonly pertandingan: Pertandingan;
}

type Objek = Record<string, unknown>;

const adalahObjek = (x: unknown): x is Objek => typeof x === 'object' && x !== null && !Array.isArray(x);
const adalahAngka = (x: unknown): x is Angka => typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= 6;
const adalahBilangan = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0;
const adalahPemain = (x: unknown): boolean => x === 0 || x === 1 || x === 2 || x === 3;
const adalahPasangan = (x: unknown): boolean => Array.isArray(x) && x.length === 2 && x.every(adalahBilangan);

function adalahKartu(x: unknown): x is Kartu {
  return adalahObjek(x) && adalahAngka(x.a) && adalahAngka(x.b) && x.a <= x.b && x.id === `${x.a}-${x.b}`;
}

function adalahLetak(x: unknown): boolean {
  return adalahObjek(x) && adalahKartu(x.kartu) && adalahAngka(x.kiri) && adalahAngka(x.kanan);
}

function mejaSah(meja: unknown): boolean {
  if (!adalahObjek(meja) || !Array.isArray(meja.rangkaian) || !meja.rangkaian.every(adalahLetak)) return false;
  const urut: Objek[] = meja.rangkaian.filter(adalahObjek);
  const pertama = urut[0];
  const terakhir = urut.at(-1);
  if (pertama === undefined || terakhir === undefined) return meja.ujungKiri === null && meja.ujungKanan === null;
  if (meja.ujungKiri !== pertama.kiri || meja.ujungKanan !== terakhir.kanan) return false;
  return urut.every((l, i) => i === 0 || urut[i - 1]?.kanan === l.kiri);
}

function kocokanSah(k: unknown): boolean {
  if (!adalahObjek(k) || !Array.isArray(k.tangan) || k.tangan.length !== 4) return false;
  if (!k.tangan.every((t) => Array.isArray(t) && t.every(adalahKartu))) return false;
  if (!mejaSah(k.meja) || !adalahPemain(k.giliran)) return false;
  if (!adalahObjek(k.syaratPembuka) || typeof k.syaratPembuka.jenis !== 'string') return false;
  if (
    !Array.isArray(k.riwayat) ||
    !k.riwayat.every((e) => adalahObjek(e) && adalahPemain(e.pemain) && (e.aksi === 'main' || e.aksi === 'lewat'))
  )
    return false;
  // Seluruh 28 kartu harus ada tepat sekali, di tangan atau di meja.
  const id: unknown[] = [];
  for (const t of k.tangan) if (Array.isArray(t)) for (const kartu of t) id.push(adalahObjek(kartu) ? kartu.id : null);
  if (adalahObjek(k.meja) && Array.isArray(k.meja.rangkaian)) {
    for (const l of k.meja.rangkaian) if (adalahObjek(l) && adalahObjek(l.kartu)) id.push(l.kartu.id);
  }
  return id.length === 28 && new Set(id).size === 28;
}

function hasilSah(h: unknown): boolean {
  if (!adalahObjek(h) || (h.akhir !== 'habis' && h.akhir !== 'tabrak')) return false;
  if (!adalahPasangan(h.tambahan) || !adalahPasangan(h.titikSisa) || typeof h.seri !== 'boolean') return false;
  if (!adalahObjek(h.rencanaBerikutnya) || typeof h.rencanaBerikutnya.jenis !== 'string') return false;
  if (h.bonus !== null && !(adalahObjek(h.bonus) && typeof h.bonus.jenis === 'string' && adalahBilangan(h.bonus.nilai))) return false;
  return h.akhir === 'tabrak' || adalahPemain(h.penutup);
}

function partaiSah(p: unknown): boolean {
  if (!adalahObjek(p) || !adalahPasangan(p.poin) || !adalahPasangan(p.markah) || !adalahBilangan(p.nomorKocokan)) return false;
  if (!adalahObjek(p.rencana) || typeof p.rencana.jenis !== 'string') return false;
  if (!Array.isArray(p.riwayatHasil) || !p.riwayatHasil.every(hasilSah) || !adalahBilangan(p.jumlahKocokUlang)) return false;
  if (p.hasilTerakhir !== null && !hasilSah(p.hasilTerakhir)) return false;
  switch (p.status) {
    case 'berjalan':
      return kocokanSah(p.kocokan) && adalahObjek(p.infoPembuka) && p.pemenang === null;
    case 'ringkasan':
      return (
        kocokanSah(p.kocokan) && adalahObjek(p.infoPembuka) && p.hasilTerakhir !== null && (p.pemenang === null || adalahObjek(p.pemenang))
      );
    case 'selesai':
      return p.kocokan === null && p.hasilTerakhir !== null && adalahObjek(p.pemenang);
    default:
      return false;
  }
}

function catatanSah(c: unknown): boolean {
  return (
    adalahObjek(c) &&
    adalahBilangan(c.nomor) &&
    (c.menang === 0 || c.menang === 1) &&
    adalahPasangan(c.markahAkhir) &&
    adalahPasangan(c.poinAwal)
  );
}

/** Apakah data ini pertandingan yang sedang berjalan dan bentuknya utuh? */
export function adalahPertandingan(x: unknown): x is Pertandingan {
  if (!adalahObjek(x) || typeof x.format !== 'string' || !adalahFormat(x.format)) return false;
  if (x.target !== TARGET_POIN[x.format] || !adalahPasangan(x.poin) || x.juara !== null) return false;
  if (!Array.isArray(x.riwayatPartai) || !x.riwayatPartai.every(catatanSah)) return false;
  return partaiSah(x.partai);
}

/** Simpanan yang bisa dipakai, atau null bila kosong, rusak, versi lama, atau tidak bisa dibaca. */
export function muatSimpanan(storage: Penyimpanan | null): Simpanan | null {
  if (storage === null) return null;
  try {
    const teks = storage.getItem(KUNCI_SIMPANAN);
    if (teks === null) return null;
    const data: unknown = JSON.parse(teks);
    if (!adalahObjek(data) || data.versi !== VERSI_SIMPANAN || typeof data.id !== 'string') return null;
    if (!adalahAi(data.ai) || !adalahMode(data.mode) || !adalahPertandingan(data.pertandingan)) return null;
    return { versi: VERSI_SIMPANAN, id: data.id, ai: data.ai, mode: data.mode, pertandingan: data.pertandingan };
  } catch {
    return null;
  }
}

/** true bila tersimpan, false bila penyimpanan menolak. */
export function simpanPertandingan(storage: Penyimpanan | null, simpanan: Omit<Simpanan, 'versi'>): boolean {
  if (storage === null) return false;
  try {
    storage.setItem(KUNCI_SIMPANAN, JSON.stringify({ versi: VERSI_SIMPANAN, ...simpanan }));
    return true;
  } catch {
    return false;
  }
}

export function hapusSimpanan(storage: Penyimpanan | null): void {
  if (storage === null) return;
  try {
    storage.removeItem(KUNCI_SIMPANAN);
  } catch {
    // penyimpanan menolak: tidak ada yang bisa dilakukan, simpanan lama akan ditimpa nanti
  }
}

/** Keterangan satu baris untuk tombol Lanjutkan di menu. */
export function ringkasSimpanan(s: Simpanan): string {
  const { pertandingan: t } = s;
  const partai = t.partai;
  const markah = partai === null ? '' : ` · markah ${partai.markah[0]}-${partai.markah[1]}`;
  const nama = s.ai === 'mudah' ? 'Mudah' : s.ai === 'sedang' ? 'Sedang' : 'Sulit';
  return `Partai ${t.riwayatPartai.length + 1} · poin ${t.poin[0]}-${t.poin[1]}${markah} · Lawan ${nama}`;
}
