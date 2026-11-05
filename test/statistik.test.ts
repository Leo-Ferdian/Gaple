import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buatAcak } from '../src/rng.ts';
import { mulaiPartai, bagiKocokan } from '../src/partai.ts';
import { mainAcakSampaiSelesai } from '../src/simulasi.ts';
import { hitungHasil } from '../src/markah.ts';
import type { HasilKocokan } from '../src/markah.ts';
import {
  KUNCI_STATISTIK,
  statistikBaru,
  catatKocokan,
  catatPartai,
  catatPertandingan,
  rapikanStatistik,
  muatStatistik,
  simpanStatistik,
  hapusStatistik,
} from '../src/statistik.ts';
import type { Penyimpanan } from '../src/penyimpanan.ts';

function penyimpananPalsu(isi: Record<string, string> = {}): Penyimpanan & { data: Map<string, string> } {
  const data = new Map<string, string>(Object.entries(isi));
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
    data,
  };
}

/** Hasil kocokan nyata dari permainan acak, dikelompokkan menurut jenisnya. */
function kumpulkanHasil(): HasilKocokan[] {
  const hasil: HasilKocokan[] = [];
  for (let benih = 1; benih <= 300; benih++) {
    const acak = buatAcak(benih);
    const partai = bagiKocokan(mulaiPartai([0, 0]), acak);
    const { state } = mainAcakSampaiSelesai(partai.kocokan.tangan, partai.infoPembuka.pembuka, acak);
    hasil.push(hitungHasil(state));
  }
  return hasil;
}

test('kocokan: menang bila lawan kena markah, kalah bila tim Anda kena, sisanya seri; bonus hanya untuk tim Anda', () => {
  const semua = kumpulkanHasil();
  let s = statistikBaru();
  let menang = 0;
  let kalah = 0;
  const bonus = { double: 0, triplet: 0, quartet: 0 };
  semua.forEach((h, i) => {
    s = catatKocokan(s, h, `k${i}`);
    if (h.timKena === 1) menang++;
    if (h.timKena === 0) kalah++;
    if (h.akhir === 'habis' && h.bonus !== null && h.penutup % 2 === 0) bonus[h.bonus.jenis]++;
  });
  assert.equal(s.kocokan.main, semua.length);
  assert.equal(s.kocokan.menang, menang);
  assert.equal(s.kocokan.kalah, kalah);
  assert.deepEqual(s.bonus, bonus);
  assert.ok(bonus.double + bonus.triplet + bonus.quartet > 0, 'contoh tidak memuat bonus');
});

test('kejadian yang sama tidak dihitung dua kali', () => {
  const h = kumpulkanHasil()[0];
  if (h === undefined) throw new Error('tidak ada hasil');
  let s = catatKocokan(statistikBaru(), h, 'k1');
  assert.equal(catatKocokan(s, h, 'k1'), s);
  s = catatPartai(s, 0, 'p1');
  assert.equal(catatPartai(s, 0, 'p1'), s);
  s = catatPertandingan(s, 0, 'mudah', 't1');
  assert.equal(catatPertandingan(s, 0, 'mudah', 't1'), s);
  assert.equal(s.partai.main, 1);
  assert.equal(s.pertandingan.main, 1);
});

test('pertandingan: menang beruntun naik dan putus saat kalah; hitungan per tingkat AI', () => {
  let s = statistikBaru();
  const hasil: [0 | 1, 'mudah' | 'sedang' | 'sulit'][] = [
    [0, 'mudah'],
    [0, 'sedang'],
    [0, 'sulit'],
    [1, 'sulit'],
    [0, 'mudah'],
  ];
  hasil.forEach(([juara, ai], i) => (s = catatPertandingan(s, juara, ai, `t${i}`)));
  assert.deepEqual(s.pertandingan, { main: 5, menang: 4 });
  assert.equal(s.beruntun, 1);
  assert.equal(s.beruntunTerbaik, 3);
  assert.deepEqual(s.perAi.mudah, { main: 2, menang: 2 });
  assert.deepEqual(s.perAi.sedang, { main: 1, menang: 1 });
  assert.deepEqual(s.perAi.sulit, { main: 2, menang: 1 });
});

test('partai dihitung menurut pemenangnya', () => {
  let s = catatPartai(statistikBaru(), 0, 'a');
  s = catatPartai(s, 1, 'b');
  assert.deepEqual(s.partai, { main: 2, menang: 1 });
});

test('rapikan: data buruk menjadi nol, menang tidak melebihi main, kunci tak dikenal dibuang', () => {
  assert.deepEqual(rapikanStatistik(null), statistikBaru());
  assert.deepEqual(rapikanStatistik('x'), statistikBaru());
  const r = rapikanStatistik({
    pertandingan: { main: 3, menang: 9 },
    partai: { main: -4, menang: 'a' },
    kocokan: { main: 5, menang: 2, kalah: 99 },
    bonus: { double: 2.9, triplet: NaN, quartet: 'x' },
    beruntun: 4,
    beruntunTerbaik: 1,
    perAi: { mudah: { main: 2, menang: 1 }, rahasia: { main: 1, menang: 1 } },
    dicatat: ['a', 3, 'b'],
    asing: 1,
  });
  assert.deepEqual(r.pertandingan, { main: 3, menang: 3 });
  assert.deepEqual(r.partai, { main: 0, menang: 0 });
  assert.equal(r.kocokan.kalah, 3);
  assert.deepEqual(r.bonus, { double: 2, triplet: 0, quartet: 0 });
  assert.equal(r.beruntunTerbaik, 4);
  assert.deepEqual(r.perAi.mudah, { main: 2, menang: 1 });
  assert.deepEqual(r.dicatat, ['a', 'b']);
  assert.ok(!('asing' in r));
});

test('simpan, muat, dan hapus statistik; penyimpanan yang menolak tidak membuat game gagal', () => {
  const p = penyimpananPalsu();
  const s = catatPartai(statistikBaru(), 0, 'a');
  assert.equal(simpanStatistik(p, s), true);
  assert.deepEqual(muatStatistik(p), s);
  hapusStatistik(p);
  assert.deepEqual(muatStatistik(p), statistikBaru());
  assert.deepEqual(muatStatistik(penyimpananPalsu({ [KUNCI_STATISTIK]: '{{{ rusak' })), statistikBaru());
  assert.deepEqual(muatStatistik(null), statistikBaru());
  assert.equal(simpanStatistik(null, s), false);
  const menolak: Penyimpanan = {
    getItem: () => {
      throw new Error('x');
    },
    setItem: () => {
      throw new Error('x');
    },
    removeItem: () => {
      throw new Error('x');
    },
  };
  assert.deepEqual(muatStatistik(menolak), statistikBaru());
  assert.equal(simpanStatistik(menolak, s), false);
  assert.doesNotThrow(() => hapusStatistik(menolak));
});
