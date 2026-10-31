import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buatAcak } from '../src/rng.ts';
import { TARGET_POIN } from '../src/pertandingan.ts';
import { STATUS_BERJALAN, STATUS_RINGKASAN } from '../src/partai.ts';
import { kartuLegalPemain } from '../src/kocokan.ts';
import type { Aplikasi, Layar } from '../src/controller.ts';
import type { FungsiAcak } from '../src/rng.ts';
import type { NomorTim } from '../src/engine.ts';
import { ada } from '../bantu/bantuan-tes.ts';

const lawan = (tim: NomorTim): NomorTim => (tim === 0 ? 1 : 0);
import {
  PEMAIN_MANUSIA,
  PENGATURAN_BAWAAN,
  rapikanPengaturan,
  aplikasiBaru,
  mulaiPermainan,
  kembaliKeMenu,
  ubahPengaturan,
  layarAktif,
  partaiAktif,
  nomorPartai,
  ubahPartaiAktif,
  lanjutkan,
  menungguManusia,
  langkahOtomatis,
  mainkanManusia,
} from '../src/controller.ts';
import { htmlMenu, htmlPartaiSelesai, htmlAkhir } from '../src/tampilan/layar-html.ts';
import { htmlMeja } from '../src/tampilan/meja-html.ts';

/** Memainkan sampai layar yang diminta tercapai. Manusia memilih kartu legal pertama. */
function mainSampai(awal: Aplikasi, acak: FungsiAcak, layar: Layar, catat: (layar: Layar) => void = () => {}): Aplikasi {
  let aplikasi = awal;
  for (let i = 0; i < 50000; i++) {
    const sekarang = layarAktif(aplikasi);
    catat(sekarang);
    if (sekarang === layar) return aplikasi;
    if (sekarang === 'meja') {
      const partai = ada(partaiAktif(aplikasi));
      if (partai.status === STATUS_RINGKASAN) aplikasi = lanjutkan(aplikasi, acak);
      else if (partai.status === STATUS_BERJALAN && menungguManusia(partai)) {
        const { kartu, sisi } = ada(kartuLegalPemain(partai.kocokan, PEMAIN_MANUSIA)[0]);
        const sisiPertama = ada(sisi[0]);
        aplikasi = ubahPartaiAktif(aplikasi, (p) => mainkanManusia(p, kartu.id, sisiPertama));
      } else aplikasi = ubahPartaiAktif(aplikasi, (p) => langkahOtomatis(p, acak));
    } else {
      aplikasi = lanjutkan(aplikasi, acak);
    }
  }
  throw new Error(`Layar ${layar} tidak tercapai`);
}

test('aplikasi baru ada di menu dengan pengaturan bawaan', () => {
  const a = aplikasiBaru();
  assert.equal(layarAktif(a), 'menu');
  assert.deepEqual(a.pengaturan, PENGATURAN_BAWAAN);
  assert.equal(a.pertandingan, null);
});

test('ubahPengaturan merapikan nilai dan tidak mengubah state lama', () => {
  const a = aplikasiBaru();
  const b = ubahPengaturan(a, { format: 'bo5' });
  assert.equal(b.pengaturan.format, 'bo5');
  assert.equal(a.pengaturan.format, 'bo3');
  // @ts-expect-error sengaja salah: format tidak dikenal harus diganti bawaan
  assert.equal(ubahPengaturan(a, { format: 'bo9' }).pengaturan.format, 'bo3');
  // @ts-expect-error sengaja salah: tingkat AI tidak dikenal
  assert.equal(ubahPengaturan(a, { ai: 'dewa' }).pengaturan.ai, 'mudah');
  assert.equal(ubahPengaturan(a, { ai: 'sulit' }).pengaturan.ai, 'sulit');
  // @ts-expect-error sengaja salah: mode tidak dikenal
  assert.equal(ubahPengaturan(a, { mode: 'turnamen' }).pengaturan.mode, 'pertandingan');
  assert.equal(ubahPengaturan(a, { mode: 'latihan', suara: true }).pengaturan.mode, 'latihan');
  assert.equal(ubahPengaturan(a, { ai: 'sedang' }).pengaturan.ai, 'sedang');
  assert.equal(ubahPengaturan(a, { bantuan: true }).pengaturan.bantuan, true);
});

