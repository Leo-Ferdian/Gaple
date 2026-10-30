import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buatKartu, buatDek, kocok, bagi } from '../src/engine.ts';
import { empat, nomor } from '../bantu/bantuan-tes.ts';
import { buatAcak } from '../src/rng.ts';
import {
  SYARAT_BEBAS,
  SYARAT_BALAK,
  syaratKartu,
  kartuMemenuhiSyarat,
  totalTitik,
  rencanaKocokanPertama,
  rencanaKocokanBerikutnya,
  tentukanPembuka,
} from '../src/pembuka.ts';

const k = buatKartu;

// Empat tangan kecil buatan sendiri. Hanya jumlah tangan (4) yang diperiksa.
const tanganTanpaBalak = () => empat([k(0, 1), k(2, 3)], [k(1, 2), k(3, 4)], [k(0, 2), k(4, 5)], [k(1, 3), k(5, 6)]);

// ---------------------------------------------------------------------------
// Syarat
// ---------------------------------------------------------------------------

test('kartuMemenuhiSyarat: bebas, balak, dan kartu tertentu', () => {
  assert.equal(kartuMemenuhiSyarat(k(2, 5), SYARAT_BEBAS), true);

  assert.equal(kartuMemenuhiSyarat(k(4, 4), SYARAT_BALAK), true);
  assert.equal(kartuMemenuhiSyarat(k(4, 5), SYARAT_BALAK), false);

  const harus = syaratKartu(k(1, 0));
  assert.equal(kartuMemenuhiSyarat(k(0, 1), harus), true); // 1-0 sama dengan 0-1
  assert.equal(kartuMemenuhiSyarat(k(0, 2), harus), false);
});

test('totalTitik menjumlahkan titik satu tangan', () => {
  assert.equal(totalTitik([]), 0);
  assert.equal(totalTitik([k(6, 6), k(5, 5)]), 22);
});

// ---------------------------------------------------------------------------
// Rencana kocokan pertama (berdasarkan poin)
// ---------------------------------------------------------------------------

test('rencanaKocokanPertama menerima poin sah dan menolak yang tidak sah', () => {
  assert.deepEqual(rencanaKocokanPertama([0, 0]), { jenis: 'poin', poin: [0, 0] });
  // @ts-expect-error sengaja salah: hanya satu poin
  assert.throws(() => rencanaKocokanPertama([0]), RangeError);
  assert.throws(() => rencanaKocokanPertama([0, 7]), RangeError);
  assert.throws(() => rencanaKocokanPertama([-1, 0]), RangeError);
  // @ts-expect-error sengaja salah: bukan pasangan angka
  assert.throws(() => rencanaKocokanPertama('00'), RangeError);
});

test('poin 0-0 dibuka pemegang kartu 0-0', () => {
  const tangan = empat([k(1, 2)], [k(3, 4)], [k(0, 0)], [k(5, 6)]);
  const hasil = tentukanPembuka(tangan, rencanaKocokanPertama([0, 0]));
  assert.ok(hasil.status === 'siap');
  assert.equal(hasil.pembuka, 2);
  assert.deepEqual(hasil.syarat, syaratKartu(k(0, 0)));
});

test('poin 1-0 dan 0-1 sama-sama dibuka pemegang kartu 0-1', () => {
  const tangan = empat([k(1, 2)], [k(0, 1)], [k(0, 0)], [k(5, 6)]);
  for (const poin of [
    [1, 0],
    [0, 1],
  ] as const) {
    const hasil = tentukanPembuka(tangan, rencanaKocokanPertama(poin));
    assert.equal(hasil.pembuka, 1);
    assert.ok(hasil.status === 'siap' && hasil.syarat.jenis === 'kartu');
    assert.equal(hasil.syarat.kartu.id, '0-1');
  }
});

test('poin 2-1 dibuka pemegang kartu 1-2, dan poin 2-2 dibuka pemegang 2-2', () => {
  const tangan = empat([k(2, 2)], [k(5, 6)], [k(1, 2)], [k(0, 0)]);
  assert.equal(tentukanPembuka(tangan, rencanaKocokanPertama([2, 1])).pembuka, 2);
  assert.equal(tentukanPembuka(tangan, rencanaKocokanPertama([2, 2])).pembuka, 0);
});

