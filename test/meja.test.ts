import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buatKartu } from '../src/engine.ts';
import { SISI_AWAL, SISI_KIRI, SISI_KANAN, buatMejaKosong, sisiLegal, kartuLegal, adaKartuLegal, letakkan, teksMeja } from '../src/meja.ts';

const k = buatKartu; // singkatan supaya pengujian mudah dibaca

// Meja bantu: satu kartu 1-3 di tengah, ujung kiri 1 dan ujung kanan 3.
const mejaSatuTiga = () => letakkan(buatMejaKosong(), k(1, 3), SISI_AWAL);

test('meja kosong: kartu apa pun hanya boleh diletakkan di sisi awal', () => {
  const meja = buatMejaKosong();
  assert.deepEqual(sisiLegal(k(2, 5), meja), [SISI_AWAL]);
  assert.deepEqual(sisiLegal(k(6, 6), meja), [SISI_AWAL]);
  assert.equal(teksMeja(meja), '(kosong)');
});

test('kartu pertama menentukan kedua ujung', () => {
  const meja = mejaSatuTiga();
  assert.equal(meja.ujungKiri, 1);
  assert.equal(meja.ujungKanan, 3);
  assert.equal(teksMeja(meja), '[1|3]');
});

test('sisiLegal membaca kecocokan dengan tiap ujung', () => {
  const meja = mejaSatuTiga(); // ujung 1 dan 3
  assert.deepEqual(sisiLegal(k(3, 5), meja), [SISI_KANAN]);
  assert.deepEqual(sisiLegal(k(0, 1), meja), [SISI_KIRI]);
  assert.deepEqual(sisiLegal(k(1, 3), meja), [SISI_KIRI, SISI_KANAN]);
  assert.deepEqual(sisiLegal(k(2, 4), meja), []);
});

test('bila kedua ujung sama, kartu yang cocok boleh di kedua sisi', () => {
  const meja = letakkan(buatMejaKosong(), k(4, 4), SISI_AWAL); // ujung 4 dan 4
  assert.deepEqual(sisiLegal(k(4, 2), meja), [SISI_KIRI, SISI_KANAN]);
});

test('menyambung di kanan memperbarui ujung kanan', () => {
  const meja = letakkan(mejaSatuTiga(), k(3, 5), SISI_KANAN);
  assert.equal(teksMeja(meja), '[1|3][3|5]');
  assert.equal(meja.ujungKiri, 1);
  assert.equal(meja.ujungKanan, 5);
});

test('menyambung di kiri memperbarui ujung kiri', () => {
  const meja = letakkan(mejaSatuTiga(), k(0, 1), SISI_KIRI);
  assert.equal(teksMeja(meja), '[0|1][1|3]');
  assert.equal(meja.ujungKiri, 0);
  assert.equal(meja.ujungKanan, 3);
});

test('balak menyambung tanpa mengubah angka ujung', () => {
  let meja = letakkan(mejaSatuTiga(), k(3, 3), SISI_KANAN);
  assert.equal(teksMeja(meja), '[1|3][3|3]');
  assert.equal(meja.ujungKanan, 3);
  meja = letakkan(meja, k(3, 6), SISI_KANAN);
  assert.equal(teksMeja(meja), '[1|3][3|3][3|6]');
  assert.equal(meja.ujungKanan, 6);
});

test('kartu yang cocok lewat sisi besarnya diputar dengan benar', () => {
  // Kartu 5-3 disimpan sebagai 3-5; di kanan ujung 3, sisi 5 menjadi ujung baru.
  const meja = letakkan(mejaSatuTiga(), k(5, 3), SISI_KANAN);
  assert.equal(teksMeja(meja), '[1|3][3|5]');
});

test('letakkan menolak kartu atau sisi yang tidak sah', () => {
  const meja = mejaSatuTiga();
  assert.throws(() => letakkan(meja, k(2, 4), SISI_KANAN), Error); // tidak cocok
  assert.throws(() => letakkan(meja, k(3, 5), SISI_KIRI), Error); // cocok kanan saja
  assert.throws(() => letakkan(meja, k(3, 5), SISI_AWAL), Error); // meja tidak kosong
});

test('letakkan tidak mengubah meja asli', () => {
  const meja = mejaSatuTiga();
  const salinan = structuredClone(meja);
  letakkan(meja, k(3, 5), SISI_KANAN);
  assert.deepEqual(meja, salinan);
});

test('kartuLegal menyaring tangan dan menyebut sisinya', () => {
  const meja = mejaSatuTiga();
  const tangan = [k(3, 5), k(2, 4), k(0, 1), k(1, 3)];
  const hasil = kartuLegal(tangan, meja);
  assert.deepEqual(
    hasil.map((h) => [h.kartu.id, h.sisi]),
    [
      ['3-5', [SISI_KANAN]],
      ['0-1', [SISI_KIRI]],
      ['1-3', [SISI_KIRI, SISI_KANAN]],
    ],
  );
});

test('adaKartuLegal salah bila tidak ada kartu yang cocok', () => {
  const meja = mejaSatuTiga();
  assert.equal(adaKartuLegal([k(2, 4), k(5, 5)], meja), false);
  assert.equal(adaKartuLegal([k(2, 4), k(3, 5)], meja), true);
  assert.equal(adaKartuLegal([], meja), false);
});
