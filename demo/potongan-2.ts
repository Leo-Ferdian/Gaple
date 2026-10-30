// Demo potongan 2: memainkan satu kocokan acak dan mencetak tiap langkahnya.
//
// Cara menjalankan (dari folder gaple):
//   npm run demo            -> memakai benih bawaan 7
//   npm run demo -- 123     -> memakai benih 123 (benih sama = kocokan sama)
//
// Pembuka sementara selalu Selatan (pemain 0). Aturan pembuka yang benar
// ditambahkan di potongan 3.

import { buatDek, kocok, bagi, nilaiKartu } from '../src/engine.ts';
import { namaPemain, wajib } from './bersama.ts';
import { buatAcak } from '../src/rng.ts';
import { mulaiKocokan } from '../src/kocokan.ts';
import { teksMeja } from '../src/meja.ts';
import { akhirSementara, langkahAcak } from '../src/simulasi.ts';

const benih = Number(process.argv[2] ?? 7);
const acak = buatAcak(benih);
const tangan = bagi(kocok(buatDek(), acak));

console.log(`Benih: ${benih}\n`);
console.log('Tangan awal:');
tangan.forEach((t, i) => {
  console.log(`  ${namaPemain(i).padEnd(8)} ${t.map((k) => k.id).join('  ')}`);
});
console.log();

let state = mulaiKocokan(tangan, 0);
let langkah = 0;

while (!akhirSementara(state)) {
  const pemain = state.giliran;
  state = langkahAcak(state, acak);
  langkah++;

  const kejadian = wajib(state.riwayat.at(-1), 'riwayat kosong');
  const nama = namaPemain(pemain).padEnd(8);
  if (kejadian.aksi === 'main') {
    console.log(
      `${String(langkah).padStart(2)}. ${nama} main ${kejadian.kartu.id} di ${kejadian.sisi.padEnd(5)} meja: ${teksMeja(state.meja)}`,
    );
  } else {
    console.log(`${String(langkah).padStart(2)}. ${nama} lewat`);
  }
}

console.log(`\nKocokan selesai: ${akhirSementara(state)}`);
console.log('Sisa kartu:');
state.tangan.forEach((t, i) => {
  const titik = t.reduce((jumlah, k) => jumlah + nilaiKartu(k), 0);
  console.log(`  ${namaPemain(i).padEnd(8)} ${t.map((k) => k.id).join('  ') || '(kosong)'}  = ${titik} titik`);
});