test('tentukanPembuka melempar Error bila kartu pembuka tidak ada di tangan mana pun', () => {
  assert.throws(() => tentukanPembuka(tanganTanpaBalak(), rencanaKocokanPertama([6, 6])), Error);
});

test('kocokan netral dibuka pemegang kartu 0-0', () => {
  const tangan = empat([k(1, 2)], [k(3, 4)], [k(5, 6)], [k(0, 0)]);
  const hasil = tentukanPembuka(tangan, { jenis: 'netral' });
  assert.ok(hasil.status === 'siap');
  assert.equal(hasil.pembuka, 3);
  assert.deepEqual(hasil.syarat, syaratKartu(k(0, 0)));
});

// ---------------------------------------------------------------------------
// Rencana kocokan berikutnya (setelah habis atau tabrak)
// ---------------------------------------------------------------------------

test('setelah habis, calon pembuka adalah pemain yang menutup', () => {
  for (const penutup of [0, 1, 2, 3] as const) {
    assert.deepEqual(rencanaKocokanBerikutnya({ akhir: 'habis', penutup }), { jenis: 'balak', calon: penutup });
  }
  // @ts-expect-error sengaja salah: nomor pemain 4 tidak ada
  assert.throws(() => rencanaKocokanBerikutnya({ akhir: 'habis', penutup: 4 }), RangeError);
});

test('setelah tabrak, calon adalah pemain tim pemenang dengan titik paling sedikit', () => {
  // Tim 0 (pemain 0 dan 2): 12 + 10 = 22. Tim 1 (pemain 1 dan 3): 3 + 4 = 7. Tim 1 menang.
  const tangan = empat([k(6, 6)], [k(1, 2)], [k(5, 5)], [k(0, 4)]);
  assert.deepEqual(rencanaKocokanBerikutnya({ akhir: 'tabrak', tangan }), { jenis: 'balak', calon: 1 });

  // Pemain 3 lebih ringan dari pemain 1: calon pemain 3.
  const tangan2 = empat([k(6, 6)], [k(2, 4)], [k(5, 5)], [k(0, 1)]);
  assert.deepEqual(rencanaKocokanBerikutnya({ akhir: 'tabrak', tangan: tangan2 }), { jenis: 'balak', calon: 3 });

  // Tim 0 yang menang: pemain 2 lebih ringan dari pemain 0.
  const tangan3 = empat([k(2, 3)], [k(6, 6)], [k(0, 1)], [k(5, 5)]);
  assert.deepEqual(rencanaKocokanBerikutnya({ akhir: 'tabrak', tangan: tangan3 }), { jenis: 'balak', calon: 2 });
});

test('bila dua pemain tim pemenang tabrak sama titiknya, calon yang nomornya lebih kecil', () => {
  // Tim 1: pemain 1 = 1-3 (4 titik), pemain 3 = 0-4 (4 titik). Tim 0: 12 + 10 = 22.
  const tangan = empat([k(6, 6)], [k(1, 3)], [k(5, 5)], [k(0, 4)]);
  assert.deepEqual(rencanaKocokanBerikutnya({ akhir: 'tabrak', tangan }), { jenis: 'balak', calon: 1 });
});

test('tabrak seri (total titik kedua tim sama) menghasilkan rencana netral', () => {
  // Tim 0: 6 + 2 = 8. Tim 1: 8 + 0 = 8.
  const tangan = empat([k(3, 3)], [k(4, 4)], [k(1, 1)], []);
  assert.deepEqual(rencanaKocokanBerikutnya({ akhir: 'tabrak', tangan }), { jenis: 'netral' });
});

test('rencanaKocokanBerikutnya menolak masukan yang tidak dikenal', () => {
  // @ts-expect-error sengaja salah: jenis akhir tidak dikenal
  assert.throws(() => rencanaKocokanBerikutnya({ akhir: 'entah' }), Error);
  // @ts-expect-error sengaja salah: hanya dua tangan
  assert.throws(() => rencanaKocokanBerikutnya({ akhir: 'tabrak', tangan: [[], []] }), RangeError);
});

// ---------------------------------------------------------------------------
// Pembukaan dengan balak
// ---------------------------------------------------------------------------

