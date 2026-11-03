// controller.ts: jembatan antara mesin aturan dan tampilan.
//
// Semua fungsi murni: masukan state partai, keluaran state partai baru. Tidak
// ada setTimeout atau akses halaman di sini; itu urusan main.ts. Dengan begitu
// seluruh alur "manusia mengetuk, komputer menjawab" bisa diuji di Node.
//
// Pemain manusia selalu Selatan (nomor 0). Tiga pemain lain dikendalikan
// komputer. Tingkat AI dipilih di pengaturan: Mudah bermain acak, Sedang
// memakai penilaian langkah (ai-sedang.ts), Sulit menebak kartu lawan dan menyimulasikan
// langkah (ai-sulit.ts). Mode Latihan menambah tombol Saran (langkah terbaik menurut AI Sulit).

import { SISI_KANAN } from './meja.ts';
import type { Sisi } from './meja.ts';
import type { Kartu, NomorPemain } from './engine.ts';
import type { FungsiAcak } from './rng.ts';
import { kartuLegalPemain } from './kocokan.ts';
import type { Partai, PartaiBerjalan, PartaiRingkasan } from './partai.ts';
import { mainkanPartai, lewatPartai, bagiKocokan, lanjutkanPartai, STATUS_BERJALAN, STATUS_RINGKASAN, STATUS_SELESAI } from './partai.ts';
import { FORMAT_BO3, FORMAT_BO5, adalahFormat, mulaiPertandingan, mulaiPartaiBerikutnya, ubahPartai, catatPartai } from './pertandingan.ts';
import type { FormatPertandingan, Pertandingan } from './pertandingan.ts';
import { pilihLangkahAcak } from './simulasi.ts';
import type { Kebijakan } from './simulasi.ts';
import { pilihLangkahSedang } from './ai-sedang.ts';
import { nilaiLangkahSulit, pilihLangkahSulit } from './ai-sulit.ts';

export const PEMAIN_MANUSIA: NomorPemain = 0;

/** Kartu yang boleh dimainkan manusia dan sisi yang tersedia. */
export interface PilihanManusia {
  readonly kartu: Kartu;
  readonly sisi: Sisi[];
}

/** Apakah sekarang giliran manusia dan ia punya kartu untuk dimainkan? */
export function menungguManusia(partai: Partai): boolean {
  if (partai.status !== STATUS_BERJALAN) return false;
  const { kocokan } = partai;
  return kocokan.giliran === PEMAIN_MANUSIA && kartuLegalPemain(kocokan, PEMAIN_MANUSIA).length > 0;
}

/**
 * Apakah ada langkah yang jalan sendiri (giliran komputer, atau manusia yang
 * harus lewat karena tidak punya kartu cocok)?
 */
export function adaLangkahOtomatis(partai: Partai): boolean {
  return partai.status === STATUS_BERJALAN && !menungguManusia(partai);
}

/**
 * Lama komputer "berpikir" sebelum melangkah, dalam milidetik. `dasar` dikalikan jumlah pilihan:
 * lewat atau satu-satunya kartu terasa cepat, banyak pilihan terasa lebih lama. Sedikit variasi
 * ditentukan dari panjang riwayat (bukan acak), jadi tidak memakai pengacak permainan.
 */
export function jedaBerpikir(partai: Partai, dasar: number): number {
  if (dasar <= 0 || partai.kocokan === null) return Math.max(0, dasar);
  const { kocokan } = partai;
  const n = kartuLegalPemain(kocokan, kocokan.giliran).length;
  const faktor = n === 0 ? 0.55 : n === 1 ? 0.7 : Math.min(1.5, 0.85 + 0.12 * n);
  const getar = 0.9 + ((kocokan.riwayat.length * 7) % 5) * 0.05;
  return Math.round(dasar * faktor * getar);
}

/** Pemilih langkah untuk tiap tingkat AI. */
const KEBIJAKAN_AI: Readonly<Record<TingkatAi, Kebijakan>> = {
  mudah: pilihLangkahAcak,
  sedang: pilihLangkahSedang,
  sulit: (state, acak) => pilihLangkahSulit(state, acak),
};

/**
 * Menjalankan SATU langkah otomatis. Komputer bermain sesuai tingkat AI (bawaan Mudah = acak);
 * manusia tanpa kartu cocok otomatis lewat. Melempar Error bila tidak ada langkah otomatis.
 */
