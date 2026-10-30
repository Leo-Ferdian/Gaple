import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buatAcak } from '../src/rng.ts';
import { STATUS_SIAP, STATUS_SELESAI, bagiKocokan } from '../src/partai.ts';
import {
  FORMAT_BO3,
  FORMAT_BO5,
  TARGET_POIN,
  mulaiPertandingan,
  mulaiPartaiBerikutnya,
  ubahPartai,
  catatPartai,
} from '../src/pertandingan.ts';
import { mainAcakPartai, mainAcakPertandingan } from '../src/simulasi.ts';
import type { NomorTim } from '../src/engine.ts';
import { ada } from '../bantu/bantuan-tes.ts';

const lawan = (tim: NomorTim): NomorTim => (tim === 0 ? 1 : 0);

// ---------------------------------------------------------------------------
// Memulai
// ---------------------------------------------------------------------------

test('target poin: bo3 = 2, bo5 = 3', () => {
  assert.deepEqual(TARGET_POIN, { bo3: 2, bo5: 3 });
  assert.equal(mulaiPertandingan(FORMAT_BO3).target, 2);
  assert.equal(mulaiPertandingan(FORMAT_BO5).target, 3);
});

test('mulaiPertandingan: poin 0-0, belum ada partai, belum ada juara', () => {
  const p = mulaiPertandingan(FORMAT_BO5);
  assert.deepEqual(p.poin, [0, 0]);
  assert.equal(p.partai, null);
  assert.equal(p.juara, null);
  assert.deepEqual(p.riwayatPartai, []);
});

test('mulaiPertandingan menolak format yang tidak dikenal', () => {
  // @ts-expect-error sengaja salah: format tidak dikenal
  assert.throws(() => mulaiPertandingan('bo7'), RangeError);
  // @ts-expect-error sengaja salah: tanpa format
  assert.throws(() => mulaiPertandingan(undefined), RangeError);
  // @ts-expect-error sengaja salah: nama bawaan objek, bukan format
  assert.throws(() => mulaiPertandingan('toString'), RangeError);
});

// ---------------------------------------------------------------------------
// Alur dan penjaga
// ---------------------------------------------------------------------------

test('mulaiPartaiBerikutnya membuat partai dengan poin saat ini', () => {
  const p = mulaiPartaiBerikutnya(mulaiPertandingan(FORMAT_BO3));
  assert.equal(p.partai?.status, STATUS_SIAP);
  assert.deepEqual(p.partai?.poin, [0, 0]);
});

test('urutan yang salah melempar Error', () => {
  const baru = mulaiPertandingan(FORMAT_BO3);
  assert.throws(() => ubahPartai(baru, (x) => x), /Tidak ada partai/);
  assert.throws(() => catatPartai(baru), /belum selesai/);

  const berjalan = mulaiPartaiBerikutnya(baru);
  assert.throws(() => mulaiPartaiBerikutnya(berjalan), /belum dicatat/);
  assert.throws(() => catatPartai(berjalan), /belum selesai/);
});

test('ubahPartai dan catatPartai tidak mengubah pertandingan lama', () => {
  const acak = buatAcak(9);
  const awal = mulaiPartaiBerikutnya(mulaiPertandingan(FORMAT_BO3));
  const salinan = structuredClone(awal);
  const sedang = ubahPartai(awal, (partai) => bagiKocokan(partai, acak));
  assert.deepEqual(awal, salinan);
  assert.notEqual(sedang.partai, awal.partai);

  const selesai = ubahPartai(awal, (partai) => mainAcakPartai(partai, acak));
  assert.equal(selesai.partai?.status, STATUS_SELESAI);
  const salinan2 = structuredClone(selesai);
  catatPartai(selesai);
  assert.deepEqual(selesai, salinan2);
});