test('Main memulai pertandingan sesuai format dengan kocokan pertama sudah dibagi', () => {
  for (const format of ['bo3', 'bo5'] as const) {
    const a = mulaiPermainan(ubahPengaturan(aplikasiBaru(), { format }), buatAcak(1));
    assert.equal(layarAktif(a), 'meja');
    assert.equal(ada(a.pertandingan).format, format);
    assert.equal(ada(partaiAktif(a)).status, STATUS_BERJALAN);
    assert.equal(ada(partaiAktif(a)).nomorKocokan, 1);
    assert.equal(nomorPartai(a), 1);
  }
});

test('kembaliKeMenu mempertahankan pengaturan dan membuang pertandingan', () => {
  const a = mulaiPermainan(ubahPengaturan(aplikasiBaru(), { format: 'bo5' }), buatAcak(1));
  const b = kembaliKeMenu(a);
  assert.equal(layarAktif(b), 'menu');
  assert.equal(b.pengaturan.format, 'bo5');
});

test('lanjutkan di menu atau di tengah kocokan melempar Error', () => {
  assert.throws(() => lanjutkan(aplikasiBaru(), buatAcak(1)), /menu/);
  const a = mulaiPermainan(aplikasiBaru(), buatAcak(1));
  assert.throws(() => lanjutkan(a, buatAcak(1)), /meja/);
});

for (const format of ['bo3', 'bo5'] as const) {
  test(`${format}: 60 pertandingan penuh lewat alur aplikasi berakhir dengan juara yang sah`, () => {
    const juara: [number, number] = [0, 0];
    for (let benih = 1; benih <= 60; benih++) {
      const acak = buatAcak(benih);
      const urutan: Layar[] = [];
      const akhir = mainSampai(mulaiPermainan(ubahPengaturan(aplikasiBaru(), { format }), acak), acak, 'akhir', (layar) => {
        if (urutan.at(-1) !== layar) urutan.push(layar);
      });
      const t = ada(akhir.pertandingan);
      assert.ok(t.juara !== null, 'harus ada juara');
      const info = `${format}, benih ${benih}`;
      assert.equal(t.poin[t.juara], TARGET_POIN[format], info);
      assert.ok(t.poin[lawan(t.juara)] < TARGET_POIN[format], info);
      assert.equal(t.partai, null, info);
      // Urutan layar: meja -> partai-selesai -> meja ... -> partai-selesai -> akhir
      assert.equal(urutan[0], 'meja', info);
      assert.equal(urutan.at(-1), 'akhir', info);
      assert.equal(urutan.filter((l) => l === 'partai-selesai').length, t.riwayatPartai.length, info);
      juara[t.juara]++;
    }
    assert.ok(juara[0] > 0 && juara[1] > 0, JSON.stringify(juara));
  });
}

test('nomor partai naik tiap partai selesai dan poin dibawa ke partai berikutnya', () => {
  const acak = buatAcak(3);
  let a = mulaiPermainan(ubahPengaturan(aplikasiBaru(), { format: 'bo5' }), acak);
  a = mainSampai(a, acak, 'partai-selesai');
  assert.equal(nomorPartai(a), 1);
  const selesai = ada(partaiAktif(a));
  assert.ok(selesai.status === 'selesai');
  const menang = selesai.pemenang.menang;
  a = lanjutkan(a, acak);
  assert.equal(layarAktif(a), 'meja');
  assert.equal(nomorPartai(a), 2);
  assert.equal(ada(a.pertandingan).poin[menang], 1);
  assert.deepEqual(ada(partaiAktif(a)).poin, ada(a.pertandingan).poin); // partai baru memakai poin terbaru untuk pembuka
  assert.deepEqual(ada(partaiAktif(a)).markah, [0, 0]);
});

// ---------------------------------------------------------------------------
// Layar
// ---------------------------------------------------------------------------

test('menu: format dan lawan terpilih sesuai pengaturan, tingkat yang belum ada dinonaktifkan', () => {
  const html = htmlMenu({ format: 'bo5', ai: 'mudah', bantuan: false, mode: 'pertandingan', suara: true });
  assert.match(html, /name="format" value="bo5" checked/);
  assert.doesNotMatch(html, /name="format" value="bo3" checked/);
  assert.match(html, /name="ai" value="mudah" checked/);
  assert.match(html, /name="ai" value="sedang"(?! disabled)/);
  assert.match(html, /name="ai" value="sulit"(?! disabled)/);
  assert.match(html, /name="mode" value="pertandingan" checked/);
  assert.match(
    htmlMenu({ format: 'bo3', ai: 'mudah', bantuan: false, mode: 'latihan', suara: true }),
    /name="mode" value="latihan" checked/,
  );
  assert.match(html, /data-aksi="main"/);
  assert.match(html, /Aturan singkat/);
});

