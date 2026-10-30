// Tes integrasi: seluruh lapisan bekerja bersama, dari kartu sampai layar.
//
// Berbeda dari tes per modul, di sini tidak ada yang diganti tiruan: mesin
// aturan, alur partai dan pertandingan, controller, tampilan, dan pemeriksa
// mandiri (bantu/pemeriksa.ts) dipakai nyata dengan benih tetap.

import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buatDek, kocok, bagi } from '../src/engine.ts';
import { buatAcak } from '../src/rng.ts';
import { rencanaKocokanPertama } from '../src/pembuka.ts';
import { mulaiDariRencana } from '../src/kocokan.ts';
import { hitungHasil, terapkanHasil, BATAS_MARKAH } from '../src/markah.ts';
import { mulaiPartai, STATUS_BERJALAN, STATUS_RINGKASAN, STATUS_SELESAI } from '../src/partai.ts';
import { FORMAT_BO3, FORMAT_BO5, TARGET_POIN } from '../src/pertandingan.ts';
import { mainAcakDariState, mainAcakPartai, mainAcakPertandingan, langkahAcakPartai } from '../src/simulasi.ts';
import {
  PEMAIN_MANUSIA,
  aplikasiBaru,
  mulaiPermainan,
  ubahPengaturan,
  layarAktif,
  partaiAktif,
  ubahPartaiAktif,
  lanjutkan,
  menungguManusia,
  langkahOtomatis,
  mainkanManusia,
  pilihanKartu,
} from '../src/controller.ts';
import type { Aplikasi, Layar } from '../src/controller.ts';
import { kartuLegalPemain } from '../src/kocokan.ts';
import { htmlMenu, htmlPartaiSelesai, htmlAkhir } from '../src/tampilan/layar-html.ts';
import { htmlMeja } from '../src/tampilan/meja-html.ts';
import { periksaKocokan } from '../bantu/pemeriksa.ts';
import { ada } from '../bantu/bantuan-tes.ts';
import type { Partai } from '../src/partai.ts';
import type { FungsiAcak } from '../src/rng.ts';

