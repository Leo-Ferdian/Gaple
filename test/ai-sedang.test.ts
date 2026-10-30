import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buatAcak } from '../src/rng.ts';
import { buatKartu } from '../src/engine.ts';
import { SISI_AWAL, SISI_KANAN } from '../src/meja.ts';
import { mulaiPartai, bagiKocokan, lanjutkanPartai, STATUS_BERJALAN, STATUS_RINGKASAN } from '../src/partai.ts';
import type { Partai } from '../src/partai.ts';
import { mainPartaiDengan, pilihLangkahAcak } from '../src/simulasi.ts';
import type { EmpatKebijakan } from '../src/simulasi.ts';
import { pilihLangkahSedang, angkaTidakDimiliki } from '../src/ai-sedang.ts';
import { langkahOtomatis, menungguManusia, mainkanManusia, AI_TERSEDIA } from '../src/controller.ts';
import { kartuLegalPemain } from '../src/kocokan.ts';
import { jalankan } from '../bantu/skenario.ts';
import { ada, empat, nomor } from '../bantu/bantuan-tes.ts';
import { langkahAcakPartai } from '../src/simulasi.ts';

const k = buatKartu;
const sedang: EmpatKebijakan = [pilihLangkahSedang, pilihLangkahSedang, pilihLangkahSedang, pilihLangkahSedang];
const acakSemua: EmpatKebijakan = [pilihLangkahAcak, pilihLangkahAcak, pilihLangkahAcak, pilihLangkahAcak];

test('angkaTidakDimiliki: angka di dua ujung saat pemain lewat, hanya untuk pemain itu', () => {
  const state = jalankan([[k(0, 3), k(1, 1)], [k(1, 2)], [k(0, 5)], [k(4, 4)]], 0, [
    ['m', 0, k(0, 3), SISI_AWAL],
    ['l', 1],
  ]);
  assert.deepEqual([...angkaTidakDimiliki(state, 1)].sort(), [0, 3]);
  assert.equal(angkaTidakDimiliki(state, 0).size, 0);
  assert.equal(angkaTidakDimiliki(state, 2).size, 0);
});

test('membuang kartu berat lebih dulu bila yang lain setara', () => {
  const state = jalankan([[k(0, 3), k(3, 6), k(1, 3), k(2, 3)], [k(1, 2)], [k(2, 4)], [k(4, 4)]], 0, [
    ['m', 0, k(0, 3), SISI_AWAL],
    ['l', 1],
    ['l', 2],
    ['l', 3],
  ]);
  const langkah = pilihLangkahSedang(state, buatAcak(1));
  assert.equal(langkah.aksi, 'main');
  assert.equal(langkah.aksi === 'main' ? langkah.kartu.id : '', '3-6');
});

test('menjadikan ujung angka yang terbukti tidak dimiliki lawan', () => {
  // Pemain 1 (lawan) lewat saat ujung 0 dan 3. Pemain 0 punya dua langkah setara (titik dan lanjutan sama);
  // [5-1] menyisakan ujung 0 (lawan tidak punya 0), [0-6] menggantinya.
  const state = jalankan(
    [
      [k(0, 3), k(5, 1), k(0, 6)],
      [k(1, 2), k(4, 4)],
      [k(3, 6), k(2, 2)],
      [k(6, 5), k(4, 1)],
    ],
    0,
    [
      ['m', 0, k(0, 3), SISI_AWAL],
      ['l', 1],
      ['m', 2, k(3, 6), SISI_KANAN],
      ['m', 3, k(6, 5), SISI_KANAN],
    ],
  );
  assert.equal(state.giliran, 0);
  for (let benih = 1; benih <= 20; benih++) {
    const langkah = pilihLangkahSedang(state, buatAcak(benih));
    assert.equal(langkah.aksi === 'main' ? langkah.kartu.id : '', '1-5');
  }
});

test('menghindari ujung yang terbukti tidak dimiliki rekan', () => {
  // Pemain 2 (rekan) lewat saat ujung 0 dan 5. [6-1] di kiri menyisakan ujung 5; [5-2] di kanan menggantinya.
  const state = jalankan(
    [
      [k(0, 3), k(6, 1), k(5, 2), k(4, 4)],
      [k(3, 5), k(1, 1)],
      [k(1, 2), k(4, 6)],
      [k(0, 6), k(2, 6)],
    ],
    0,
    [
      ['m', 0, k(0, 3), SISI_AWAL],
      ['m', 1, k(3, 5), SISI_KANAN],
      ['l', 2],
      ['m', 3, k(0, 6), 'kiri'],
    ],
  );
  assert.equal(state.giliran, 0);
  for (let benih = 1; benih <= 20; benih++) {
    const langkah = pilihLangkahSedang(state, buatAcak(benih));
    assert.equal(langkah.aksi === 'main' ? langkah.kartu.id : '', '2-5');
  }
});

