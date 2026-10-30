import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buatKartu } from '../src/engine.ts';
import { buatAcak } from '../src/rng.ts';
import { akhirKocokan } from '../src/akhir.ts';
import { BATAS_MARKAH } from '../src/markah.ts';
import { SISI_AWAL } from '../src/meja.ts';
import {
  STATUS_SIAP,
  STATUS_BERJALAN,
  STATUS_RINGKASAN,
  STATUS_SELESAI,
  mulaiPartai,
  bagiKocokan,
  mainkanPartai,
  lewatPartai,
  lanjutkanPartai,
} from '../src/partai.ts';
import { langkahAcakPartai, mainAcakPartai } from '../src/simulasi.ts';
import type { FungsiAcak } from '../src/rng.ts';
import type { Partai, StatusPartai } from '../src/partai.ts';
import { nomor, ada } from '../bantu/bantuan-tes.ts';

const k = buatKartu;

/** Memajukan partai dengan langkah acak sampai status yang diminta tercapai. */
function punyaStatus<S extends StatusPartai>(partai: Partai, status: S): partai is Extract<Partai, { status: S }> {
  return partai.status === status;
}

function majuSampai<S extends StatusPartai>(awal: Partai, acak: FungsiAcak, status: S): Extract<Partai, { status: S }> {
  let partai = awal;
  for (let i = 0; i < 20000; i++) {
    if (punyaStatus(partai, status)) return partai;
    partai = langkahAcakPartai(partai, acak);
  }
  throw new Error(`Status ${status} tidak tercapai`);
}

// ---------------------------------------------------------------------------
// Memulai
// ---------------------------------------------------------------------------

test('mulaiPartai: markah 0, status siap, rencana dari poin', () => {
  const partai = mulaiPartai([1, 0]);
  assert.equal(partai.status, STATUS_SIAP);
  assert.deepEqual(partai.markah, [0, 0]);
  assert.equal(partai.nomorKocokan, 0);
  assert.equal(partai.kocokan, null);
  assert.equal(partai.pemenang, null);
  assert.deepEqual(partai.rencana, { jenis: 'poin', poin: [1, 0] });
  assert.deepEqual(partai.riwayatHasil, []);
});

test('mulaiPartai menolak poin yang tidak sah', () => {
  // @ts-expect-error sengaja salah: hanya satu poin
  assert.throws(() => mulaiPartai([0]), RangeError);
  assert.throws(() => mulaiPartai([0, 9]), RangeError);
});

test('mulaiPartai menyalin poin, bukan memakai array masukan', () => {
  const poin: [number, number] = [0, 0];
  const partai = mulaiPartai(poin);
  poin[0] = 5;
  assert.deepEqual(partai.poin, [0, 0]);
});

// ---------------------------------------------------------------------------
// Kocokan pertama
// ---------------------------------------------------------------------------

test('kocokan pertama dibuka pemegang kartu sesuai poin, untuk beberapa poin', () => {
  const kasus: [[number, number], string][] = [
    [[0, 0], '0-0'],
    [[1, 0], '0-1'],
    [[0, 1], '0-1'],
    [[2, 1], '1-2'],
    [[2, 2], '2-2'],
  ];
  for (const [poin, idKartu] of kasus) {
    const partai = bagiKocokan(mulaiPartai(poin), buatAcak(11));
    assert.equal(partai.status, STATUS_BERJALAN);
    assert.equal(partai.nomorKocokan, 1);
    const { pembuka, syarat } = partai.infoPembuka;
    assert.equal(partai.kocokan.giliran, pembuka);
    assert.ok(syarat.jenis === 'kartu');
    assert.equal(syarat.kartu.id, idKartu);
    assert.ok(partai.kocokan.tangan[pembuka].some((kartu) => kartu.id === idKartu));
  }
});

