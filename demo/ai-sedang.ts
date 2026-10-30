// Demo tahap 4: mengukur kekuatan AI Sedang melawan AI Mudah (acak).
//
// Cara menjalankan (dari folder gaple):
//   npm run demo:ai              -> 400 partai, benih 1
//   npm run demo:ai -- 1000 5    -> 1000 partai, benih 5
//
// Tim uji memakai AI Sedang, tim lawan bermain acak. Kursi ditukar di tiap partai
// (tim uji duduk sebagai Selatan-Utara atau Barat-Timur bergantian) supaya keuntungan
// kursi tidak ikut terhitung. Juga dicetak pertandingan cermin (Sedang lawan Sedang),
// yang seharusnya sekitar 50%.

import { buatAcak } from '../src/rng.ts';
import { mulaiPartai } from '../src/partai.ts';
import { mainPartaiDengan, pilihLangkahAcak } from '../src/simulasi.ts';
import type { EmpatKebijakan } from '../src/simulasi.ts';
import { pilihLangkahSedang } from '../src/ai-sedang.ts';

const jumlah = Number(process.argv[2] ?? 400);
const benih = Number(process.argv[3] ?? 1);
if (!Number.isInteger(jumlah) || jumlah < 1 || !Number.isInteger(benih))
  throw new Error('Pemakaian: npm run demo:ai -- [jumlah partai] [benih]');

function ukur(nama: string, kebijakanTim: EmpatKebijakan, kebijakanLawan: EmpatKebijakan): void {
  let menang = 0;
  let markahUji = 0;
  let markahLawan = 0;
  for (let i = 0; i < jumlah; i++) {
    const acak = buatAcak(benih * 100003 + i);
    const timUjiGenap = i % 2 === 0; // tim uji = pemain 0 dan 2 bila true
    const kebijakan: EmpatKebijakan = timUjiGenap
      ? [kebijakanTim[0], kebijakanLawan[1], kebijakanTim[2], kebijakanLawan[3]]
      : [kebijakanLawan[0], kebijakanTim[1], kebijakanLawan[2], kebijakanTim[3]];
    const partai = mainPartaiDengan(mulaiPartai([0, 0]), kebijakan, acak);
    if (partai.status !== 'selesai') throw new Error('Partai tidak selesai');
    const timUji = timUjiGenap ? 0 : 1;
    if (partai.pemenang.menang === timUji) menang++;
    markahUji += partai.markah[timUji];
    markahLawan += partai.markah[timUji === 0 ? 1 : 0];
  }
  const persen = ((menang / jumlah) * 100).toFixed(1);
  console.log(
    `${nama}: menang ${menang}/${jumlah} (${persen}%), rata-rata markah akhir tim uji ${(markahUji / jumlah).toFixed(1)} lawan ${(markahLawan / jumlah).toFixed(1)}`,
  );
}

const sedang: EmpatKebijakan = [pilihLangkahSedang, pilihLangkahSedang, pilihLangkahSedang, pilihLangkahSedang];
const acakSemua: EmpatKebijakan = [pilihLangkahAcak, pilihLangkahAcak, pilihLangkahAcak, pilihLangkahAcak];

console.log(`Mengukur ${jumlah} partai, benih ${benih}`);
ukur('Sedang lawan Mudah', sedang, acakSemua);
ukur('Mudah lawan Mudah (cermin, ~50%)', acakSemua, acakSemua);
ukur('Sedang lawan Sedang (cermin, ~50%)', sedang, sedang);
