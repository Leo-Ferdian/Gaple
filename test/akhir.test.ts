import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buatKartu } from '../src/engine.ts';
import { SISI_AWAL, SISI_KIRI } from '../src/meja.ts';
import { mulaiKocokan, mainkan, lewat } from '../src/kocokan.ts';
import { jalankan, habisBiasa, habisDouble, habisTriplet, habisQuartet, tabrak } from '../bantu/skenario.ts';
import { akhirKocokan, jenisBonus } from '../src/akhir.ts';

const k = buatKartu;

// ---------------------------------------------------------------------------
// akhirKocokan
// ---------------------------------------------------------------------------

test('kocokan yang baru mulai belum berakhir', () => {
  const state = mulaiKocokan([[k(1, 2)], [k(3, 4)], [k(5, 6)], [k(0, 0)]], 0);
  assert.equal(akhirKocokan(state), null);
});

test('kocokan yang masih bisa dilanjutkan belum berakhir', () => {
  const state = jalankan(
    [
      [k(1, 2), k(1, 1)],
      [k(2, 3), k(4, 4)],
      [k(5, 6), k(0, 0)],
      [k(3, 4), k(6, 6)],
    ],
    0,
    [['m', 0, k(1, 2), SISI_AWAL]],
  );
  assert.equal(akhirKocokan(state), null);
});

test('habis: pemain yang kartunya kosong adalah penutup', () => {
  assert.deepEqual(akhirKocokan(habisBiasa()), { akhir: 'habis', penutup: 0 });
  assert.deepEqual(akhirKocokan(habisDouble()), { akhir: 'habis', penutup: 3 });
  assert.deepEqual(akhirKocokan(habisTriplet()), { akhir: 'habis', penutup: 1 });
  assert.deepEqual(akhirKocokan(habisQuartet()), { akhir: 'habis', penutup: 3 });
});

test('tabrak: tidak ada yang bisa main sesudah ada kartu di meja', () => {
  assert.deepEqual(akhirKocokan(tabrak(k(3, 3))), { akhir: 'tabrak' });
});

test('belum tabrak bila salah satu pemain masih punya kartu cocok', () => {
  // Ujung 1 dan 2. Timur punya 2-6 yang cocok.
  assert.equal(akhirKocokan(tabrak(k(2, 6))), null);
});

// ---------------------------------------------------------------------------
// Bonus
// ---------------------------------------------------------------------------

test('jenisBonus: tanpa bonus, double, triplet, quartet', () => {
  assert.equal(jenisBonus(habisBiasa(), 0), null);
  assert.equal(jenisBonus(habisDouble(), 3), 'double');
  assert.equal(jenisBonus(habisTriplet(), 1), 'triplet');
  assert.equal(jenisBonus(habisQuartet(), 3), 'quartet');
});

test('jenisBonus menolak pemain yang bukan penutup', () => {
  assert.throws(() => jenisBonus(habisDouble(), 2), Error);
});

test('jenisBonus menolak state tanpa langkah', () => {
  const state = mulaiKocokan([[k(1, 2)], [k(3, 4)], [k(5, 6)], [k(0, 0)]], 0);
  assert.throws(() => jenisBonus(state, 0), Error);
});

// ---------------------------------------------------------------------------
// Setelah berakhir, tidak ada langkah lagi
// ---------------------------------------------------------------------------

test('mainkan dan lewat ditolak setelah kocokan habis', () => {
  const state = habisDouble();
  assert.throws(() => lewat(state, state.giliran), /sudah berakhir/);
  assert.throws(() => mainkan(state, state.giliran, k(6, 6), SISI_KIRI), /sudah berakhir/);
});

test('mainkan dan lewat ditolak setelah kocokan tabrak', () => {
  const state = tabrak(k(3, 3));
  assert.throws(() => lewat(state, state.giliran), /sudah berakhir/);
});
