import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buatKartu, buatDek, kocok, bagi, nilaiKartu, adalahBalak, timPemain } from '../src/engine.ts';
import { buatAcak } from '../src/rng.ts';
import { adaKartuLegal } from '../src/meja.ts';
import { mulaiDariRencana } from '../src/kocokan.ts';
import { rencanaKocokanPertama } from '../src/pembuka.ts';
import type { RencanaPembukaan } from '../src/pembuka.ts';
import { ada } from '../bantu/bantuan-tes.ts';
import { mainAcakDariState } from '../src/simulasi.ts';
import { BATAS_MARKAH, BONUS, hitungHasil, terapkanHasil, pemenangPartai } from '../src/markah.ts';
import type { Markah } from '../src/markah.ts';
import type { Kartu, NomorTim } from '../src/engine.ts';
import { habisBiasa, habisDouble, habisTriplet, habisQuartet, tabrak } from '../bantu/skenario.ts';

const k = buatKartu;

// ---------------------------------------------------------------------------
// Konstanta
// ---------------------------------------------------------------------------

test('batas markah dan nilai bonus sesuai brief', () => {
  assert.equal(BATAS_MARKAH, 100);
  assert.deepEqual(BONUS, { double: 20, triplet: 30, quartet: 50 });
});

// ---------------------------------------------------------------------------
// Hasil habis
// ---------------------------------------------------------------------------

test('habis tanpa bonus: lawan menerima sisa titik kedua pemainnya, rekan penutup tidak dihitung', () => {
  const hasil = hitungHasil(habisBiasa());
  // Selatan menutup (tim 0). Lawan: Barat 3-5 + 1-1 = 10, Timur 0-4 = 4. Utara (rekan) pegang 6-6 tapi tidak dihitung.
  assert.equal(hasil.akhir, 'habis');
  assert.equal(hasil.penutup, 0);
  assert.equal(hasil.timKena, 1);
  assert.equal(hasil.bonus, null);
  assert.deepEqual(hasil.tambahan, [0, 14]);
  assert.deepEqual(hasil.titikSisa, [12, 14]);
  assert.deepEqual(hasil.rencanaBerikutnya, { jenis: 'balak', calon: 0 });
});

test('habis dengan double: sisa titik lawan ditambah 20', () => {
  const hasil = hitungHasil(habisDouble());
  // Timur menutup (tim 1). Lawan: Selatan 6-6 = 12, Utara 5-6 = 11, total 23.
  assert.deepEqual(hasil.bonus, { jenis: 'double', nilai: 20 });
  assert.equal(hasil.timKena, 0);
  assert.deepEqual(hasil.tambahan, [43, 0]);
  assert.deepEqual(hasil.rencanaBerikutnya, { jenis: 'balak', calon: 3 });
});

test('habis dengan triplet: sisa titik lawan ditambah 30', () => {
  const hasil = hitungHasil(habisTriplet());
  // Barat menutup (tim 1). Lawan: Selatan 6-6 = 12, Utara 0-1 = 1, total 13.
  assert.deepEqual(hasil.bonus, { jenis: 'triplet', nilai: 30 });
  assert.deepEqual(hasil.tambahan, [43, 0]);
});

test('habis dengan quartet: contoh dari brief, 22 + 50 = 72', () => {
  const hasil = hitungHasil(habisQuartet());
  // Timur menutup. Lawan memegang 5-5 (10) dan 6-6 (12).
  assert.deepEqual(hasil.titikSisa, [22, hasil.titikSisa[1]]);
  assert.deepEqual(hasil.bonus, { jenis: 'quartet', nilai: 50 });
  assert.deepEqual(hasil.tambahan, [72, 0]);
});

// ---------------------------------------------------------------------------
// Hasil tabrak
// ---------------------------------------------------------------------------

test('tabrak: tim dengan titik sisa lebih banyak kalah dan markahnya bertambah sebesar totalnya', () => {
  // Tim 0 = 5-5 + 4-4 = 18. Tim 1 = 6-6 + 3-4 = 19.
  const hasil = hitungHasil(tabrak(k(3, 4)));
  assert.equal(hasil.akhir, 'tabrak');
  assert.equal(hasil.penutup, undefined);
  assert.equal(hasil.seri, false);
  assert.equal(hasil.timKena, 1);
  assert.deepEqual(hasil.titikSisa, [18, 19]);
  assert.deepEqual(hasil.tambahan, [0, 19]);
  assert.equal(hasil.bonus, null);
  // Tim 0 menang, calon pembuka = Utara (8 titik) karena lebih sedikit dari Selatan (10).
  assert.deepEqual(hasil.rencanaBerikutnya, { jenis: 'balak', calon: 2 });
});

