import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buatKartu, buatDek, kocok, bagi, JUMLAH_KARTU } from '../src/engine.ts';
import { buatAcak } from '../src/rng.ts';
import { SISI_AWAL, SISI_KIRI, SISI_KANAN, teksMeja } from '../src/meja.ts';
import { mulaiKocokan, mainkan, lewat, giliranBerikutnya, timPemain } from '../src/kocokan.ts';
import { akhirSementara, mainAcakSampaiSelesai } from '../src/simulasi.ts';
import { empat, nomor, ada } from '../bantu/bantuan-tes.ts';

const k = buatKartu;

// Tangan kecil buatan sendiri supaya skenario mudah diikuti.
const tanganContoh = () =>
  empat(
    [k(3, 3), k(0, 1)], // 0 Selatan
    [k(3, 5), k(2, 2)], // 1 Barat
    [k(5, 6), k(6, 6)], // 2 Utara (6-6 menjaga kocokan tetap berjalan di skenario)
    [k(0, 0), k(4, 4)], // 3 Timur
  );

test('giliranBerikutnya berputar 0, 1, 2, 3, lalu kembali ke 0', () => {
  assert.deepEqual(([0, 1, 2, 3] as const).map(giliranBerikutnya), [1, 2, 3, 0]);
});

test('timPemain: 0 dan 2 satu tim, 1 dan 3 tim lawan', () => {
  assert.deepEqual(([0, 1, 2, 3] as const).map(timPemain), [0, 1, 0, 1]);
});

test('mulaiKocokan menyiapkan meja kosong dan giliran pembuka', () => {
  const state = mulaiKocokan(tanganContoh(), 2);
  assert.equal(state.giliran, 2);
  assert.equal(teksMeja(state.meja), '(kosong)');
  assert.deepEqual(state.riwayat, []);
});

test('mulaiKocokan menolak jumlah tangan atau pembuka yang salah', () => {
  // @ts-expect-error sengaja salah: hanya tiga tangan
  assert.throws(() => mulaiKocokan(tanganContoh().slice(0, 3), 0), RangeError);
  // @ts-expect-error sengaja salah: nomor pemain di luar 0 sampai 3
  assert.throws(() => mulaiKocokan(tanganContoh(), 4), RangeError);
  // @ts-expect-error sengaja salah: nomor pemain di luar 0 sampai 3
  assert.throws(() => mulaiKocokan(tanganContoh(), -1), RangeError);
});

test('mulaiKocokan tidak mengubah tangan masukan', () => {
  const tangan = tanganContoh();
  const salinan = structuredClone(tangan);
  const state = mulaiKocokan(tangan, 0);
  mainkan(state, 0, k(3, 3), SISI_AWAL);
  assert.deepEqual(tangan, salinan);
});

test('mainkan: kartu keluar dari tangan, giliran maju, riwayat bertambah', () => {
  const awal = mulaiKocokan(tanganContoh(), 0);
  const sesudah = mainkan(awal, 0, k(3, 3), SISI_AWAL);

  assert.equal(sesudah.tangan[0].length, 1);
  assert.ok(!sesudah.tangan[0].some((x) => x.id === '3-3'));
  assert.equal(sesudah.giliran, 1);
  assert.equal(teksMeja(sesudah.meja), '[3|3]');
  assert.equal(sesudah.riwayat.length, 1);
  assert.deepEqual(sesudah.riwayat[0], {
    pemain: 0,
    aksi: 'main',
    kartu: k(3, 3),
    sisi: SISI_AWAL,
    ujungSebelum: { kiri: null, kanan: null },
  });
});

test('mainkan tidak mengubah state lama', () => {
  const awal = mulaiKocokan(tanganContoh(), 0);
  const salinan = structuredClone(awal);
  mainkan(awal, 0, k(3, 3), SISI_AWAL);
  assert.deepEqual(awal, salinan);
});

test('mainkan menolak langkah yang bukan giliran, bukan kartunya, atau ilegal', () => {
  const awal = mulaiKocokan(tanganContoh(), 0);
  const s1 = mainkan(awal, 0, k(3, 3), SISI_AWAL); // meja [3|3], giliran Barat

  assert.throws(() => mainkan(s1, 0, k(0, 1), SISI_KIRI), Error); // bukan giliran Selatan
  assert.throws(() => mainkan(s1, 1, k(5, 6), SISI_KANAN), Error); // 5-6 bukan milik Barat
  assert.throws(() => mainkan(s1, 1, k(2, 2), SISI_KANAN), Error); // 2-2 tidak cocok ujung 3
});