test('calon yang punya balak langsung membuka dengan syarat balak', () => {
  const tangan = tanganTanpaBalak();
  tangan[2].push(k(3, 3));
  const hasil = tentukanPembuka(tangan, { jenis: 'balak', calon: 2 });
  assert.ok(hasil.status === 'siap');
  assert.equal(hasil.pembuka, 2);
  assert.deepEqual(hasil.syarat, SYARAT_BALAK);
});

test('calon tanpa balak: hak pindah ke pemain berikutnya yang punya balak', () => {
  const tangan = tanganTanpaBalak();
  tangan[1].push(k(6, 6));
  const hasil = tentukanPembuka(tangan, { jenis: 'balak', calon: 0 });
  assert.ok(hasil.status === 'siap');
  assert.equal(hasil.pembuka, 1);
  assert.deepEqual(hasil.syarat, SYARAT_BALAK);
});

test('hak pindah berputar dari pemain 3 ke pemain 0', () => {
  const tangan = tanganTanpaBalak();
  tangan[0].push(k(2, 2));
  const hasil = tentukanPembuka(tangan, { jenis: 'balak', calon: 3 });
  assert.ok(hasil.status === 'siap');
  assert.equal(hasil.pembuka, 0);
});

test('dua pembuka berturut-turut tanpa balak: kocokan diulang dengan calon yang sama', () => {
  const tangan = tanganTanpaBalak();
  tangan[3].push(k(0, 0)); // pemain 3 punya balak, tapi hanya dua pemain yang diperiksa
  const hasil = tentukanPembuka(tangan, { jenis: 'balak', calon: 0 });
  assert.equal(hasil.status, 'ulang');
  assert.equal(hasil.pembuka, 0);
  assert.ok(!('syarat' in hasil));
});

test('pemain ketiga yang punya balak tidak mengambil alih hak membuka', () => {
  const tangan = tanganTanpaBalak();
  tangan[2].push(k(5, 5));
  assert.equal(tentukanPembuka(tangan, { jenis: 'balak', calon: 0 }).status, 'ulang');
});

test('tentukanPembuka menolak jumlah tangan, calon, dan jenis rencana yang salah', () => {
  // @ts-expect-error sengaja salah: hanya tiga tangan
  assert.throws(() => tentukanPembuka([[], [], []], { jenis: 'netral' }), RangeError);
  // @ts-expect-error sengaja salah: calon 4 tidak ada
  assert.throws(() => tentukanPembuka(tanganTanpaBalak(), { jenis: 'balak', calon: 4 }), RangeError);
  // @ts-expect-error sengaja salah: jenis rencana tidak dikenal
  assert.throws(() => tentukanPembuka(tanganTanpaBalak(), { jenis: 'entah' }), Error);
});

// ---------------------------------------------------------------------------
// Uji sifat pada kocokan nyata
// ---------------------------------------------------------------------------

test('pada 2000 pembagian acak, aturan balak selalu konsisten dan "ulang" jarang terjadi', () => {
  let jumlahUlang = 0;
  let jumlahGeser = 0;

  for (let benih = 1; benih <= 2000; benih++) {
    const tangan = bagi(kocok(buatDek(), buatAcak(benih)));
    const calon = nomor(benih % 4);
    const berikutnya = nomor((calon + 1) % 4);
    const punyaBalak = (p: 0 | 1 | 2 | 3) => tangan[p].some((kartu) => kartu.a === kartu.b);
    const hasil = tentukanPembuka(tangan, { jenis: 'balak', calon });

    if (hasil.status === 'ulang') {
      jumlahUlang++;
      assert.ok(!punyaBalak(calon) && !punyaBalak(berikutnya), `benih ${benih}`);
      assert.equal(hasil.pembuka, calon, `benih ${benih}`);
    } else {
      assert.ok(hasil.pembuka === calon || hasil.pembuka === berikutnya, `benih ${benih}`);
      assert.ok(punyaBalak(hasil.pembuka), `benih ${benih}`);
      if (hasil.pembuka === berikutnya) {
        jumlahGeser++;
        assert.ok(!punyaBalak(calon), `benih ${benih}`);
      }
    }
  }

  // Peluang teoretis: kocokan ulang sekitar 0,3%, hak pindah sekitar 10%.
  assert.ok(jumlahUlang < 40, `kocokan ulang terlalu sering: ${jumlahUlang} dari 2000`);
  assert.ok(jumlahGeser > 100 && jumlahGeser < 350, `hak pindah di luar perkiraan: ${jumlahGeser} dari 2000`);
});
