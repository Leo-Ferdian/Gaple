// bantu/gerbang.ts: gerbang penutup tahap 1.
//
// Memainkan pertandingan acak (bo3 dan bo5 bergantian) sampai jumlah kocokan
// yang diminta tercapai. Setiap kocokan yang selesai diperiksa ulang oleh
// pemeriksa mandiri (pemeriksa.ts). Satu pelanggaran saja menghentikan gerbang
// dengan pesan yang menyebut benih pertandingannya, sehingga mudah diulang.
//
// Selain pelanggaran, dikumpulkan statistik untuk docs/HASIL-SIMULASI.md.

import { buatAcak } from '../src/rng.ts';
import { mulaiPertandingan, mulaiPartaiBerikutnya, ubahPartai, catatPartai } from '../src/pertandingan.ts';
import { langkahPartaiDengan, pilihLangkahAcak } from '../src/simulasi.ts';
import type { Kebijakan } from '../src/simulasi.ts';
import { periksaKocokan } from './pemeriksa.ts';
import type { RingkasanPeriksa } from './pemeriksa.ts';
import type { FungsiAcak } from '../src/rng.ts';
import type { FormatPertandingan } from '../src/pertandingan.ts';
import type { Partai, PartaiRingkasan, StatusPartai } from '../src/partai.ts';

export interface Statistik {
  benihAwal: number;
  benihAkhir: number;
  pertandingan: number;
  partai: number;
  kocokan: number;
  habis: number;
  tabrak: number;
  tabrakSeri: number;
  bonus: { double: number; triplet: number; quartet: number };
  rencana: { poin: number; balak: number; netral: number };
  /** pembuka bukan calon karena calon tanpa balak */
  hakPindah: number;
  kocokUlang: number;
  langkah: { total: number; min: number; max: number };
  lewat: number;
  /** hanya kocokan yang menambah markah */
  markahTambahan: { total: number; min: number; max: number; jumlah: number };
  kocokanPerPartai: { total: number; min: number; max: number };
  /** indeks = jumlah partai */
  partaiPerPertandingan: { bo3: number[]; bo5: number[] };
  juara: [number, number];
  menangPartai: [number, number];
}

export interface OpsiGerbang {
  jumlahKocokan?: number;
  benihAwal?: number;
  /** Pemilih langkah untuk keempat pemain; bawaan acak. */
  kebijakan?: Kebijakan;
}

/** Menambah 1 pada elemen daftar di indeks tertentu. */
function naikkan(daftar: number[], indeks: number): void {
  daftar[indeks] = (daftar[indeks] ?? 0) + 1;
}

function statistikKosong(benihAwal: number): Statistik {
  return {
    benihAwal,
    benihAkhir: benihAwal,
    pertandingan: 0,
    partai: 0,
    kocokan: 0,
    habis: 0,
    tabrak: 0,
    tabrakSeri: 0,
    bonus: { double: 0, triplet: 0, quartet: 0 },
    rencana: { poin: 0, balak: 0, netral: 0 },
    hakPindah: 0, // pembuka bukan calon karena calon tanpa balak
    kocokUlang: 0,
    langkah: { total: 0, min: Infinity, max: 0 },
    lewat: 0,
    markahTambahan: { total: 0, min: Infinity, max: 0, jumlah: 0 }, // hanya kocokan yang menambah markah
    kocokanPerPartai: { total: 0, min: Infinity, max: 0 },
    partaiPerPertandingan: { bo3: [0, 0, 0, 0, 0, 0], bo5: [0, 0, 0, 0, 0, 0] }, // indeks = jumlah partai
    juara: [0, 0],
    menangPartai: [0, 0],
  };
}

export function jalankanGerbang({ jumlahKocokan = 10000, benihAwal = 1, kebijakan = pilihLangkahAcak }: OpsiGerbang = {}): Statistik {
  const s = statistikKosong(benihAwal);
  let benih = benihAwal;

  while (s.kocokan < jumlahKocokan) {
    const format: FormatPertandingan = benih % 2 === 1 ? 'bo3' : 'bo5';
    try {
      mainkanSatuPertandingan(format, buatAcak(benih), s, kebijakan);
    } catch (galat) {
      const pesan = galat instanceof Error ? galat.message : String(galat);
      throw new Error(`[pertandingan ${format}, benih ${benih}] ${pesan}`, { cause: galat });
    }
    benih++;
  }
  s.benihAkhir = benih - 1;
  return s;
}

