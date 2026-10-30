// bantu/periksa-aturan.ts: menjalankan pemeriksa aturan penulisan (aturan.ts)
// pada semua berkas .ts proyek. Dipanggil oleh `npm run aturan`.
// Keluar dengan kode 1 bila ada pelanggaran.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { periksaTeks } from './aturan.ts';
import type { Pelanggaran } from './aturan.ts';

const AKAR = fileURLToPath(new URL('..', import.meta.url));
const FOLDER = ['src', 'bantu', 'demo', 'test'];

function kumpulkan(folder: string): string[] {
  return readdirSync(folder).flatMap((nama) => {
    const jalur = join(folder, nama);
    if (statSync(jalur).isDirectory()) return kumpulkan(jalur);
    return jalur.endsWith('.ts') ? [jalur] : [];
  });
}

const semua: Pelanggaran[] = [];
let jumlahBerkas = 0;
for (const folder of FOLDER) {
  for (const jalur of kumpulkan(join(AKAR, folder))) {
    jumlahBerkas++;
    semua.push(...periksaTeks(readFileSync(jalur, 'utf-8'), relative(AKAR, jalur)));
  }
}

if (semua.length > 0) {
  for (const p of semua) console.error(`${p.berkas}:${p.baris}  ${p.aturan}\n    ${p.teks}`);
  console.error(`\n${semua.length} pelanggaran aturan penulisan.`);
  process.exit(1);
}
console.log(`Aturan penulisan lolos: ${jumlahBerkas} berkas diperiksa.`);