export function langkahOtomatis(partai: Partai, acak: FungsiAcak, ai: TingkatAi = 'mudah'): PartaiBerjalan | PartaiRingkasan {
  if (partai.status !== STATUS_BERJALAN || menungguManusia(partai)) {
    throw new Error('Tidak ada langkah otomatis: menunggu pemain manusia');
  }
  const langkah = KEBIJAKAN_AI[ai](partai.kocokan, acak);
  return langkah.aksi === 'lewat'
    ? lewatPartai(partai, langkah.pemain)
    : mainkanPartai(partai, langkah.pemain, langkah.kartu, langkah.sisi);
}

/**
 * Pilihan manusia untuk satu kartu: kartunya dan sisi yang boleh dipakai.
 * Bila kedua ujung meja sama angkanya, kiri dan kanan setara, jadi dipilihkan
 * 'kanan' saja supaya pemain tidak perlu bertanya-tanya.

 * Hasilnya null bila kartu itu tidak bisa dimainkan sekarang (bukan giliran
 * Anda, bukan kartu Anda, atau tidak legal).
 */
export function pilihanKartu(partai: Partai, idKartu: string): PilihanManusia | null {
  if (partai.status !== STATUS_BERJALAN || !menungguManusia(partai)) return null;
  const { kocokan } = partai;
  const pilihan = kartuLegalPemain(kocokan, PEMAIN_MANUSIA).find((p) => p.kartu.id === idKartu);
  if (!pilihan) return null;
  const setara = pilihan.sisi.length === 2 && kocokan.meja.ujungKiri === kocokan.meja.ujungKanan;
  return { kartu: pilihan.kartu, sisi: setara ? [SISI_KANAN] : [...pilihan.sisi] };
}

/** Manusia memainkan kartunya. Melempar Error bila ilegal (aturan dijaga mesin). */
export function mainkanManusia(partai: Partai, idKartu: string, sisi: Sisi): PartaiBerjalan | PartaiRingkasan {
  const kartu = partai.kocokan?.tangan[PEMAIN_MANUSIA].find((k) => k.id === idKartu);
  if (!kartu) throw new Error(`Kartu ${idKartu} tidak ada di tangan Anda`);
  return mainkanPartai(partai, PEMAIN_MANUSIA, kartu, sisi);
}

/** Saran langkah untuk manusia: kartu dan sisi yang dinilai terbaik oleh AI Sulit. */
export interface Saran {
  readonly kartu: Kartu;
  readonly sisi: Sisi;
}

/**
 * Saran untuk giliran manusia (mode Latihan). Memakai AI Sulit, jadi hanya "melihat" tangan Anda
 * sendiri dan fakta di meja. Null bila sekarang bukan giliran Anda memilih kartu.
 */
export function saranManusia(partai: Partai, acak: FungsiAcak): Saran | null {
  if (!menungguManusia(partai) || partai.status !== STATUS_BERJALAN) return null;
  const terbaik = nilaiLangkahSulit(partai.kocokan, acak)[0];
  if (terbaik === undefined) return null;
  // Bila kedua ujung sama, tampilan hanya menawarkan satu sisi; saran mengikutinya.
  const opsi = pilihanKartu(partai, terbaik.kartu.id);
  if (opsi === null) return null;
  const sisi = opsi.sisi.find((s) => s === terbaik.sisi) ?? opsi.sisi[0];
  return sisi === undefined ? null : { kartu: terbaik.kartu, sisi };
}

// ---------------------------------------------------------------------------
// Alur aplikasi: menu -> pertandingan (partai demi partai) -> hasil akhir
// ---------------------------------------------------------------------------
//
// State aplikasi: { pengaturan, pertandingan }
//   pengaturan:  { format: 'bo3' | 'bo5', ai: 'mudah' | 'sedang' | 'sulit', bantuan: boolean, mode: 'pertandingan' | 'latihan' }
//   pertandingan: null (sedang di menu) atau state pertandingan (lihat pertandingan.ts)
//
// Layar yang tampil diturunkan dari state itu, bukan disimpan terpisah, supaya
// keduanya tidak bisa berselisih.