test('skenario: main bergantian, lalu pemain tanpa kartu cocok harus lewat', () => {
  let s = mulaiKocokan(tanganContoh(), 0);
  s = mainkan(s, 0, k(3, 3), SISI_AWAL); // [3|3]
  s = mainkan(s, 1, k(3, 5), SISI_KANAN); // [3|3][3|5]
  s = mainkan(s, 2, k(5, 6), SISI_KANAN); // [3|3][3|5][5|6]
  assert.equal(teksMeja(s.meja), '[3|3][3|5][5|6]');
  assert.equal(s.giliran, 3);

  // Ujung 3 dan 6. Timur punya 0-0 dan 4-4, tidak ada yang cocok.
  assert.throws(() => mainkan(s, 3, k(4, 4), SISI_KANAN), Error);
  s = lewat(s, 3);
  assert.equal(s.giliran, 0);
  const terakhir = ada(s.riwayat.at(-1));
  assert.equal(terakhir.aksi, 'lewat');
  assert.deepEqual(terakhir.ujungSebelum, { kiri: 3, kanan: 6 });

  // Selatan punya 0-1: ujung 3 dan 6, tidak cocok, jadi harus lewat juga.
  s = lewat(s, 0);
  assert.equal(s.giliran, 1);
});

test('lewat ditolak bila pemain masih punya kartu yang bisa dimainkan', () => {
  let s = mulaiKocokan(tanganContoh(), 0);
  s = mainkan(s, 0, k(3, 3), SISI_AWAL);
  assert.throws(() => lewat(s, 1), Error); // Barat punya 3-5
});

test('lewat ditolak di meja kosong dan saat bukan giliran', () => {
  const awal = mulaiKocokan(tanganContoh(), 0);
  assert.throws(() => lewat(awal, 0), Error); // meja kosong: semua kartu legal
  assert.throws(() => lewat(awal, 1), Error); // bukan giliran Barat
});

test('lewat tidak mengubah state lama', () => {
  let s = mulaiKocokan(tanganContoh(), 0);
  s = mainkan(s, 0, k(3, 3), SISI_AWAL);
  s = mainkan(s, 1, k(3, 5), SISI_KANAN);
  s = mainkan(s, 2, k(5, 6), SISI_KANAN);
  const salinan = structuredClone(s);
  lewat(s, 3);
  assert.deepEqual(s, salinan);
});

// ---------------------------------------------------------------------------
// Uji sapu bersih: ratusan kocokan acak, aturan tidak boleh pernah rusak.
// ---------------------------------------------------------------------------

test('300 kocokan acak selesai dengan aturan yang selalu konsisten', () => {
  for (let benih = 1; benih <= 300; benih++) {
    const acak = buatAcak(benih);
    const tangan = bagi(kocok(buatDek(), acak));
    const pembuka = nomor(benih % 4);
    const { state, akhir } = mainAcakSampaiSelesai(tangan, pembuka, acak);
    const info = `benih ${benih}`;

    // 1. Jumlah kartu tetap 28: tangan ditambah meja.
    const sisa = state.tangan.flat();
    const diMeja = state.meja.rangkaian.map((l) => l.kartu);
    assert.equal(sisa.length + diMeja.length, JUMLAH_KARTU, info);

    // 2. Tidak ada kartu ganda di antara tangan dan meja.
    const semuaId = [...sisa, ...diMeja].map((x) => x.id);
    assert.equal(new Set(semuaId).size, JUMLAH_KARTU, info);

    // 3. Kartu bersebelahan di meja selalu nyambung.
    const r = state.meja.rangkaian;
    for (let i = 0; i + 1 < r.length; i++) {
      assert.equal(ada(r[i]).kanan, ada(r[i + 1]).kiri, `${info}, posisi ${i}`);
    }
    assert.equal(state.meja.ujungKiri, ada(r[0]).kiri, info);
    assert.equal(state.meja.ujungKanan, ada(r.at(-1)).kanan, info);

    // 4. Akhirnya cocok dengan keadaan tangan.
    assert.equal(akhirSementara(state), akhir, info);
    if (akhir === 'habis') {
      assert.ok(
        state.tangan.some((t) => t.length === 0),
        info,
      );
    }

    // 5. Riwayat mencatat setiap langkah, dan jumlah kartu yang dimainkan cocok.
    const jumlahMain = state.riwayat.filter((e) => e.aksi === 'main').length;
    assert.equal(jumlahMain, r.length, info);
    assert.equal(ada(state.riwayat[0]).pemain, pembuka, info);
  }
});

test('simulasi dengan benih yang sama menghasilkan kocokan yang sama persis', () => {
  const main = () => {
    const acak = buatAcak(2026);
    return mainAcakSampaiSelesai(bagi(kocok(buatDek(), acak)), 0, acak);
  };
  assert.deepEqual(main(), main());
});