test('menu: aturan singkat memuat angka bonus dan batas markah yang sama dengan mesin', () => {
  const html = htmlMenu(PENGATURAN_BAWAAN);
  assert.match(html, /double[^<]*\+20/);
  assert.match(html, /triplet[^<]*\+30/);
  assert.match(html, /quartet[^<]*\+50/);
  assert.match(html, /mencapai 100 kalah partai/);
});

test('layar akhir partai: menampilkan poin baru, dan tombol berubah bila partai ini penentu', () => {
  const acak = buatAcak(5);
  let a = mulaiPermainan(ubahPengaturan(aplikasiBaru(), { format: 'bo3' }), acak);
  a = mainSampai(a, acak, 'partai-selesai');
  const html = htmlPartaiSelesai(ada(a.pertandingan));
  assert.match(html, /Partai 1 selesai/);
  assert.match(html, /Partai berikutnya|Lihat hasil/);
  assert.match(html, /data-aksi="lanjut"/);
  assert.match(html, /\(target 2\)/);

  // Partai penentu: tombolnya "Lihat hasil".
  const acak2 = buatAcak(5);
  let b = mulaiPermainan(ubahPengaturan(aplikasiBaru(), { format: 'bo3' }), acak2);
  let penentu = false;
  for (let i = 0; i < 5 && !penentu; i++) {
    b = mainSampai(b, acak2, 'partai-selesai');
    if (/Lihat hasil/.test(htmlPartaiSelesai(ada(b.pertandingan)))) penentu = true;
    else b = lanjutkan(b, acak2);
  }
  assert.ok(penentu, 'partai terakhir harus berlabel Lihat hasil');
  assert.equal(ada(lanjutkan(b, acak2).pertandingan).juara !== null, true);
});

test('layar akhir pertandingan: juara, skor, riwayat tiap partai, dan dua tombol', () => {
  const acak = buatAcak(8);
  const a = mainSampai(mulaiPermainan(ubahPengaturan(aplikasiBaru(), { format: 'bo3' }), acak), acak, 'akhir');
  const t = ada(a.pertandingan);
  const html = htmlAkhir(t);
  assert.match(html, t.juara === 0 ? /Tim Anda juara!/ : /Lawan juara\./);
  assert.equal((html.match(/<li>Partai \d+:/g) ?? []).length, t.riwayatPartai.length);
  assert.match(html, /data-aksi="main-lagi"/);
  assert.match(html, /data-aksi="menu"/);
});

test('meja: tombol Menu ada di bar atas', () => {
  const a = mulaiPermainan(aplikasiBaru(), buatAcak(2));
  assert.match(htmlMeja(ada(partaiAktif(a))), /data-aksi="menu">Menu</);
});

test('di menu, nomorPartai dan ubahPartaiAktif menolak karena belum ada pertandingan', () => {
  const a = aplikasiBaru();
  assert.throws(() => nomorPartai(a), /Belum ada pertandingan/);
  assert.throws(() => ubahPartaiAktif(a, (p) => p), /Belum ada pertandingan/);
});

test('rapikanPengaturan menerima sampah apa pun dan selalu mengembalikan pengaturan sah', () => {
  for (const mentah of [undefined, null, 5, 'bo5', [], {}, { format: 5, ai: null }, { format: 'bo5' }]) {
    const hasil = rapikanPengaturan(mentah);
    assert.ok(hasil.format === 'bo3' || hasil.format === 'bo5');
    assert.equal(hasil.ai, 'mudah');
  }
  assert.equal(rapikanPengaturan({ format: 'bo5' }).format, 'bo5');
  // Bantuan hanya boolean sungguhan; selain itu bawaan (mati).
  assert.equal(rapikanPengaturan({ bantuan: true }).bantuan, true);
  for (const aneh of ['ya', 1, null, {}, []]) assert.equal(rapikanPengaturan({ bantuan: aneh }).bantuan, false);
});