export const FORMAT_TERSEDIA = [FORMAT_BO3, FORMAT_BO5] as const;
/** Tingkat AI yang tersedia. */
export const AI_TERSEDIA = ['mudah', 'sedang', 'sulit'] as const;
/** Mode: pertandingan biasa, atau latihan (pertandingan yang sama dengan Bantuan hitung dan tombol Saran). */
/** Tema tampilan (warna meja dan bingkai); dipasang sebagai data-tema pada halaman. */
export const TEMA_TERSEDIA = ['hijau', 'biru', 'anggur', 'kontras'] as const;
export type Tema = (typeof TEMA_TERSEDIA)[number];

/** Tingkat animasi: penuh, kurang (tanpa hiasan), atau mati. */
export const ANIMASI_TERSEDIA = ['penuh', 'kurang', 'mati'] as const;
export type TingkatAnimasi = (typeof ANIMASI_TERSEDIA)[number];

export const MODE_TERSEDIA = ['pertandingan', 'latihan'] as const;
export type ModeMain = (typeof MODE_TERSEDIA)[number];
export type TingkatAi = (typeof AI_TERSEDIA)[number];

export interface Pengaturan {
  readonly format: FormatPertandingan;
  readonly ai: TingkatAi;
  /** Bantuan hitung: panel kartu tersisa dan peluang di meja (tahap 5). */
  readonly bantuan: boolean;
  readonly mode: ModeMain;
  /** Efek suara (disintesis di peramban). */
  readonly suara: boolean;
  /** Sudah pernah menekan Main (menu pemain baru membuka Cara bermain). */
  readonly pernahMain: boolean;
  readonly tema: Tema;
  readonly animasi: TingkatAnimasi;
}

/** State seluruh aplikasi: pengaturan, dan pertandingan (null bila di menu). */
export interface Aplikasi {
  readonly pengaturan: Pengaturan;
  readonly pertandingan: Pertandingan | null;
}

export type Layar = 'menu' | 'meja' | 'partai-selesai' | 'akhir';

export const PENGATURAN_BAWAAN: Pengaturan = Object.freeze({
  format: FORMAT_BO3,
  ai: 'mudah',
  bantuan: false,
  mode: 'pertandingan',
  suara: true,
  pernahMain: false,
  tema: 'hijau',
  animasi: 'penuh',
});

/** Apakah nilai ini tingkat animasi yang tersedia? */
export function adalahAnimasi(nilai: unknown): nilai is TingkatAnimasi {
  return ANIMASI_TERSEDIA.some((a) => a === nilai);
}

/** Apakah nilai ini tema yang tersedia? */
export function adalahTema(nilai: unknown): nilai is Tema {
  return TEMA_TERSEDIA.some((t) => t === nilai);
}

/** Apakah nilai ini mode main yang tersedia? */
export function adalahMode(nilai: unknown): nilai is ModeMain {
  return MODE_TERSEDIA.some((m) => m === nilai);
}

/** Apakah nilai ini tingkat AI yang tersedia? */
export function adalahAi(nilai: unknown): nilai is TingkatAi {
  return AI_TERSEDIA.some((a) => a === nilai);
}

function adalahFormatTersimpan(nilai: unknown): nilai is FormatPertandingan {
  return typeof nilai === 'string' && adalahFormat(nilai);
}

/**
 * Membersihkan pengaturan dari sumber yang tidak dipercaya (misalnya data
 * tersimpan di browser): nilai yang tidak dikenal diganti nilai bawaan, kunci
 * lain dibuang.
 */
export function rapikanPengaturan(mentah: unknown): Pengaturan {
  const sumber = mentah !== null && typeof mentah === 'object' ? mentah : {};
  const format = 'format' in sumber ? sumber.format : undefined;
  const ai = 'ai' in sumber ? sumber.ai : undefined;
  const bantuan = 'bantuan' in sumber ? sumber.bantuan : undefined;
  const mode = 'mode' in sumber ? sumber.mode : undefined;
  const suara = 'suara' in sumber ? sumber.suara : undefined;
  const pernahMain = 'pernahMain' in sumber ? sumber.pernahMain : undefined;
  const tema = 'tema' in sumber ? sumber.tema : undefined;
  const animasi = 'animasi' in sumber ? sumber.animasi : undefined;
  return {
    format: adalahFormatTersimpan(format) ? format : PENGATURAN_BAWAAN.format,
    ai: adalahAi(ai) ? ai : PENGATURAN_BAWAAN.ai,
    bantuan: typeof bantuan === 'boolean' ? bantuan : PENGATURAN_BAWAAN.bantuan,
    mode: adalahMode(mode) ? mode : PENGATURAN_BAWAAN.mode,
    suara: typeof suara === 'boolean' ? suara : PENGATURAN_BAWAAN.suara,
    pernahMain: typeof pernahMain === 'boolean' ? pernahMain : PENGATURAN_BAWAAN.pernahMain,
    tema: adalahTema(tema) ? tema : PENGATURAN_BAWAAN.tema,
    animasi: adalahAnimasi(animasi) ? animasi : PENGATURAN_BAWAAN.animasi,
  };
}

