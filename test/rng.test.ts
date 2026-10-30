import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buatAcak, buatBenihBaru } from '../src/rng.ts';

test('benih yang sama menghasilkan urutan angka yang sama', () => {
  const a = buatAcak(42);
  const b = buatAcak(42);
  for (let i = 0; i < 100; i++) {
    assert.equal(a(), b());
  }
});

test('benih berbeda menghasilkan urutan berbeda', () => {
  const a = buatAcak(1);
  const b = buatAcak(2);
  const urutanA = Array.from({ length: 10 }, () => a());
  const urutanB = Array.from({ length: 10 }, () => b());
  assert.notDeepEqual(urutanA, urutanB);
});

test('semua angka berada di rentang 0 sampai kurang dari 1', () => {
  const acak = buatAcak(7);
  for (let i = 0; i < 10000; i++) {
    const x = acak();
    assert.ok(x >= 0 && x < 1, `angka di luar rentang: ${x}`);
  }
});

test('rata-rata 10.000 angka mendekati 0,5', () => {
  const acak = buatAcak(2024);
  let jumlah = 0;
  for (let i = 0; i < 10000; i++) jumlah += acak();
  const rata = jumlah / 10000;
  assert.ok(Math.abs(rata - 0.5) < 0.02, `rata-rata terlalu jauh dari 0,5: ${rata}`);
});

test('buatBenihBaru mengembalikan bilangan bulat', () => {
  assert.ok(Number.isInteger(buatBenihBaru()));
});
