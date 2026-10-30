import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buatKartu, buatDek, kocok, bagi } from '../src/engine.ts';
import { buatAcak } from '../src/rng.ts';
import { SISI_AWAL, SISI_KANAN } from '../src/meja.ts';
import { SYARAT_BALAK, syaratKartu, rencanaKocokanPertama, rencanaKocokanBerikutnya } from '../src/pembuka.ts';
import { mulaiKocokan, mulaiDariRencana, mainkan, lewat, kartuLegalPemain } from '../src/kocokan.ts';
import { mainAcakDariState } from '../src/simulasi.ts';
import type { RencanaPembukaan } from '../src/pembuka.ts';
import { empat, nomor as nomorPemain, ada } from '../bantu/bantuan-tes.ts';

const k = buatKartu;

const tanganContoh = () =>
  empat(
    [k(3, 3), k(0, 1), k(2, 4)], // 0 Selatan
    [k(3, 5), k(2, 2)], //          1 Barat
    [k(5, 6), k(0, 0)], //          2 Utara
    [k(4, 4), k(1, 6)], //          3 Timur
  );

// ---------------------------------------------------------------------------
// Syarat kartu pertama
// ---------------------------------------------------------------------------

test('syarat kartu: hanya kartu itu yang boleh dibuka', () => {
  const state = mulaiKocokan(tanganContoh(), 0, syaratKartu(k(0, 1)));
  assert.deepEqual(
    kartuLegalPemain(state, 0).map((p) => p.kartu.id),
    ['0-1'],
  );
  assert.throws(() => mainkan(state, 0, k(3, 3), SISI_AWAL), Error);
  const sesudah = mainkan(state, 0, k(0, 1), SISI_AWAL);
  assert.equal(sesudah.giliran, 1);
});

test('syarat balak: hanya balak yang boleh dibuka', () => {
  const state = mulaiKocokan(tanganContoh(), 0, SYARAT_BALAK);
  assert.deepEqual(
    kartuLegalPemain(state, 0).map((p) => p.kartu.id),
    ['3-3'],
  );
  assert.throws(() => mainkan(state, 0, k(2, 4), SISI_AWAL), Error);
  assert.doesNotThrow(() => mainkan(state, 0, k(3, 3), SISI_AWAL));
});

test('syarat pembuka hanya berlaku untuk kartu pertama', () => {
  let state = mulaiKocokan(tanganContoh(), 0, SYARAT_BALAK);
  state = mainkan(state, 0, k(3, 3), SISI_AWAL);
  // Barat memainkan 3-5, bukan balak: boleh, karena meja sudah tidak kosong.
  assert.deepEqual(
    kartuLegalPemain(state, 1).map((p) => p.kartu.id),
    ['3-5'],
  );
  assert.doesNotThrow(() => mainkan(state, 1, k(3, 5), SISI_KANAN));
});

test('mulaiKocokan menolak bila pembuka tidak punya kartu yang memenuhi syarat', () => {
  assert.doesNotThrow(() => mulaiKocokan(tanganContoh(), 1, SYARAT_BALAK)); // Barat punya 2-2: ada balak
  const tanpaBalak = tanganContoh();
  tanpaBalak[1] = [k(3, 5), k(1, 2)];
  assert.throws(() => mulaiKocokan(tanpaBalak, 1, SYARAT_BALAK), Error);
  assert.throws(() => mulaiKocokan(tanganContoh(), 1, syaratKartu(k(0, 1))), Error); // 0-1 milik Selatan
});

test('pembuka tidak boleh lewat di meja kosong', () => {
  const state = mulaiKocokan(tanganContoh(), 0, SYARAT_BALAK);
  assert.throws(() => lewat(state, 0), Error);
});

test('syarat pembuka ikut tersimpan di state dan tidak berubah setelah langkah', () => {
  const awal = mulaiKocokan(tanganContoh(), 0, SYARAT_BALAK);
  const sesudah = mainkan(awal, 0, k(3, 3), SISI_AWAL);
  assert.deepEqual(sesudah.syaratPembuka, SYARAT_BALAK);
});

// ---------------------------------------------------------------------------
// Dari rencana ke state
// ---------------------------------------------------------------------------

