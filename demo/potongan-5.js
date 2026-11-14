// Demo potongan 5: memainkan satu PERTANDINGAN penuh secara acak, partai demi
// partai, sampai ada juara.
//
// Cara menjalankan (dari folder gaple):
//   npm run demo                -> benih 7, bo3
//   npm run demo -- 123         -> benih 123, bo3
//   npm run demo -- 123 bo5     -> benih 123, bo5
//
// Pemain bermain acak. Yang diperlihatkan: poin menentukan kartu pembuka tiap
// partai, markah tiap partai mulai dari 0, dan pertandingan berakhir saat satu
// tim mencapai target poin.

import { buatAcak } from '../src/rng.ts';
import { NAMA_PEMAIN } from '../src/kocokan.ts';
import { mulaiPertandingan, mulaiPartaiBerikutnya, ubahPartai, catatPartai } from '../src/pertandingan.ts';
import {
  bagiKocokan,
  mainkanPartai,
  lewatPartai,
  lanjutkanPartai,
  STATUS_SIAP,
  STATUS_BERJALAN,
  STATUS_RINGKASAN,
  STATUS_SELESAI,
} from '../src/partai.ts';
import { pilihLangkahAcak } from '../src/simulasi.ts';

const benih = Number(process.argv[2] ?? 7);
const format = process.argv[3] ?? 'bo3';
const acak = buatAcak(benih);
const NAMA_TIM = ['Tim 0 (Selatan+Utara)', 'Tim 1 (Barat+Timur)'];

let p = mulaiPertandingan(format);
console.log(`Benih ${benih}, ${format}: juara = tim pertama yang mencapai ${p.target} poin.\n`);

while (p.juara === null) {
  p = mulaiPartaiBerikutnya(p);
  console.log(`=== Partai ${p.riwayatPartai.length + 1}, poin ${p.poin[0]}-${p.poin[1]} ===`);

  // Memainkan partai langkah demi langkah memakai fungsi-fungsi partai.js.
  p = ubahPartai(p, (partai) => {
    while (partai.status !== STATUS_SELESAI) {
      if (partai.status === STATUS_SIAP) {
        partai = bagiKocokan(partai, acak);
        const { pembuka, syarat, ulang } = partai.infoPembuka;
        const catatan = ulang ? `, dikocok ulang ${ulang}x` : '';
        console.log(
          `  Kocokan ${partai.nomorKocokan}: dibuka ${NAMA_PEMAIN[pembuka]} (${syarat.jenis === 'kartu' ? 'kartu ' + syarat.kartu.id : 'balak'}${catatan})`,
        );
      } else if (partai.status === STATUS_BERJALAN) {
        const langkah = pilihLangkahAcak(partai.kocokan, acak);
        partai =
          langkah.aksi === 'lewat'
            ? lewatPartai(partai, langkah.pemain)
            : mainkanPartai(partai, langkah.pemain, langkah.kartu, langkah.sisi);
      } else if (partai.status === STATUS_RINGKASAN) {
        const h = partai.hasilTerakhir;
        const sebab =
          h.akhir === 'habis'
            ? `${NAMA_PEMAIN[h.penutup]} menutup${h.bonus ? ' (' + h.bonus.jenis + ')' : ''}`
            : h.seri
              ? 'tabrak seri'
              : `tabrak, tim ${h.timKena} kalah`;
        console.log(`      ${sebab}. Markah ${partai.markah[0]} / ${partai.markah[1]}`);
        partai = lanjutkanPartai(partai);
      }
    }
    return partai;
  });

  const { menang, kalah } = p.partai.pemenang;
  console.log(`  -> ${NAMA_TIM[kalah]} mencapai ${p.partai.markah[kalah]}. ${NAMA_TIM[menang]} menang partai.`);
  p = catatPartai(p);
  console.log(`  Poin pertandingan: ${p.poin[0]}-${p.poin[1]}\n`);
}

const total = p.riwayatPartai.reduce((j, x) => j + x.jumlahKocokan, 0);
console.log(`JUARA: ${NAMA_TIM[p.juara]}, skor ${p.poin[0]}-${p.poin[1]}, ${p.riwayatPartai.length} partai, ${total} kocokan.`);