test('tabrak: tim 0 yang kalah', () => {
  // Tim 0 = 5-5 (10) + 5-6 (11) = 21. Tim 1 = 6-6 (12) + 3-3 (6) = 18.
  const hasil = hitungHasil(tabrak(k(3, 3), k(5, 6)));
  assert.equal(hasil.timKena, 0);
  assert.deepEqual(hasil.tambahan, [21, 0]);
  // Tim 1 menang, calon = Timur (6 titik) karena lebih sedikit dari Barat (12).
  assert.deepEqual(hasil.rencanaBerikutnya, { jenis: 'balak', calon: 3 });
});

test('tabrak seri: tidak ada markah dan kocokan berikutnya netral', () => {
  // Tim 0 = 10 + 8 = 18. Tim 1 = 12 + 6 = 18.
  const hasil = hitungHasil(tabrak(k(3, 3)));
  assert.equal(hasil.seri, true);
  assert.equal(hasil.timKena, null);
  assert.deepEqual(hasil.tambahan, [0, 0]);
  assert.deepEqual(hasil.rencanaBerikutnya, { jenis: 'netral' });
});

test('hitungHasil menolak kocokan yang belum berakhir', () => {
  const berjalan = tabrak(k(2, 6)); // Timur masih punya kartu cocok
  assert.throws(() => hitungHasil(berjalan), /belum berakhir/);
});

// ---------------------------------------------------------------------------
// Markah dan pemenang partai
// ---------------------------------------------------------------------------

test('terapkanHasil menambah markah tanpa mengubah markah lama', () => {
  const lama: Markah = [10, 30];
  const baru = terapkanHasil(lama, hitungHasil(habisDouble()));
  assert.deepEqual(baru, [53, 30]);
  assert.deepEqual(lama, [10, 30]);
});

test('terapkanHasil pada tabrak seri tidak mengubah markah', () => {
  assert.deepEqual(terapkanHasil([40, 55], hitungHasil(tabrak(k(3, 3)))), [40, 55]);
});

test('pemenangPartai: belum selesai selama kedua markah di bawah 100', () => {
  assert.equal(pemenangPartai([0, 0]), null);
  assert.equal(pemenangPartai([99, 99]), null);
});

test('pemenangPartai: tim yang markahnya mencapai 100 atau lebih kalah', () => {
  assert.deepEqual(pemenangPartai([100, 0]), { kalah: 0, menang: 1 });
  assert.deepEqual(pemenangPartai([20, 131]), { kalah: 1, menang: 0 });
});

test('pemenangPartai menolak markah yang tidak sah atau kedua tim melewati batas', () => {
  assert.throws(() => pemenangPartai([100, 100]), Error);
  // @ts-expect-error sengaja salah: hanya satu markah
  assert.throws(() => pemenangPartai([0]), RangeError);
  assert.throws(() => pemenangPartai([-1, 0]), RangeError);
  assert.throws(() => pemenangPartai([1.5, 0]), RangeError);
  // @ts-expect-error sengaja salah: bukan pasangan angka
  assert.throws(() => terapkanHasil('00', hitungHasil(habisBiasa())), RangeError);
});

// ---------------------------------------------------------------------------
// Uji sifat pada kocokan acak
// ---------------------------------------------------------------------------

const titikTangan = (tangan: readonly Kartu[]): number => tangan.reduce((jumlah, kartu) => jumlah + nilaiKartu(kartu), 0);