function mainkanSatuPertandingan(format: FormatPertandingan, acak: FungsiAcak, s: Statistik, kebijakan: Kebijakan): void {
  let p = mulaiPertandingan(format);

  while (p.juara === null) {
    p = mulaiPartaiBerikutnya(p);
    let partai: Partai | null = p.partai;
    if (partai === null) throw new Error('PELANGGARAN: partai baru tidak dibuat');
    let markahSebelum: [number, number] = [0, 0];

    while (partai.status !== 'selesai') {
      const statusSebelum: StatusPartai = partai.status;
      if (statusSebelum === 'siap') markahSebelum = [partai.markah[0], partai.markah[1]];
      partai = langkahPartaiDengan(partai, kebijakan, acak);

      if (statusSebelum === 'siap') catatPembagian(partai, s);
      if (statusSebelum === 'berjalan' && partai.status === 'ringkasan') {
        const ringkas = periksaKocokan({
          kocokan: partai.kocokan,
          hasil: partai.hasilTerakhir,
          rencana: partai.rencana,
          markahSebelum,
          markahSesudah: partai.markah,
        });
        catatKocokan(partai, ringkas, s);
        // Partai berakhir tepat saat ada tim yang mencapai 100.
        const ada100 = partai.markah.some((m) => m >= 100);
        if (ada100 !== (partai.pemenang !== null)) throw new Error('PELANGGARAN: status pemenang partai tidak sesuai markah');
      }
    }

    p = ubahPartai(p, () => partai);
    const poinSebelum = p.poin;
    p = catatPartai(p);
    s.partai++;
    s.menangPartai[partai.pemenang.menang]++;
    s.kocokanPerPartai.total += partai.nomorKocokan;
    s.kocokanPerPartai.min = Math.min(s.kocokanPerPartai.min, partai.nomorKocokan);
    s.kocokanPerPartai.max = Math.max(s.kocokanPerPartai.max, partai.nomorKocokan);
    const naik = p.poin[partai.pemenang.menang] - poinSebelum[partai.pemenang.menang];
    if (naik !== 1) throw new Error('PELANGGARAN: poin pemenang tidak bertambah tepat 1');
  }

  if (p.poin[p.juara] !== p.target || p.poin[p.juara === 0 ? 1 : 0] >= p.target) {
    throw new Error('PELANGGARAN: juara tidak sesuai target poin');
  }
  s.pertandingan++;
  s.juara[p.juara]++;
  naikkan(s.partaiPerPertandingan[format], p.riwayatPartai.length);
}

function catatPembagian(partai: Partai, s: Statistik): void {
  if (partai.status !== 'berjalan') throw new Error('PELANGGARAN: sesudah pembagian partai seharusnya berjalan');
  s.rencana[partai.rencana.jenis]++;
  s.kocokUlang += partai.infoPembuka.ulang;
  if (partai.rencana.jenis === 'balak' && partai.infoPembuka.pembuka !== partai.rencana.calon) s.hakPindah++;
}

function catatKocokan(partai: PartaiRingkasan, ringkas: RingkasanPeriksa, s: Statistik): void {
  const hasil = partai.hasilTerakhir;
  s.kocokan++;
  if (hasil.akhir === 'habis') {
    s.habis++;
    if (hasil.bonus) s.bonus[hasil.bonus.jenis]++;
  } else {
    s.tabrak++;
    if (hasil.seri) s.tabrakSeri++;
  }
  s.langkah.total += ringkas.langkah;
  s.langkah.min = Math.min(s.langkah.min, ringkas.langkah);
  s.langkah.max = Math.max(s.langkah.max, ringkas.langkah);
  s.lewat += ringkas.lewat;

  const tambah = hasil.tambahan[0] + hasil.tambahan[1];
  if (tambah > 0) {
    s.markahTambahan.jumlah++;
    s.markahTambahan.total += tambah;
    s.markahTambahan.min = Math.min(s.markahTambahan.min, tambah);
    s.markahTambahan.max = Math.max(s.markahTambahan.max, tambah);
  }
}

const persen = (a: number, b: number): string => `${((100 * a) / b).toFixed(1).replace('.', ',')}%`;
const desimal = (x: number): string => x.toFixed(2).replace('.', ',');

