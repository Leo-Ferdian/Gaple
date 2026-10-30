// Demo potongan 4: memainkan satu PARTAI penuh secara acak sampai markah
// satu tim mencapai 100, lengkap dengan bonus dan markah tiap kocokan.
//
// Cara menjalankan (dari folder gaple):
//   npm run demo            -> benih bawaan 7
//   npm run demo -- 123     -> benih 123 (benih sama = partai sama)
//
// Pemain bermain acak, jadi hasilnya hanya untuk memperlihatkan aturan.
// Pengelolaan partai dan pertandingan yang sebenarnya ada di potongan 5.

import { buatDek, kocok, bagi } from '../src/engine.ts';
import { namaPemain, wajib } from './bersama.ts';
import { buatAcak } from '../src/rng.ts';
import { mulaiDariRencana } from '../src/kocokan.ts';
import { rencanaKocokanPertama } from '../src/pembuka.ts';
import type { RencanaPembukaan } from '../src/pembuka.ts';
import { mainAcakDariState } from '../src/simulasi.ts';
import { hitungHasil, terapkanHasil, pemenangPartai, BATAS_MARKAH } from '../src/markah.ts';
import type { Markah } from '../src/markah.ts';

const benih = Number(process.argv[2] ?? 7);
const acak = buatAcak(benih);
const NAMA_TIM = ['Tim 0 (Selatan+Utara)', 'Tim 1 (Barat+Timur)'];

let rencana: RencanaPembukaan = rencanaKocokanPertama([0, 0]);
let markah: Markah = [0, 0];
let nomor = 0;

console.log(`Benih ${benih}. Partai berakhir saat markah satu tim mencapai ${BATAS_MARKAH}.\n`);

while (!pemenangPartai(markah)) {
  nomor++;
  let ulang = 0;
  let mulai = mulaiDariRencana(bagi(kocok(buatDek(), acak)), rencana);
  while (mulai.status === 'ulang') {
    ulang++;
    mulai = mulaiDariRencana(bagi(kocok(buatDek(), acak)), rencana);
  }

  const { state } = mainAcakDariState(mulai.state, acak);
  const hasil = hitungHasil(state);
  markah = terapkanHasil(markah, hasil);

  let ringkas: string;
  if (hasil.akhir === 'habis') {
    const bonus = hasil.bonus ? `, bonus ${hasil.bonus.jenis} +${hasil.bonus.nilai}` : '';
    ringkas = `${namaPemain(hasil.penutup)} menutup${bonus}. Sisa lawan ${hasil.titikSisa[hasil.timKena]} titik`;
  } else if (hasil.timKena === null) {
    ringkas = `tabrak seri (${hasil.titikSisa[0]} sama ${hasil.titikSisa[1]}), tanpa markah`;
  } else {
    ringkas = `tabrak, tim ${hasil.timKena} kalah dengan ${hasil.titikSisa[hasil.timKena]} titik`;
  }

  const catatanUlang = ulang ? ` (dikocok ulang ${ulang}x)` : '';
  console.log(`Kocokan ${String(nomor).padStart(2)}${catatanUlang}: dibuka ${namaPemain(mulai.pembuka)}. ${ringkas}.`);
  console.log(`            tambah ${hasil.tambahan[0]} / ${hasil.tambahan[1]}  ->  markah ${markah[0]} / ${markah[1]}`);

  rencana = hasil.rencanaBerikutnya;
}

const { kalah, menang } = wajib(pemenangPartai(markah), 'partai belum selesai');
console.log(`\n${NAMA_TIM[kalah]} mencapai ${markah[kalah]} dan kalah partai.`);
console.log(`${NAMA_TIM[menang]} menang partai (markah akhir ${markah[menang]}) dan mendapat 1 poin.`);