test('benih sama menghasilkan pembagian yang sama', () => {
  const a = bagiKocokan(mulaiPartai([0, 0]), buatAcak(5));
  const b = bagiKocokan(mulaiPartai([0, 0]), buatAcak(5));
  assert.deepEqual(a, b);
});

test('bagiKocokan tidak mengubah partai lama', () => {
  const awal = mulaiPartai([0, 0]);
  const salinan = structuredClone(awal);
  bagiKocokan(awal, buatAcak(3));
  assert.deepEqual(awal, salinan);
});

// ---------------------------------------------------------------------------
// Penjaga status
// ---------------------------------------------------------------------------

test('langkah yang tidak cocok dengan status melempar Error', () => {
  const siap = mulaiPartai([0, 0]);
  assert.throws(() => mainkanPartai(siap, 0, k(0, 0), SISI_AWAL), /status partai "siap"/);
  assert.throws(() => lewatPartai(siap, 0), Error);
  assert.throws(() => lanjutkanPartai(siap), Error);

  const berjalan = bagiKocokan(siap, buatAcak(2));
  assert.throws(() => bagiKocokan(berjalan, buatAcak(2)), Error);
  assert.throws(() => lanjutkanPartai(berjalan), Error);
});

test('mainkanPartai meneruskan pelanggaran aturan dari kocokan', () => {
  const berjalan = bagiKocokan(mulaiPartai([0, 0]), buatAcak(2));
  const bukanPembuka = nomor((berjalan.infoPembuka.pembuka + 1) % 4);
  const kartu = ada(berjalan.kocokan.tangan[bukanPembuka][0]);
  assert.throws(() => mainkanPartai(berjalan, bukanPembuka, kartu, SISI_AWAL), /Bukan giliran/);
});

// ---------------------------------------------------------------------------
// Akhir kocokan dan ringkasan
// ---------------------------------------------------------------------------

test('saat kocokan berakhir: status ringkasan, markah bertambah sesuai hasil', () => {
  const acak = buatAcak(21);
  const sebelum = majuSampai(bagiKocokan(mulaiPartai([0, 0]), acak), acak, STATUS_BERJALAN);
  const ringkasan = majuSampai(sebelum, acak, STATUS_RINGKASAN);
  const hasil = ringkasan.hasilTerakhir;

  assert.deepEqual(ringkasan.markah, hasil.tambahan); // kocokan pertama: markah awal 0
  assert.equal(ringkasan.riwayatHasil.length, 1);
  assert.equal(ringkasan.riwayatHasil[0], hasil);
  assert.equal(hasil.nomor, 1);
  assert.equal(hasil.pembuka, ringkasan.infoPembuka.pembuka);
  assert.ok(hasil.jumlahLangkah >= 1);
  assert.ok(akhirKocokan(ringkasan.kocokan), 'state kocokan terakhir tetap tersedia untuk ringkasan');

  // Di ringkasan tidak ada langkah lagi.
  assert.throws(() => lewatPartai(ringkasan, 0), /status partai "ringkasan"/);
});

test('lanjutkanPartai: kocokan berikutnya memakai rencana dari hasil terakhir', () => {
  const acak = buatAcak(33);
  const partai = majuSampai(bagiKocokan(mulaiPartai([0, 0]), acak), acak, STATUS_RINGKASAN);
  assert.equal(partai.pemenang, null, 'satu kocokan tidak cukup untuk menamatkan partai pada benih ini');
  const lanjut = lanjutkanPartai(partai);
  assert.equal(lanjut.status, STATUS_SIAP);
  assert.deepEqual(lanjut.rencana, partai.hasilTerakhir.rencanaBerikutnya);
  assert.equal(lanjut.kocokan, null);
  assert.deepEqual(lanjut.markah, partai.markah);

  const berikutnya = bagiKocokan(lanjut, acak);
  assert.equal(berikutnya.nomorKocokan, 2);
});