const bersih = (html: string, info: string): void => {
  assert.doesNotMatch(html, /undefined|NaN|\[object|Infinity/, info);
};

test('satu kocokan penuh: bagi, buka, main acak, hitung markah, lolos pemeriksa mandiri', () => {
  for (let benih = 1; benih <= 50; benih++) {
    const acak = buatAcak(benih);
    const rencana = rencanaKocokanPertama([0, 0]);
    const mulai = mulaiDariRencana(bagi(kocok(buatDek(), acak)), rencana);
    assert.ok(mulai.status === 'siap', `benih ${benih}`);

    const { state, akhir } = mainAcakDariState(mulai.state, acak);
    const hasil = hitungHasil(state);
    const markahSesudah = terapkanHasil([0, 0], hasil);
    const ringkas = periksaKocokan({ kocokan: state, hasil, rencana, markahSebelum: [0, 0], markahSesudah });

    assert.equal(ringkas.akhir, akhir, `benih ${benih}`);
    assert.equal(hasil.akhir, akhir, `benih ${benih}`);
    assert.equal(ringkas.langkah, state.riwayat.length, `benih ${benih}`);
  }
});

test('satu partai penuh: berakhir saat satu tim mencapai batas, markah = jumlah hasil tiap kocokan', () => {
  for (let benih = 1; benih <= 25; benih++) {
    const selesai = mainAcakPartai(mulaiPartai([0, 0]), buatAcak(benih));
    assert.ok(selesai.status === STATUS_SELESAI, `benih ${benih}`);

    const jumlah: [number, number] = [0, 0];
    for (const hasil of selesai.riwayatHasil) {
      jumlah[0] += hasil.tambahan[0];
      jumlah[1] += hasil.tambahan[1];
    }
    assert.deepEqual(jumlah, selesai.markah, `benih ${benih}`);
    assert.ok(selesai.markah[selesai.pemenang.kalah] >= BATAS_MARKAH, `benih ${benih}`);
    assert.ok(selesai.markah[selesai.pemenang.menang] < BATAS_MARKAH, `benih ${benih}`);
    assert.equal(selesai.riwayatHasil.length, selesai.nomorKocokan, `benih ${benih}`);
  }
});

for (const format of [FORMAT_BO3, FORMAT_BO5] as const) {
  test(`pertandingan ${format} penuh: juara sah dan hasilnya sama persis untuk benih yang sama`, () => {
    for (let benih = 1; benih <= 10; benih++) {
      const a = mainAcakPertandingan(format, buatAcak(benih));
      const b = mainAcakPertandingan(format, buatAcak(benih));
      assert.deepEqual(a, b, `benih ${benih}: tidak deterministik`);

      const target = TARGET_POIN[format];
      assert.ok(a.juara !== null, `benih ${benih}`);
      assert.equal(a.poin[a.juara], target, `benih ${benih}`);
      assert.ok(a.poin[a.juara === 0 ? 1 : 0] < target, `benih ${benih}`);
      assert.ok(a.riwayatPartai.length >= target && a.riwayatPartai.length <= 2 * target - 1, `benih ${benih}`);
    }
  });
}

/** Manusia memilih kartu legal pertama; komputer acak. Setiap layar dirender dan diperiksa. */
function mainkanDenganTampilan(awal: Aplikasi, acak: FungsiAcak): { akhir: Aplikasi; layar: Set<Layar> } {
  let aplikasi = awal;
  const layar = new Set<Layar>();

  for (let i = 0; i < 50000; i++) {
    const sekarang = layarAktif(aplikasi);
    layar.add(sekarang);
    const info = `langkah ${i}, layar ${sekarang}`;

    if (sekarang === 'akhir') {
      bersih(htmlAkhir(ada(aplikasi.pertandingan)), info);
      return { akhir: aplikasi, layar };
    }
    if (sekarang === 'partai-selesai') {
      bersih(htmlPartaiSelesai(ada(aplikasi.pertandingan)), info);
      aplikasi = lanjutkan(aplikasi, acak);
      continue;
    }

    const partai: Partai = ada(partaiAktif(aplikasi));
    bersih(htmlMeja(partai), info);
    if (partai.status === STATUS_RINGKASAN) {
      aplikasi = lanjutkan(aplikasi, acak);
    } else if (partai.status === STATUS_BERJALAN && menungguManusia(partai)) {
      const { kartu, sisi } = ada(kartuLegalPemain(partai.kocokan, PEMAIN_MANUSIA)[0]);
      const pilihan = ada(pilihanKartu(partai, kartu.id));
      assert.ok(
        pilihan.sisi.every((x) => sisi.includes(x)),
        'pilihan sisi harus termasuk sisi legal',
      );
      const sisiDipilih = ada(pilihan.sisi[0]);
      aplikasi = ubahPartaiAktif(aplikasi, (p) => mainkanManusia(p, kartu.id, sisiDipilih));
    } else {
      aplikasi = ubahPartaiAktif(aplikasi, (p) => langkahOtomatis(p, acak));
    }
  }
  throw new Error('Pertandingan tidak selesai');
}

test('manusia + komputer: dari menu sampai layar akhir, semua layar tampil tanpa nilai rusak', () => {
  bersih(htmlMenu(aplikasiBaru().pengaturan), 'menu');

  for (const format of [FORMAT_BO3, FORMAT_BO5] as const) {
    for (let benih = 1; benih <= 5; benih++) {
      const acak = buatAcak(benih);
      const mulai = mulaiPermainan(ubahPengaturan(aplikasiBaru(), { format }), acak);
      assert.equal(layarAktif(mulai), 'meja');

      const { akhir, layar } = mainkanDenganTampilan(mulai, acak);
      const pertandingan = ada(akhir.pertandingan);
      assert.ok(pertandingan.juara !== null, `${format}, benih ${benih}`);
      assert.equal(pertandingan.poin[pertandingan.juara], TARGET_POIN[format], `${format}, benih ${benih}`);
      assert.deepEqual([...layar].sort(), ['akhir', 'meja', 'partai-selesai'], `${format}, benih ${benih}`);
    }
  }
});

test('alur otomatis penuh (komputer menggantikan manusia) memberi hasil yang sama untuk benih yang sama', () => {
  const jalankan = (benih: number): Partai => {
    const acak = buatAcak(benih);
    let partai: Partai = mulaiPartai([0, 0]);
    for (let i = 0; i < 20000 && partai.status !== STATUS_SELESAI; i++) partai = langkahAcakPartai(partai, acak);
    return partai;
  };
  assert.deepEqual(jalankan(99), jalankan(99));
  assert.notDeepEqual(jalankan(99), jalankan(100));
});