test('lewat bila tidak ada kartu legal, dan deterministik untuk benih yang sama', () => {
  const state = jalankan([[k(0, 3)], [k(1, 2)], [k(2, 4)], [k(4, 4)]], 0, [['m', 0, k(0, 3), SISI_AWAL]]);
  assert.deepEqual(pilihLangkahSedang(state, buatAcak(1)), { aksi: 'lewat', pemain: 1 });
  const bebas = jalankan([[k(0, 3), k(3, 6), k(3, 1)], [k(1, 2)], [k(2, 4)], [k(4, 4)]], 0, []);
  assert.deepEqual(pilihLangkahSedang(bebas, buatAcak(5)), pilihLangkahSedang(bebas, buatAcak(5)));
});

test('150 partai penuh dengan AI Sedang di keempat kursi: selalu legal dan selesai', () => {
  for (let benih = 1; benih <= 150; benih++) {
    const partai = mainPartaiDengan(mulaiPartai([0, 0]), sedang, buatAcak(benih));
    assert.equal(partai.status, 'selesai');
  }
});

test('AI Sedang jauh lebih kuat dari AI Mudah (kursi ditukar bergantian)', () => {
  const jumlah = 300;
  let menang = 0;
  for (let i = 0; i < jumlah; i++) {
    const genap = i % 2 === 0;
    const kebijakan: EmpatKebijakan = genap
      ? [pilihLangkahSedang, pilihLangkahAcak, pilihLangkahSedang, pilihLangkahAcak]
      : [pilihLangkahAcak, pilihLangkahSedang, pilihLangkahAcak, pilihLangkahSedang];
    const partai = mainPartaiDengan(mulaiPartai([0, 0]), kebijakan, buatAcak(777 + i));
    if (partai.status !== 'selesai') throw new Error('partai tidak selesai');
    if (partai.pemenang.menang === (genap ? 0 : 1)) menang++;
  }
  // Terukur sekitar 80%; batasnya longgar supaya tes tidak rapuh.
  assert.ok(menang / jumlah >= 0.65, `Sedang hanya menang ${menang}/${jumlah}`);
});

test('kontrol: acak melawan acak kira-kira seimbang (alat ukur tidak condong)', () => {
  let menang = 0;
  const jumlah = 300;
  for (let i = 0; i < jumlah; i++) {
    const partai = mainPartaiDengan(mulaiPartai([0, 0]), acakSemua, buatAcak(999 + i));
    if (partai.status !== 'selesai') throw new Error('partai tidak selesai');
    if (partai.pemenang.menang === 0) menang++;
  }
  assert.ok(menang / jumlah > 0.35 && menang / jumlah < 0.65, `tim 0 menang ${menang}/${jumlah}`);
});

test('controller: tingkat sedang tersedia dan memainkan partai sampai selesai bersama manusia', () => {
  assert.ok(AI_TERSEDIA.some((a) => a === 'sedang'));
  const acak = buatAcak(42);
  let partai: Partai = bagiKocokan(mulaiPartai([0, 0]), acak);
  for (let i = 0; i < 20000 && partai.status !== 'selesai'; i++) {
    if (partai.status !== STATUS_BERJALAN) {
      partai = partai.status === STATUS_RINGKASAN ? lanjutkanPartai(partai) : bagiKocokan(partai, acak);
      continue;
    }
    if (menungguManusia(partai)) {
      const { kartu, sisi } = ada(kartuLegalPemain(partai.kocokan, 0)[0]);
      partai = mainkanManusia(partai, kartu.id, ada(sisi[0]));
    } else {
      partai = langkahOtomatis(partai, acak, 'sedang');
    }
  }
  assert.equal(partai.status, 'selesai');
});

test('AI Sedang hanya memakai tangan sendiri dan riwayat meja: menukar tangan pemain lain tidak mengubah pilihan', () => {
  let diuji = 0;
  for (let benih = 1; benih <= 40; benih++) {
    const acak = buatAcak(benih);
    let partai: Partai = bagiKocokan(mulaiPartai([0, 0]), acak);
    for (let i = 0; i < 400 && partai.status !== 'selesai'; i++) {
      if (partai.status === STATUS_BERJALAN) {
        const { kocokan } = partai;
        const saya = kocokan.giliran;
        const lain = [0, 1, 2, 3].filter((n) => n !== saya).map((n) => nomor(n));
        const t = kocokan.tangan;
        // Tangan ketiga pemain lain diputar (jumlah kartu tiap pemain ikut bertukar, tapi pilihan harus sama).
        const tukar = empat(
          ...[0, 1, 2, 3].map((n) => {
            const idx = lain.indexOf(nomor(n));
            if (idx === -1) return [...ada(t[saya])];
            return [...ada(t[ada(lain[(idx + 1) % lain.length])])];
          }),
        );
        const asli = pilihLangkahSedang(kocokan, buatAcak(benih * 1000 + i));
        const ditukar = pilihLangkahSedang({ ...kocokan, tangan: tukar }, buatAcak(benih * 1000 + i));
        assert.deepEqual(ditukar, asli, `benih ${benih}, langkah ${i}: pilihan berubah ketika tangan lawan/rekan ditukar`);
        diuji++;
      }
      partai = langkahAcakPartai(partai, acak);
    }
  }
  assert.ok(diuji > 1000, `hanya ${diuji} keadaan diuji`);
});