/** Menyusun laporan dalam teks Markdown. */
export function laporanMarkdown(s: Statistik, versi: string): string {
  const k = s.kocokan;
  const baris: string[] = [];
  baris.push('# HASIL SIMULASI: gerbang tahap 1');
  baris.push('');
  baris.push(
    `Versi kode: ${versi}. Benih ${s.benihAwal} sampai ${s.benihAkhir} (bo3 untuk benih ganjil, bo5 untuk benih genap). Semua pemain bermain acak.`,
  );
  baris.push('');
  baris.push(
    `**Hasil: ${k.toLocaleString('id-ID')} kocokan dalam ${s.partai.toLocaleString('id-ID')} partai dan ${s.pertandingan.toLocaleString('id-ID')} pertandingan, tanpa satu pelanggaran aturan pun.**`,
  );
  baris.push('');
  baris.push(
    'Tiap kocokan diperiksa ulang oleh pemeriksa mandiri (`bantu/pemeriksa.ts`) yang tidak memakai kode di `src/`: dek lengkap, giliran, kartu menyambung, lewat hanya bila tidak punya kartu cocok, berakhir tepat saat habis atau tabrak, pembuka sesuai rencana, markah, bonus, dan rencana kocokan berikutnya.',
  );
  baris.push('');
  baris.push('## Akhir kocokan');
  baris.push('');
  baris.push('| Hal | Jumlah | Persentase |');
  baris.push('| --- | --- | --- |');
  baris.push(`| Habis | ${s.habis} | ${persen(s.habis, k)} dari kocokan |`);
  baris.push(`| Tabrak | ${s.tabrak} | ${persen(s.tabrak, k)} dari kocokan |`);
  baris.push(`| Tabrak seri (kocokan netral berikutnya) | ${s.tabrakSeri} | ${persen(s.tabrakSeri, k)} dari kocokan |`);
  baris.push(`| Bonus double | ${s.bonus.double} | ${persen(s.bonus.double, s.habis)} dari yang habis |`);
  baris.push(`| Bonus triplet | ${s.bonus.triplet} | ${persen(s.bonus.triplet, s.habis)} dari yang habis |`);
  baris.push(`| Bonus quartet | ${s.bonus.quartet} | ${persen(s.bonus.quartet, s.habis)} dari yang habis |`);
  baris.push('');
  baris.push('## Panjang kocokan');
  baris.push('');
  baris.push(
    `- Langkah per kocokan (main dan lewat): rata-rata ${desimal(s.langkah.total / k)}, terpendek ${s.langkah.min}, terpanjang ${s.langkah.max}.`,
  );
  baris.push(`- Lewat per kocokan: rata-rata ${desimal(s.lewat / k)}.`);
  baris.push(
    `- Markah yang ditambahkan dalam sebuah kocokan (kocokan tabrak seri tidak dihitung): rata-rata ${desimal(s.markahTambahan.total / s.markahTambahan.jumlah)}, terkecil ${s.markahTambahan.min}, terbesar ${s.markahTambahan.max}.`,
  );
  baris.push('');
  baris.push('## Pembukaan kocokan');
  baris.push('');
  baris.push('| Jenis | Jumlah |');
  baris.push('| --- | --- |');
  baris.push(`| Berdasarkan poin (kocokan pertama partai) | ${s.rencana.poin} |`);
  baris.push(`| Wajib balak (kocokan berikutnya) | ${s.rencana.balak} |`);
  baris.push(`| Netral (setelah tabrak seri) | ${s.rencana.netral} |`);
  baris.push('');
  const kb = s.rencana.balak;
  baris.push(`- Hak membuka pindah karena calon tanpa balak: ${s.hakPindah} dari ${kb} kocokan wajib balak (${persen(s.hakPindah, kb)}).`);
  const pembagian = s.rencana.poin + s.rencana.balak + s.rencana.netral;
  baris.push(
    `- Kocok ulang karena kocokan tidak adil: ${s.kocokUlang} kali dari ${pembagian} pembagian yang berhasil (${persen(s.kocokUlang, pembagian + s.kocokUlang)} dari seluruh pembagian).`,
  );
  baris.push('');
  baris.push('## Partai dan pertandingan');
  baris.push('');
  baris.push(
    `- Kocokan per partai: rata-rata ${desimal(s.kocokanPerPartai.total / s.partai)}, terpendek ${s.kocokanPerPartai.min}, terpanjang ${s.kocokanPerPartai.max}.`,
  );
  baris.push(
    `- Kemenangan partai: tim 0 ${s.menangPartai[0]}, tim 1 ${s.menangPartai[1]} (kedua tim sama kuat, selisihnya hanya kebetulan).`,
  );
  baris.push(`- Juara pertandingan: tim 0 ${s.juara[0]}, tim 1 ${s.juara[1]}.`);
  baris.push('');
  baris.push('| Jumlah partai | 2 | 3 | 4 | 5 |');
  baris.push('| --- | --- | --- | --- | --- |');
  baris.push(`| bo3 | ${s.partaiPerPertandingan.bo3[2]} | ${s.partaiPerPertandingan.bo3[3]} | - | - |`);
  baris.push(`| bo5 | - | ${s.partaiPerPertandingan.bo5[3]} | ${s.partaiPerPertandingan.bo5[4]} | ${s.partaiPerPertandingan.bo5[5]} |`);
  baris.push('');
  return baris.join('\n');
}