test('catatPartai menambah poin pemenang dan mengosongkan partai', () => {
  const acak = buatAcak(15);
  let p = mulaiPartaiBerikutnya(mulaiPertandingan(FORMAT_BO5));
  p = ubahPartai(p, (partai) => mainAcakPartai(partai, acak));
  assert.ok(p.partai?.status === STATUS_SELESAI);
  const menang = p.partai.pemenang.menang;
  const markahAkhir = [...p.partai.markah];

  p = catatPartai(p);
  assert.equal(p.partai, null);
  assert.equal(p.poin[menang], 1);
  assert.equal(p.poin[lawan(menang)], 0);
  assert.equal(p.juara, null); // bo5 belum selesai setelah satu partai
  assert.equal(p.riwayatPartai.length, 1);
  const catatan = ada(p.riwayatPartai[0]);
  assert.deepEqual(catatan.poinAwal, [0, 0]);
  assert.deepEqual(catatan.markahAkhir, markahAkhir);
  assert.equal(catatan.menang, menang);

  // Partai kedua dimulai dengan poin baru.
  const kedua = mulaiPartaiBerikutnya(p);
  assert.deepEqual(kedua.partai?.poin, p.poin);
});

test('pertandingan yang sudah ada juaranya menolak partai baru', () => {
  const selesai = mainAcakPertandingan(FORMAT_BO3, buatAcak(2));
  assert.notEqual(selesai.juara, null);
  assert.throws(() => mulaiPartaiBerikutnya(selesai), /sudah selesai/);
});

// ---------------------------------------------------------------------------
// Pertandingan penuh
// ---------------------------------------------------------------------------

for (const format of [FORMAT_BO3, FORMAT_BO5] as const) {
  test(`200 pertandingan ${format} acak: juara, poin, dan riwayat selalu konsisten`, () => {
    const target = TARGET_POIN[format];
    const hitungJuara: [number, number] = [0, 0];

    for (let benih = 1; benih <= 200; benih++) {
      const p = mainAcakPertandingan(format, buatAcak(benih));
      const info = `${format}, benih ${benih}`;

      assert.ok(p.juara === 0 || p.juara === 1, info);
      hitungJuara[p.juara]++;
      assert.equal(p.poin[p.juara], target, info);
      assert.ok(p.poin[lawan(p.juara)] < target, info);
      assert.equal(p.partai, null, info);

      // Banyak partai: dari target sampai 2 * target - 1.
      assert.equal(p.riwayatPartai.length, p.poin[0] + p.poin[1], info);
      assert.ok(p.riwayatPartai.length >= target && p.riwayatPartai.length <= 2 * target - 1, info);

      // Riwayat: poin awal tiap partai cocok dengan hasil partai sebelumnya.
      const poin: [number, number] = [0, 0];
      p.riwayatPartai.forEach((partai, i) => {
        assert.equal(partai.nomor, i + 1, info);
        assert.deepEqual(partai.poinAwal, poin, info);
        assert.ok(partai.markahAkhir[partai.menang] < 100, info); // pemenang masih di bawah 100
        assert.ok(partai.markahAkhir[lawan(partai.menang)] >= 100, info); // yang kalah mencapai 100
        poin[partai.menang]++;
        // Hanya partai terakhir yang boleh membuat seseorang mencapai target.
        const adaYangTarget = poin.some((x) => x >= target);
        assert.equal(adaYangTarget, i === p.riwayatPartai.length - 1, `${info}, partai ${i + 1}`);
      });
      assert.deepEqual(poin, p.poin, info);
    }

    // Kedua tim sama kuat (pemain acak), jadi masing-masing harus pernah juara.
    assert.ok(hitungJuara[0] > 50 && hitungJuara[1] > 50, JSON.stringify(hitungJuara));
  });
}

test('mainAcakPertandingan berhenti dengan error bila melebihi batas partai', () => {
  assert.throws(() => mainAcakPertandingan(FORMAT_BO5, buatAcak(1), 2), /tidak selesai/);
});
