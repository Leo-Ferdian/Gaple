// Potongan 6: GERBANG tahap 1. Memainkan ribuan kocokan acak dan memeriksa
// tiap kocokan dengan pemeriksa mandiri (bantu/pemeriksa.js).
//
// Cara menjalankan (dari folder gaple):
//   npm run gerbang                     -> 10.000 kocokan, mulai benih 1
//   npm run gerbang -- 50000            -> 50.000 kocokan
//   npm run gerbang -- 10000 500        -> mulai dari benih 500
//   npm run gerbang -- 10000 1 --md     -> hanya mencetak laporan Markdown
//
// Bila ada pelanggaran aturan, skrip berhenti, mencetak pesannya (lengkap
// dengan benih pertandingan supaya bisa diulang), dan keluar dengan kode 1.

import { readFileSync } from 'node:fs';
import { jalankanGerbang, laporanMarkdown } from '../bantu/gerbang.js';

const argumen = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const hanyaMarkdown = process.argv.includes('--md');
const jumlahKocokan = Number(argumen[0] ?? 10000);
const benihAwal = Number(argumen[1] ?? 1);
const versi = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8')).version;

const mulai = performance.now();
try {
  const statistik = jalankanGerbang({ jumlahKocokan, benihAwal });
  const detik = ((performance.now() - mulai) / 1000).toFixed(1);
  const laporan = laporanMarkdown(statistik, versi);

  if (hanyaMarkdown) {
    console.log(laporan);
  } else {
    console.log(laporan);
    console.log(`GERBANG LULUS: ${statistik.kocokan} kocokan diperiksa dalam ${detik} detik, tanpa pelanggaran.`);
  }
} catch (galat) {
  console.error('GERBANG GAGAL');
  console.error(galat.message);
  process.exit(1);
}
