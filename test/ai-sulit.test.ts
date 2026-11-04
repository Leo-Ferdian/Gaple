import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buatAcak } from '../src/rng.ts';
import { mulaiPartai, bagiKocokan, STATUS_BERJALAN } from '../src/partai.ts';
import type { Partai } from '../src/partai.ts';
import { mainPartaiDengan, langkahAcakPartai, pilihLangkahAcak } from '../src/simulasi.ts';
import type { EmpatKebijakan, Kebijakan } from '../src/simulasi.ts';
import { pilihLangkahSulit, nilaiLangkahSulit } from '../src/ai-sulit.ts';
import { saranManusia, menungguManusia } from '../src/controller.ts';
import { kartuLegalPemain } from '../src/kocokan.ts';
import { ada, empat, nomor } from '../bantu/bantuan-tes.ts';

// Dugaan dikurangi supaya tes cepat; kualitas diukur lewat `npm run demo:sulit` (bawaan 60 dugaan).
const sulit: Kebijakan = (state, acak) => pilihLangkahSulit(state, acak, { dugaan: 8 });
// Untuk tes kekuatan dipakai dugaan lebih banyak: dengan sedikit dugaan, keputusan terlalu berisik (8 dugaan kira-kira setara AI Sedang).
const sulitTeliti: Kebijakan = (state, acak) => pilihLangkahSulit(state, acak, { dugaan: 30 });
const semuaSulit: EmpatKebijakan = [sulit, sulit, sulit, sulit];

test('AI Sulit di keempat kursi: 20 partai penuh selalu legal dan selesai', () => {
  for (let benih = 1; benih <= 20; benih++) {
    const partai = mainPartaiDengan(mulaiPartai([0, 0]), semuaSulit, buatAcak(benih));
    assert.equal(partai.status, 'selesai');
  }
});

test('AI Sulit selalu memilih langkah yang legal dan lewat hanya bila tidak punya kartu legal', () => {
  let diuji = 0;
  for (let benih = 1; benih <= 15; benih++) {
    const acak = buatAcak(benih);
    let partai: Partai = bagiKocokan(mulaiPartai([0, 0]), acak);
    for (let i = 0; i < 300 && partai.status !== 'selesai'; i++) {
      if (partai.status === STATUS_BERJALAN) {
        const { kocokan } = partai;
        const legal = kartuLegalPemain(kocokan, kocokan.giliran);
        const langkah = sulit(kocokan, acak);
        if (legal.length === 0) assert.equal(langkah.aksi, 'lewat');
        else {
          assert.equal(langkah.aksi, 'main');
          if (langkah.aksi === 'main') {
            const cocok = legal.find((p) => p.kartu.id === langkah.kartu.id);
            assert.ok(cocok !== undefined && cocok.sisi.includes(langkah.sisi), `benih ${benih}: langkah tidak legal`);
          }
        }
        diuji++;
      }
      partai = langkahAcakPartai(partai, acak);
    }
  }
  assert.ok(diuji > 300);
});

test('AI Sulit hanya memakai pandangan: menukar kartu lawan dan rekan (jumlah tetap) tidak mengubah nilai langkah', () => {
  let diuji = 0;
  for (let benih = 1; benih <= 25; benih++) {
    const acak = buatAcak(benih);
    let partai: Partai = bagiKocokan(mulaiPartai([0, 0]), acak);
    for (let i = 0; i < 300 && partai.status !== 'selesai'; i++) {
      if (partai.status === STATUS_BERJALAN && i % 3 === 0) {
        const { kocokan } = partai;
        const saya = kocokan.giliran;
        const [p, q] = [0, 1, 2, 3].filter((n) => n !== saya).map((n) => nomor(n));
        const tangan = empat(...[0, 1, 2, 3].map((n) => [...ada(kocokan.tangan[n])]));
        const kp = ada(tangan[ada(p)]);
        const kq = ada(tangan[ada(q)]);
        const [a, b] = [kp[0], kq[0]];
        if (a !== undefined && b !== undefined) {
          kp[0] = b;
          kq[0] = a;
          const asli = nilaiLangkahSulit(kocokan, buatAcak(benih * 31 + i), { dugaan: 6 });
          const ditukar = nilaiLangkahSulit({ ...kocokan, tangan }, buatAcak(benih * 31 + i), { dugaan: 6 });
          assert.deepEqual(ditukar, asli, `benih ${benih}, langkah ${i}: nilai berubah ketika kartu lawan ditukar`);
          diuji++;
        }
      }
      partai = langkahAcakPartai(partai, acak);
    }
  }
  assert.ok(diuji > 100, `hanya ${diuji} keadaan diuji`);
});

test('AI Sulit deterministik untuk benih yang sama', () => {
  const acak = buatAcak(4);
  let partai: Partai = bagiKocokan(mulaiPartai([0, 0]), acak);
  for (let i = 0; i < 12; i++) partai = langkahAcakPartai(partai, acak);
  if (partai.status !== STATUS_BERJALAN) throw new Error('partai harus berjalan');
  assert.deepEqual(
    pilihLangkahSulit(partai.kocokan, buatAcak(9), { dugaan: 10 }),
    pilihLangkahSulit(partai.kocokan, buatAcak(9), { dugaan: 10 }),
  );
});

test('AI Sulit jauh lebih kuat dari AI Mudah pada benih tetap (kursi ditukar bergantian)', () => {
  const jumlah = 40;
  let menang = 0;
  for (let i = 0; i < jumlah; i++) {
    const genap = i % 2 === 0;
    const kebijakan: EmpatKebijakan = genap
      ? [sulitTeliti, pilihLangkahAcak, sulitTeliti, pilihLangkahAcak]
      : [pilihLangkahAcak, sulitTeliti, pilihLangkahAcak, sulitTeliti];
    const partai = mainPartaiDengan(mulaiPartai([0, 0]), kebijakan, buatAcak(500 + i));
    if (partai.status !== 'selesai') throw new Error('partai tidak selesai');
    if (partai.pemenang.menang === (genap ? 0 : 1)) menang++;
  }
  // Terukur sekitar 90% (npm run demo:sulit). Selisih terhadap Sedang hanya ±60% sehingga terlalu berisik untuk tes cepat; diukur di demo.
  assert.ok(menang / jumlah >= 0.7, `Sulit hanya menang ${menang}/${jumlah}`);
}, 60000);

test('saranManusia: kartu dan sisi saran selalu legal pada giliran Anda, dan null di luar giliran Anda', () => {
  let diberi = 0;
  for (let benih = 1; benih <= 12; benih++) {
    const acak = buatAcak(benih);
    let partai: Partai = bagiKocokan(mulaiPartai([0, 0]), acak);
    for (let i = 0; i < 300 && partai.status !== 'selesai'; i++) {
      if (partai.status === STATUS_BERJALAN) {
        const saran = saranManusia(partai, buatAcak(i));
        if (menungguManusia(partai)) {
          const legal = kartuLegalPemain(partai.kocokan, 0);
          assert.ok(saran !== null, `benih ${benih}: ada kartu legal tetapi tidak ada saran`);
          const cocok = legal.find((p) => p.kartu.id === saran?.kartu.id);
          assert.ok(cocok !== undefined && cocok.sisi.includes(ada(saran).sisi), `benih ${benih}: saran tidak legal`);
          diberi++;
        } else {
          assert.equal(saran, null);
        }
      }
      partai = langkahAcakPartai(partai, acak);
    }
  }
  assert.ok(diberi > 30, `hanya ${diberi} saran diuji`);
});
