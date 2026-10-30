import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buatAcak } from '../src/rng.ts';
import { adalahAngka, buatKartu } from '../src/engine.ts';
import type { Angka, Kartu, NomorPemain } from '../src/engine.ts';
import { SISI_AWAL } from '../src/meja.ts';
import { mulaiPartai, bagiKocokan, STATUS_BERJALAN } from '../src/partai.ts';
import type { Partai } from '../src/partai.ts';
import { langkahAcakPartai } from '../src/simulasi.ts';
import { pandangan, buatPelacak, angkaTerlarang } from '../src/pelacak.ts';
import { jalankan } from '../bantu/skenario.ts';
import { ada, nomor } from '../bantu/bantuan-tes.ts';

const k = buatKartu;
const angka = (n: number): Angka => {
  if (!adalahAngka(n)) throw new RangeError(`bukan angka kartu: ${n}`);
  return n;
};
const SEMUA: readonly NomorPemain[] = [0, 1, 2, 3];

/** Semua pembagian kartu ke tiga pemain (jumlah tetap, larangan angka) secara brute force. */
function bruteForce(belum: readonly Kartu[], ukuran: readonly number[], terlarang: readonly ReadonlySet<Angka>[]): Kartu[][][] {
  const hasil: Kartu[][][] = [];
  const bagian: Kartu[][] = [[], [], []];
  const rec = (i: number): void => {
    if (i === belum.length) {
      hasil.push(bagian.map((b) => [...b]));
      return;
    }
    const kartu = ada(belum[i]);
    for (let j = 0; j < 3; j++) {
      const dilarang = ada(terlarang[j]);
      if (dilarang.has(kartu.a) || dilarang.has(kartu.b)) continue;
      if (ada(bagian[j]).length >= ada(ukuran[j])) continue;
      ada(bagian[j]).push(kartu);
      rec(i + 1);
      ada(bagian[j]).pop();
    }
  };
  rec(0);
  return hasil;
}

/** Keadaan kocokan acak yang sudah berjalan cukup jauh sehingga kartu belum terlihat sedikit. */
function* keadaanAkhir(benih: number, maksBelum: number) {
  const acak = buatAcak(benih);
  let partai: Partai = bagiKocokan(mulaiPartai([0, 0]), acak);
  while (partai.status !== 'selesai') {
    if (partai.status === STATUS_BERJALAN) {
      const { kocokan } = partai;
      const saya = kocokan.giliran;
      const belum = 28 - kocokan.meja.rangkaian.length - kocokan.tangan[saya].length;
      if (belum <= maksBelum) yield { kocokan, saya };
    }
    partai = langkahAcakPartai(partai, acak);
  }
}

test('pandangan: hanya tangan sendiri; jumlah kartu pemain lain kelihatan', () => {
  const state = jalankan([[k(0, 3), k(1, 1)], [k(1, 2), k(5, 5)], [k(0, 5)], [k(4, 4), k(6, 6), k(2, 2)]], 0, []);
  const v = pandangan(state, nomor(2));
  assert.deepEqual(v.tangan, [k(0, 5)]);
  assert.deepEqual(v.jumlahKartu, [2, 2, 1, 3]);
  assert.equal(v.pemain, 2);
});

test('angkaTerlarang: angka di dua ujung saat pemain lewat; kartu belum lewat tidak terlarang', () => {
  const state = jalankan([[k(0, 3), k(1, 1)], [k(1, 2)], [k(0, 5)], [k(4, 4)]], 0, [
    ['m', 0, k(0, 3), SISI_AWAL],
    ['l', 1],
  ]);
  assert.deepEqual([...angkaTerlarang(state.riwayat, nomor(1))].sort(), [0, 3]);
  assert.equal(angkaTerlarang(state.riwayat, nomor(2)).size, 0);
});

test('keluar, belumTerlihat, sisaPerAngka konsisten: 28 = meja + tangan sendiri + belum terlihat', () => {
  let diuji = 0;
  for (let benih = 1; benih <= 20; benih++) {
    for (const { kocokan, saya } of keadaanAkhir(benih, 28)) {
      const p = buatPelacak(pandangan(kocokan, saya));
      assert.equal(p.keluar.length + p.pandangan.tangan.length + p.belumTerlihat.length, 28);
      assert.deepEqual(
        p.keluar.map((c) => c.id),
        kocokan.meja.rangkaian.map((l) => l.kartu.id),
      );
      for (const c of p.belumTerlihat) {
        assert.ok(!p.keluar.some((x) => x.id === c.id) && !p.pandangan.tangan.some((x) => x.id === c.id));
      }
      // Per angka: 7 kartu memuat angka itu; yang bukan di meja dan bukan di tangan sendiri = sisa.
      for (let a = 0; a <= 6; a++) {
        const terlihat = [...p.keluar, ...p.pandangan.tangan].filter((c) => c.a === a || c.b === a).length;
        assert.equal(p.sisaPerAngka[a], 7 - terlihat, `angka ${a}`);
      }
      diuji++;
      if (diuji % 5 === 0) break;
    }
  }
  assert.ok(diuji >= 100);
});