test('mulaiDariRencana: rencana poin menghasilkan state dengan pembuka dan syarat yang benar', () => {
  const hasil = mulaiDariRencana(tanganContoh(), rencanaKocokanPertama([1, 0]));
  assert.equal(hasil.status, 'siap');
  assert.equal(hasil.pembuka, 0);
  assert.equal(hasil.state.giliran, 0);
  assert.deepEqual(hasil.state.syaratPembuka, syaratKartu(k(0, 1)));
  assert.ok(hasil.alasan.length > 0);
});

test('mulaiDariRencana: rencana balak yang bergeser ke pemain berikutnya', () => {
  const tangan = tanganContoh();
  tangan[0] = [k(0, 1), k(2, 4)]; // Selatan tanpa balak
  const hasil = mulaiDariRencana(tangan, { jenis: 'balak', calon: 0 });
  assert.equal(hasil.status, 'siap');
  assert.equal(hasil.pembuka, 1); // Barat punya 2-2
  assert.equal(hasil.state.giliran, 1);
});

test('mulaiDariRencana: dua calon tanpa balak menghasilkan ulang dan tidak ada state', () => {
  const tangan = empat([k(0, 1)], [k(1, 2)], [k(5, 5)], [k(2, 3)]);
  const hasil = mulaiDariRencana(tangan, { jenis: 'balak', calon: 0 });
  assert.equal(hasil.status, 'ulang');
  assert.ok(!('state' in hasil));
  assert.equal(hasil.pembuka, 0);
});

// ---------------------------------------------------------------------------
// Rantai kocokan acak: aturan pembuka harus selalu dipatuhi
// ---------------------------------------------------------------------------

test('rantai 10 kocokan x 200 benih: pembuka dan kartu pertama selalu sesuai aturan', () => {
  let jumlahKocokan = 0;
  let jumlahUlang = 0;

  for (let benih = 1; benih <= 200; benih++) {
    const acak = buatAcak(benih);
    const poin: [number, number] = [benih % 3, (benih + 1) % 3]; // poin acak yang sah (0 sampai 2)
    let rencana: RencanaPembukaan = rencanaKocokanPertama(poin);

    for (let nomor = 1; nomor <= 10; nomor++) {
      // Bagi sampai kocokannya adil.
      let mulai = mulaiDariRencana(bagi(kocok(buatDek(), acak)), rencana);
      while (mulai.status === 'ulang') {
        jumlahUlang++;
        mulai = mulaiDariRencana(bagi(kocok(buatDek(), acak)), rencana);
      }
      jumlahKocokan++;

      const info = `benih ${benih}, kocokan ${nomor}`;
      const { state, akhir } = mainAcakDariState(mulai.state, acak);

      // Kartu pertama yang dimainkan memenuhi rencana.
      const pertama = ada(state.riwayat[0], info);
      assert.ok(pertama.aksi === 'main', info);
      assert.equal(pertama.pemain, mulai.pembuka, info);
      if (rencana.jenis === 'poin') {
        assert.equal(pertama.kartu.id, k(rencana.poin[0], rencana.poin[1]).id, info);
      } else if (rencana.jenis === 'netral') {
        assert.equal(pertama.kartu.id, '0-0', info);
      } else {
        assert.equal(pertama.kartu.a, pertama.kartu.b, info); // balak
        const berikutnya = nomorPemain((rencana.calon + 1) % 4);
        assert.ok(pertama.pemain === rencana.calon || pertama.pemain === berikutnya, info);
      }

      // Rencana untuk kocokan berikutnya.
      if (akhir === 'habis') {
        const penutup = nomorPemain(state.tangan.findIndex((t) => t.length === 0));
        rencana = rencanaKocokanBerikutnya({ akhir, penutup });
        assert.deepEqual(rencana, { jenis: 'balak', calon: penutup }, info);
      } else {
        rencana = rencanaKocokanBerikutnya({ akhir, tangan: state.tangan });
        assert.ok(rencana.jenis === 'balak' || rencana.jenis === 'netral', info);
      }
    }
  }

  assert.equal(jumlahKocokan, 2000);
  assert.ok(jumlahUlang < 40, `kocokan ulang terlalu sering: ${jumlahUlang}`);
});
