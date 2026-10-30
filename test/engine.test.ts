import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  ANGKA_TERBESAR,
  JUMLAH_KARTU,
  JUMLAH_PEMAIN,
  KARTU_PER_PEMAIN,
  buatKartu,
  nilaiKartu,
  adalahBalak,
  buatDek,
  kocok,
  bagi,
} from '../src/engine.ts';
import { buatAcak } from '../src/rng.ts';

// ---------------------------------------------------------------------------
// Kartu
// ---------------------------------------------------------------------------

test('buatKartu menyimpan sisi secara terurut, 3-1 sama dengan 1-3', () => {
  assert.deepEqual(buatKartu(3, 1), { a: 1, b: 3, id: '1-3' });
  assert.deepEqual(buatKartu(1, 3), { a: 1, b: 3, id: '1-3' });
});

test('buatKartu menolak angka di luar 0 sampai 6', () => {
  assert.throws(() => buatKartu(-1, 2), RangeError);
  assert.throws(() => buatKartu(2, 7), RangeError);
  assert.throws(() => buatKartu(1.5, 2), RangeError);
});

test('nilaiKartu menjumlahkan titik kedua sisi', () => {
  assert.equal(nilaiKartu(buatKartu(0, 0)), 0);
  assert.equal(nilaiKartu(buatKartu(2, 5)), 7);
  assert.equal(nilaiKartu(buatKartu(6, 6)), 12);
});

test('adalahBalak benar hanya untuk kartu dengan sisi sama', () => {
  assert.equal(adalahBalak(buatKartu(4, 4)), true);
  assert.equal(adalahBalak(buatKartu(4, 5)), false);
});

// ---------------------------------------------------------------------------
// Dek
// ---------------------------------------------------------------------------

test('dek berisi tepat 28 kartu unik', () => {
  const dek = buatDek();
  assert.equal(dek.length, JUMLAH_KARTU);
  assert.equal(new Set(dek.map((k) => k.id)).size, JUMLAH_KARTU);
});

test('tiap angka 0 sampai 6 muncul di tepat 7 kartu', () => {
  const dek = buatDek();
  for (let angka = 0; angka <= ANGKA_TERBESAR; angka++) {
    const jumlah = dek.filter((k) => k.a === angka || k.b === angka).length;
    assert.equal(jumlah, 7, `angka ${angka} muncul di ${jumlah} kartu`);
  }
});

test('dek berisi 7 balak dan total titik seluruh kartu 168', () => {
  const dek = buatDek();
  assert.equal(dek.filter(adalahBalak).length, 7);
  const total = dek.reduce((jumlah, k) => jumlah + nilaiKartu(k), 0);
  assert.equal(total, 168); // tiap angka muncul 7 kali: (0+1+...+6) x 8 = 168
});

// ---------------------------------------------------------------------------
// Kocok
// ---------------------------------------------------------------------------

test('kocok tidak mengubah dek asli', () => {
  const dek = buatDek();
  const salinan = [...dek];
  kocok(dek, buatAcak(1));
  assert.deepEqual(dek, salinan);
});

test('kocok menghasilkan kartu yang sama, hanya urutannya berbeda', () => {
  const dek = buatDek();
  const hasil = kocok(dek, buatAcak(99));
  assert.equal(hasil.length, JUMLAH_KARTU);
  assert.deepEqual(hasil.map((k) => k.id).sort(), dek.map((k) => k.id).sort());
  assert.notDeepEqual(hasil, dek); // urutan berubah (sangat tidak mungkin sama)
});

test('benih yang sama menghasilkan kocokan yang sama', () => {
  const dek = buatDek();
  assert.deepEqual(kocok(dek, buatAcak(5)), kocok(dek, buatAcak(5)));
});

test('benih berbeda menghasilkan kocokan berbeda', () => {
  const dek = buatDek();
  assert.notDeepEqual(kocok(dek, buatAcak(5)), kocok(dek, buatAcak(6)));
});

test('kocokan cukup acak: kartu pertama tidak selalu sama untuk 200 benih', () => {
  const dek = buatDek();
  const kartuPertama = new Set<string>();
  for (let benih = 1; benih <= 200; benih++) {
    kartuPertama.add(kocok(dek, buatAcak(benih)).at(0)?.id ?? 'kosong');
  }
  assert.ok(kartuPertama.size > 15, `kartu pertama hanya ${kartuPertama.size} jenis`);
});

// ---------------------------------------------------------------------------
// Bagi
// ---------------------------------------------------------------------------

test('bagi menghasilkan 4 tangan berisi 7 kartu', () => {
  const tangan = bagi(kocok(buatDek(), buatAcak(3)));
  assert.equal(tangan.length, JUMLAH_PEMAIN);
  for (const t of tangan) assert.equal(t.length, KARTU_PER_PEMAIN);
});

test('bagi membagi habis 28 kartu tanpa kartu ganda atau hilang', () => {
  for (let benih = 1; benih <= 50; benih++) {
    const tangan = bagi(kocok(buatDek(), buatAcak(benih)));
    const semua = tangan.flat().map((k) => k.id);
    assert.equal(semua.length, JUMLAH_KARTU);
    assert.equal(new Set(semua).size, JUMLAH_KARTU);
  }
});

test('bagi menolak dek yang tidak berisi 28 kartu', () => {
  assert.throws(() => bagi(buatDek().slice(0, 27)), RangeError);
  assert.throws(() => bagi([]), RangeError);
});