/** Awal aplikasi: di menu, belum ada pertandingan. */
export function aplikasiBaru(pengaturan: unknown = PENGATURAN_BAWAAN): Aplikasi {
  return { pengaturan: rapikanPengaturan(pengaturan), pertandingan: null };
}

function mulaiPartaiDanBagi(pertandingan: Pertandingan, acak: FungsiAcak): Pertandingan {
  return ubahPartai(mulaiPartaiBerikutnya(pertandingan), (partai) => bagiKocokan(partai, acak));
}

/** Menekan Main: pertandingan baru dengan kocokan pertama sudah dibagi. */
export function mulaiPermainan(aplikasi: Aplikasi, acak: FungsiAcak): Aplikasi {
  const pengaturan = { ...rapikanPengaturan(aplikasi.pengaturan), pernahMain: true };
  return { pengaturan, pertandingan: mulaiPartaiDanBagi(mulaiPertandingan(pengaturan.format), acak) };
}

export function kembaliKeMenu(aplikasi: Aplikasi): Aplikasi {
  return { pengaturan: aplikasi.pengaturan, pertandingan: null };
}

export function ubahPengaturan(aplikasi: Aplikasi, perubahan: Partial<Pengaturan>): Aplikasi {
  return { ...aplikasi, pengaturan: rapikanPengaturan({ ...aplikasi.pengaturan, ...perubahan }) };
}

/** 'menu' | 'meja' | 'partai-selesai' | 'akhir' */
export function layarAktif(aplikasi: Aplikasi): Layar {
  const { pertandingan } = aplikasi;
  if (pertandingan === null) return 'menu';
  if (pertandingan.juara !== null) return 'akhir';
  if (pertandingan.partai === null) throw new Error('Pertandingan berjalan tanpa partai aktif');
  if (pertandingan.partai.status === STATUS_SELESAI) return 'partai-selesai';
  return 'meja';
}

export function partaiAktif(aplikasi: Aplikasi): Partai | null {
  return aplikasi.pertandingan?.partai ?? null;
}

export function nomorPartai(aplikasi: Aplikasi): number {
  return pastikanPertandingan(aplikasi).riwayatPartai.length + 1;
}

function pastikanPertandingan(aplikasi: Aplikasi): Pertandingan {
  if (aplikasi.pertandingan === null) throw new Error('Belum ada pertandingan: aplikasi masih di menu');
  return aplikasi.pertandingan;
}

/** Menerapkan fungsi `partai -> partai` pada partai yang sedang berjalan. */
export function ubahPartaiAktif(aplikasi: Aplikasi, ubah: (partai: Partai) => Partai): Aplikasi {
  return { ...aplikasi, pertandingan: ubahPartai(pastikanPertandingan(aplikasi), ubah) };
}

/**
 * Tombol lanjut. Tergantung layar:
 *  - ringkasan kocokan: kocokan berikutnya (sudah dibagi), atau akhir partai bila markah mencapai 100;
 *  - akhir partai: partai berikutnya (sudah dibagi), atau layar hasil bila ada juara.
 */
export function lanjutkan(aplikasi: Aplikasi, acak: FungsiAcak): Aplikasi {
  const layar = layarAktif(aplikasi);
  const partai = partaiAktif(aplikasi);

  if (layar === 'meja' && partai?.status === STATUS_RINGKASAN) {
    const lanjut = lanjutkanPartai(partai);
    return ubahPartaiAktif(aplikasi, () => (lanjut.status === STATUS_SELESAI ? lanjut : bagiKocokan(lanjut, acak)));
  }
  if (layar === 'partai-selesai') {
    const dicatat = catatPartai(pastikanPertandingan(aplikasi));
    return { ...aplikasi, pertandingan: dicatat.juara !== null ? dicatat : mulaiPartaiDanBagi(dicatat, acak) };
  }
  throw new Error(`Tidak ada yang bisa dilanjutkan di layar "${layar}"`);
}
