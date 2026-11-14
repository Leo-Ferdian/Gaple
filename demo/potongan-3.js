// Demo potongan 3: rantai beberapa kocokan dalam satu partai, memperlihatkan
// aturan pembuka (siapa membuka, dengan kartu apa, kapan hak pindah atau diulang).
//
// Cara menjalankan (dari folder gaple):
//   npm run demo                -> benih 7, 5 kocokan, poin 0-0
//   npm run demo -- 123         -> benih 123
//   npm run demo -- 123 8 2 1   -> benih 123, 8 kocokan, poin 2-1
//
// Kocokan dimainkan acak. Penghitungan markah baru ada di potongan 4.

import { buatDek, kocok, bagi, nilaiKartu } from '../src/engine.ts';
import { buatAcak } from '../src/rng.ts';
import { NAMA_PEMAIN, mulaiDariRencana } from '../src/kocokan.ts';
import { deskripsiSyarat, rencanaKocokanPertama, rencanaKocokanBerikutnya } from '../src/pembuka.ts';
import { mainAcakDariState } from '../src/simulasi.ts';

const benih = Number(process.argv[2] ?? 7);
const jumlahKocokan = Number(process.argv[3] ?? 5);
const poin = [Number(process.argv[4] ?? 0), Number(process.argv[5] ?? 0)];

const acak = buatAcak(benih);
let rencana = rencanaKocokanPertama(poin);

console.log(`Benih ${benih}, poin ${poin[0]}-${poin[1]}, ${jumlahKocokan} kocokan\n`);

for (let nomor = 1; nomor <= jumlahKocokan; nomor++) {
  let mulai;
  let percobaan = 0;
  do {
    percobaan++;
    mulai = mulaiDariRencana(bagi(kocok(buatDek(), acak)), rencana);
    if (mulai.status === 'ulang') console.log(`   (dikocok ulang: ${mulai.alasan})`);
  } while (mulai.status === 'ulang');

  const { state, akhir } = mainAcakDariState(mulai.state, acak);
  const pertama = state.riwayat[0];

  console.log(`Kocokan ${nomor}: rencana ${rencana.jenis}`);
  console.log(`   Pembuka : ${NAMA_PEMAIN[mulai.pembuka]} (${mulai.alasan})`);
  console.log(`   Syarat  : ${deskripsiSyarat(mulai.state.syaratPembuka)}`);
  console.log(`   Membuka : ${pertama.kartu.id}, total ${state.riwayat.length} langkah, berakhir ${akhir}`);

  if (akhir === 'habis') {
    const penutup = state.tangan.findIndex((t) => t.length === 0);
    rencana = rencanaKocokanBerikutnya({ akhir, penutup });
    console.log(`   Penutup : ${NAMA_PEMAIN[penutup]} -> calon pembuka berikutnya ${NAMA_PEMAIN[penutup]}`);
  } else {
    const titik = [0, 1].map((tim) => [tim, tim + 2].reduce((j, p) => j + state.tangan[p].reduce((s, k) => s + nilaiKartu(k), 0), 0));
    rencana = rencanaKocokanBerikutnya({ akhir, tangan: state.tangan });
    console.log(`   Titik sisa: tim 0 = ${titik[0]}, tim 1 = ${titik[1]}`);
    console.log(
      rencana.jenis === 'netral'
        ? '   Seri -> kocokan berikutnya netral (dibuka kartu 0-0)'
        : `   Calon pembuka berikutnya: ${NAMA_PEMAIN[rencana.calon]}`,
    );
  }
  console.log();
}