test('1500 kocokan acak: hasil habis dan tabrak selalu sesuai aturan', () => {
  const hitung = { habis: 0, tabrak: 0, seri: 0, double: 0, triplet: 0, quartet: 0 };

  for (let benih = 1; benih <= 1500; benih++) {
    const acak = buatAcak(benih);
    const awal = mulaiDariRencana(bagi(kocok(buatDek(), acak)), rencanaKocokanPertama([0, 0]));
    assert.ok(awal.status === 'siap', 'poin 0-0 selalu siap');
    const { state, akhir } = mainAcakDariState(awal.state, acak);
    const hasil = hitungHasil(state);
    const info = `benih ${benih}`;

    // Titik sisa dihitung ulang dengan cara lain.
    const sisa: [number, number] = [0, 0];
    for (const pemain of [0, 1, 2, 3] as const) sisa[timPemain(pemain)] += titikTangan(state.tangan[pemain]);
    assert.deepEqual(hasil.titikSisa, sisa, info);
    assert.equal(hasil.akhir, akhir, info);
    assert.ok(
      hasil.tambahan.every((t) => Number.isInteger(t) && t >= 0),
      info,
    );

    if (hasil.akhir === 'habis') {
      hitung.habis++;
      const kosong = state.tangan.map((t, p) => (t.length === 0 ? p : -1)).filter((p) => p !== -1);
      assert.deepEqual(kosong, [hasil.penutup], info); // tepat satu penutup
      assert.equal(hasil.timKena, 1 - timPemain(hasil.penutup), info);
      assert.equal(hasil.tambahan[timPemain(hasil.penutup)], 0, info);

      // Bonus dihitung ulang dari meja dan kartu terakhir.
      const terakhir = ada(state.riwayat.at(-1));
      assert.ok(terakhir.aksi === 'main', info);
      assert.equal(terakhir.pemain, hasil.penutup, info);
      const balak = adalahBalak(terakhir.kartu);
      const sama = state.meja.ujungKiri === state.meja.ujungKanan;
      const harapan = balak && sama ? 'quartet' : balak ? 'triplet' : sama ? 'double' : null;
      assert.equal(hasil.bonus ? hasil.bonus.jenis : null, harapan, info);
      if (harapan) hitung[harapan]++;

      assert.equal(hasil.tambahan[hasil.timKena], sisa[hasil.timKena] + (harapan ? BONUS[harapan] : 0), info);
      assert.deepEqual(hasil.rencanaBerikutnya, { jenis: 'balak', calon: hasil.penutup }, info);
    } else {
      hitung.tabrak++;
      assert.equal(hasil.bonus, null, info);
      assert.ok(
        state.tangan.every((t) => t.length > 0),
        info,
      );
      assert.ok(
        state.tangan.every((t) => !adaKartuLegal(t, state.meja)),
        info,
      ); // benar-benar buntu

      if (sisa[0] === sisa[1]) {
        hitung.seri++;
        assert.equal(hasil.seri, true, info);
        assert.deepEqual(hasil.tambahan, [0, 0], info);
        assert.deepEqual(hasil.rencanaBerikutnya, { jenis: 'netral' }, info);
      } else {
        const kalah: NomorTim = sisa[0] > sisa[1] ? 0 : 1;
        assert.equal(hasil.seri, false, info);
        assert.equal(hasil.timKena, kalah, info);
        assert.equal(hasil.tambahan[kalah], sisa[kalah], info);
        assert.equal(hasil.tambahan[kalah === 0 ? 1 : 0], 0, info);
        assert.ok(hasil.rencanaBerikutnya.jenis === 'balak', info);
        assert.equal(timPemain(hasil.rencanaBerikutnya.calon), kalah === 0 ? 1 : 0, info); // calon dari tim pemenang
      }
    }
  }

  // Perkiraan dari uji 3000 kocokan: habis ~76%, tabrak ~24%, seri ~1,6%.
  assert.ok(hitung.habis > 900 && hitung.habis < 1300, `habis: ${hitung.habis}`);
  assert.ok(hitung.tabrak > 200 && hitung.tabrak < 600, `tabrak: ${hitung.tabrak}`);
  assert.ok(hitung.double > 0 && hitung.triplet > 0 && hitung.quartet > 0, JSON.stringify(hitung));
  assert.ok(hitung.seri > 0, JSON.stringify(hitung));
});

test('300 partai acak: selalu berakhir, hanya satu tim yang kalah, markah tidak pernah turun', () => {
  let totalKocokan = 0;

  for (let benih = 1; benih <= 300; benih++) {
    const acak = buatAcak(benih * 7);
    let rencana: RencanaPembukaan = rencanaKocokanPertama([0, 0]);
    let markah: Markah = [0, 0];
    let jumlah = 0;
    const info = `benih ${benih}`;

    while (!pemenangPartai(markah)) {
      let mulai = mulaiDariRencana(bagi(kocok(buatDek(), acak)), rencana);
      while (mulai.status === 'ulang') mulai = mulaiDariRencana(bagi(kocok(buatDek(), acak)), rencana);

      const { state } = mainAcakDariState(mulai.state, acak);
      const hasil = hitungHasil(state);
      const baru = terapkanHasil(markah, hasil);
      assert.ok(baru[0] >= markah[0] && baru[1] >= markah[1], info);
      markah = baru;
      rencana = hasil.rencanaBerikutnya;
      jumlah++;
      assert.ok(jumlah <= 300, `${info}: partai tidak kunjung selesai`);
    }

    const { kalah, menang } = ada(pemenangPartai(markah));
    assert.ok(markah[kalah] >= BATAS_MARKAH, info);
    assert.ok(markah[menang] < BATAS_MARKAH, info);
    totalKocokan += jumlah;
  }

  // Dari uji awal: rata-rata sekitar 6 kocokan per partai (pemain acak).
  const rata = totalKocokan / 300;
  assert.ok(rata > 4 && rata < 9, `rata-rata kocokan per partai: ${rata}`);
});
