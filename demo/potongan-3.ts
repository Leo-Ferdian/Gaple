// Demo potongan 3: rantai beberapa kocokan dalam satu partai, memperlihatkan
// aturan pembuka (siapa membuka, dengan kartu apa, kapan hak pindah atau diulang).
//
// Cara menjalankan (dari folder gaple):
//   npm run demo                -> benih 7, 5 kocokan, poin 0-0
//   npm run demo -- 123         -> benih 123
//   npm run demo -- 123 8 2 1   -> benih 123, 8 kocokan, poin 2-1
//
// Kocokan dimainkan acak. Penghitungan markah baru ada di potongan 4.

import { buatDek, kocok, bagi, adalahNomorPemain } from '../src/engine.ts';
import { namaPemain, wajib } from './bersama.ts';
import { buatAcak } from '../src/rng.ts';
import { mulaiDariRencana } from '../src/kocokan.ts';
import { deskripsiSyarat, rencanaKocokanPertama, rencanaKocokanBerikutnya, titikSisaTim } from '../src/pembuka.ts';
import type { RencanaPembukaan } from '../src/pembuka.ts';
import { mainAcakDariState } from '../src/simulasi.ts';

const benih = Number(process.argv[2] ?? 7);
const jumlahKocokan = Number(process.argv[3] ?? 5);
const poin: [number, number] = [Number(process.argv[4] ?? 0), Number(process.argv[5] ?? 0)];

const acak = buatAcak(benih);
let rencana: RencanaPembukaan = rencanaKocokanPertama(poin);

console.log(`Benih ${benih}, poin ${poin[0]}-${poin[1]}, ${jumlahKocokan} kocokan\n`);

for (let nomor = 1; nomor <= jumlahKocokan; nomor++) {
  let mulai = mulaiDariRencana(bagi(kocok(buatDek(), acak)), rencana);
  while (mulai.status === 'ulang') {
    console.log(`   (dikocok ulang: ${mulai.alasan})`);
    mulai = mulaiDariRencana(bagi(kocok(buatDek(), acak)), rencana);
  }

  const { state, akhir } = mainAcakDariState(mulai.state, acak);
  const pertama = wajib(state.riwayat[0], 'riwayat kosong');
  if (pertama.aksi !== 'main') throw new Error('langkah pertama seharusnya main');

  console.log(`Kocokan ${nomor}: rencana ${rencana.jenis}`);
  console.log(`   Pembuka : ${namaPemain(mulai.pembuka)} (${mulai.alasan})`);
  console.log(`   Syarat  : ${deskripsiSyarat(mulai.state.syaratPembuka)}`);
  console.log(`   Membuka : ${pertama.kartu.id}, total ${state.riwayat.length} langkah, berakhir ${akhir}`);

  if (akhir === 'habis') {
    const penutup = state.tangan.findIndex((t) => t.length === 0);
    if (!adalahNomorPemain(penutup)) throw new Error('tidak ada penutup');
    rencana = rencanaKocokanBerikutnya({ akhir, penutup });
    console.log(`   Penutup : ${namaPemain(penutup)} -> calon pembuka berikutnya ${namaPemain(penutup)}`);
  } else {
    const titik = titikSisaTim(state.tangan);
    rencana = rencanaKocokanBerikutnya({ akhir, tangan: state.tangan });
    console.log(`   Titik sisa: tim 0 = ${titik[0]}, tim 1 = ${titik[1]}`);
    console.log(
      rencana.jenis === 'netral'
        ? '   Seri -> kocokan berikutnya netral (dibuka kartu 0-0)'
        : `   Calon pembuka berikutnya: ${namaPemain(rencana.calon)}`,
    );
  }
  console.log();
}