test('peluang tepat: cocok dengan brute force pada puluhan keadaan akhir kocokan (termasuk larangan dari riwayat lewat)', () => {
  let diuji = 0;
  for (let benih = 1; benih <= 80 && diuji < 60; benih++) {
    for (const { kocokan, saya } of keadaanAkhir(benih, 8)) {
      const v = pandangan(kocokan, saya);
      const p = buatPelacak(v);
      const lain = SEMUA.filter((n) => n !== saya);
      const ukuran = lain.map((n) => v.jumlahKartu[n]);
      const semua = bruteForce(
        p.belumTerlihat,
        ukuran,
        lain.map((n) => angkaTerlarang(v.riwayat, n)),
      );
      assert.ok(semua.length > 0);
      for (const kartu of p.belumTerlihat) {
        lain.forEach((n, j) => {
          const cocok = semua.filter((s) => ada(s[j]).some((c) => c.id === kartu.id)).length / semua.length;
          assert.ok(Math.abs(p.peluangKartu(kartu.id, n) - cocok) < 1e-9, `benih ${benih}: kartu ${kartu.id} pemain ${n}`);
        });
      }
      for (const [j, n] of lain.entries()) {
        for (const a of [0, 3, 6]) {
          for (const b of [1, 3, 5]) {
            const tidak = semua.filter((s) => ada(s[j]).every((c) => ![c.a, c.b].some((x) => x === a || x === b))).length / semua.length;
            assert.ok(
              Math.abs(p.peluangTidakPunya(n, angka(a), angka(b)) - tidak) < 1e-9,
              `benih ${benih}: tidak punya ${a}/${b} pemain ${n}`,
            );
          }
        }
      }
      diuji++;
      break; // satu keadaan per kocokan supaya beragam
    }
  }
  assert.ok(diuji >= 30, `hanya ${diuji} keadaan diuji`);
});

test('sifat umum di seluruh kocokan acak: jumlah peluang, kebenaran (kartu sungguhan tidak pernah berpeluang 0), pemain sendiri pasti', () => {
  let diuji = 0;
  for (let benih = 1; benih <= 40; benih++) {
    for (const { kocokan, saya } of keadaanAkhir(benih, 21)) {
      const v = pandangan(kocokan, saya);
      const p = buatPelacak(v);
      const lain = SEMUA.filter((n) => n !== saya);
      for (const kartu of p.belumTerlihat) {
        const jumlah = lain.reduce((s: number, n) => s + p.peluangKartu(kartu.id, n), 0);
        assert.ok(Math.abs(jumlah - 1) < 1e-9, `benih ${benih}: peluang ${kartu.id} berjumlah ${jumlah}`);
        const pemilik = lain.find((n) => kocokan.tangan[n].some((c) => c.id === kartu.id));
        assert.ok(pemilik !== undefined);
        assert.ok(
          p.peluangKartu(kartu.id, ada(pemilik)) > 0,
          `benih ${benih}: kartu ${kartu.id} sungguh di pemain ${pemilik} tetapi peluangnya 0`,
        );
      }
      for (const n of lain) {
        const jumlahPemain = p.belumTerlihat.reduce((s, c) => s + p.peluangKartu(c.id, n), 0);
        assert.ok(Math.abs(jumlahPemain - v.jumlahKartu[n]) < 1e-9, `benih ${benih}: harapan kartu pemain ${n}`);
      }
      for (const kartu of v.tangan) assert.equal(p.peluangKartu(kartu.id, saya), 1);
      for (const l of v.meja.rangkaian) assert.equal(p.peluangKartu(l.kartu.id, nomor(1)), 0);
      diuji++;
      if (diuji % 7 === 0) break;
    }
  }
  assert.ok(diuji > 200, `hanya ${diuji} keadaan diuji`);
});

test('pemain yang pernah lewat: peluang punya angka terlarang tepat 0, dan peluang tidak punya 1', () => {
  let diuji = 0;
  for (let benih = 1; benih <= 60 && diuji < 40; benih++) {
    for (const { kocokan, saya } of keadaanAkhir(benih, 21)) {
      const v = pandangan(kocokan, saya);
      const p = buatPelacak(v);
      const pelewat = SEMUA.find((n) => n !== saya && angkaTerlarang(v.riwayat, n).size > 0);
      if (pelewat === undefined) continue;
      for (const a of angkaTerlarang(v.riwayat, pelewat)) {
        assert.equal(p.peluangPunyaAngka(pelewat, a), 0, `benih ${benih}: pemain ${pelewat} angka ${a}`);
        assert.equal(p.peluangTidakPunya(pelewat, a, a), 1);
        assert.ok(p.terlarang(pelewat).has(a));
        // Kenyataannya memang tidak punya (kebenaran informasi).
        assert.ok(kocokan.tangan[pelewat].every((c) => c.a !== a && c.b !== a));
      }
      diuji++;
      break;
    }
  }
  assert.ok(diuji >= 20, `hanya ${diuji} keadaan dengan pemain yang pernah lewat`);
});

test('state tidak konsisten (jumlah kartu tidak cocok) ditolak, bukan dihitung ngawur', () => {
  const pertama = keadaanAkhir(1, 28).next();
  if (pertama.done === true || pertama.value === undefined) throw new Error('tidak ada keadaan');
  const { kocokan, saya } = pertama.value;
  const v = pandangan(kocokan, saya);
  assert.throws(() => buatPelacak({ ...v, jumlahKartu: [1, 1, 1, 5] }), /tidak sama/);
});
