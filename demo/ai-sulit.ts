// Demo tahap 6: mengukur kekuatan AI Sulit.
//
// Cara menjalankan (dari folder gaple):
//   npm run demo:sulit               -> 200 partai Sulit lawan Sedang, benih 1
//   npm run demo:sulit -- 400 5      -> 400 partai, benih 5
//
// Tim uji memakai AI Sulit, lawan memakai AI Sedang, lalu AI Mudah. Kursi ditukar di tiap partai
// supaya keuntungan kursi tidak ikut terhitung. Juga dicetak cermin (Sulit lawan Sulit, ~50%).

import { buatAcak } from '../src/rng.ts';
import { mulaiPartai } from '../src/partai.ts';
import { mainPartaiDengan, pilihLangkahAcak } from '../src/simulasi.ts';
import type { EmpatKebijakan, Kebijakan } from '../src/simulasi.ts';
import { pilihLangkahSedang } from '../src/ai-sedang.ts';
import { pilihLangkahSulit } from '../src/ai-sulit.ts';

const jumlah = Number(process.argv[2] ?? 200);
const benih = Number(process.argv[3] ?? 1);
if (!Number.isInteger(jumlah) || jumlah < 1 || !Number.isInteger(benih))
  throw new Error('Pemakaian: npm run demo:sulit -- [jumlah partai] [benih]');

function ukur(nama: string, tim: Kebijakan, lawan: Kebijakan): void {
  let menang = 0;
  let markahUji = 0;
  let markahLawan = 0;
  const mulai = performance.now();
  for (let i = 0; i < jumlah; i++) {
    const acak = buatAcak(benih * 100003 + i);
    const timUjiGenap = i % 2 === 0; // tim uji = pemain 0 dan 2 bila true
    const kebijakan: EmpatKebijakan = timUjiGenap ? [tim, lawan, tim, lawan] : [lawan, tim, lawan, tim];
    const partai = mainPartaiDengan(mulaiPartai([0, 0]), kebijakan, acak);
    if (partai.status !== 'selesai') throw new Error('Partai tidak selesai');
    const timUji = timUjiGenap ? 0 : 1;
    if (partai.pemenang.menang === timUji) menang++;
    markahUji += partai.markah[timUji];
    markahLawan += partai.markah[timUji === 0 ? 1 : 0];
  }
  const persen = ((menang / jumlah) * 100).toFixed(1);
  const detik = ((performance.now() - mulai) / 1000).toFixed(0);
  console.log(
    `${nama}: menang ${menang}/${jumlah} (${persen}%), rata-rata markah akhir tim uji ${(markahUji / jumlah).toFixed(1)} lawan ${(markahLawan / jumlah).toFixed(1)} [${detik} dtk]`,
  );
}

console.log(`Mengukur ${jumlah} partai, benih ${benih}`);
ukur('Sulit lawan Sedang', pilihLangkahSulit, pilihLangkahSedang);
ukur('Sulit lawan Mudah', pilihLangkahSulit, pilihLangkahAcak);
ukur('Sulit lawan Sulit (cermin, ~50%)', pilihLangkahSulit, pilihLangkahSulit);