test('langkah partai tidak mengubah partai lama', () => {
  const acak = buatAcak(8);
  const berjalan = bagiKocokan(mulaiPartai([0, 0]), acak);
  const salinan = structuredClone(berjalan);
  langkahAcakPartai(berjalan, acak);
  assert.deepEqual(berjalan, salinan);
});

// ---------------------------------------------------------------------------
// Partai penuh
// ---------------------------------------------------------------------------

test('partai penuh: berakhir saat satu tim mencapai 100, lalu menolak kocokan baru', () => {
  const selesai = mainAcakPartai(mulaiPartai([0, 0]), buatAcak(4));
  assert.equal(selesai.status, STATUS_SELESAI);
  const { kalah, menang } = selesai.pemenang;
  assert.ok(selesai.markah[kalah] >= BATAS_MARKAH);
  assert.ok(selesai.markah[menang] < BATAS_MARKAH);
  assert.equal(selesai.kocokan, null);
  assert.throws(() => bagiKocokan(selesai, buatAcak(1)), Error);
  assert.throws(() => lanjutkanPartai(selesai), Error);
  assert.equal(langkahAcakPartai(selesai, buatAcak(1)), selesai); // partai selesai tidak berubah
});

test('300 partai acak: riwayat, markah, dan pembuka selalu konsisten', () => {
  const poinUji: [number, number][] = [
    [0, 0],
    [1, 0],
    [0, 2],
    [2, 1],
    [2, 2],
  ];
  let totalKocokan = 0;

  for (let benih = 1; benih <= 300; benih++) {
    const poin = ada(poinUji[benih % poinUji.length]);
    const acak = buatAcak(benih * 13);
    const selesai = mainAcakPartai(mulaiPartai(poin), acak);
    const info = `benih ${benih}, poin ${poin}`;

    assert.equal(selesai.riwayatHasil.length, selesai.nomorKocokan, info);
    assert.ok(selesai.jumlahKocokUlang >= 0, info);

    // Markah akhir = jumlah semua tambahan, dan tidak pernah turun.
    const jumlah: [number, number] = [0, 0];
    let sebelumnya: [number, number] = [0, 0];
    selesai.riwayatHasil.forEach((hasil, i) => {
      jumlah[0] += hasil.tambahan[0];
      jumlah[1] += hasil.tambahan[1];
      assert.ok(jumlah[0] >= sebelumnya[0] && jumlah[1] >= sebelumnya[1], info);
      sebelumnya = [jumlah[0], jumlah[1]];
      assert.equal(hasil.nomor, i + 1, info);
      // Hanya kocokan terakhir yang boleh membawa markah ke 100 atau lebih.
      const terakhir = i === selesai.riwayatHasil.length - 1;
      assert.equal(
        jumlah.some((m) => m >= BATAS_MARKAH),
        terakhir,
        `${info}, kocokan ${i + 1}`,
      );
    });
    assert.deepEqual(jumlah, selesai.markah, info);

    // Kocokan berikutnya selalu memakai rencana dari hasil sebelumnya.
    for (let i = 1; i < selesai.riwayatHasil.length; i++) {
      const rencana = ada(selesai.riwayatHasil[i - 1]).rencanaBerikutnya;
      const pembuka = ada(selesai.riwayatHasil[i]).pembuka;
      if (rencana.jenis === 'balak') {
        assert.ok([rencana.calon, nomor((rencana.calon + 1) % 4)].includes(pembuka), `${info}, kocokan ${i + 1}`);
      }
    }
    totalKocokan += selesai.nomorKocokan;
  }

  const rata = totalKocokan / 300;
  assert.ok(rata > 4 && rata < 9, `rata-rata kocokan per partai: ${rata}`);
});

test('mainAcakPartai berhenti dengan error bila melebihi batas langkah', () => {
  assert.throws(() => mainAcakPartai(mulaiPartai([0, 0]), buatAcak(1), 5), /tidak selesai/);
});
