import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buatAcak } from '../src/rng.ts';
import { mulaiPartai, bagiKocokan } from '../src/partai.ts';
import type { Partai, PartaiBerjalan, PartaiRingkasan } from '../src/partai.ts';
import { langkahAcakPartai } from '../src/simulasi.ts';
import { aplikasiBaru, mulaiPermainan, PENGATURAN_BAWAAN } from '../src/controller.ts';
import { htmlMeja, teksPengumuman, kursiPemain } from '../src/tampilan/meja-html.ts';
import { htmlMenu, htmlAkhir, teksRingkasPilihan } from '../src/tampilan/layar-html.ts';
import type { Pertandingan } from '../src/pertandingan.ts';

const hitung = (teks: string, pola: RegExp): number => (teks.match(pola) ?? []).length;

function partaiBerjalan(benih: number, langkah: number): PartaiBerjalan {
  const acak = buatAcak(benih);
  let partai: Partai = bagiKocokan(mulaiPartai([0, 0]), acak);
  for (let i = 0; i < langkah && partai.status === 'berjalan'; i++) partai = langkahAcakPartai(partai, acak);
  assert.ok(partai.status === 'berjalan');
  return partai;
}

/** Mencari kocokan yang berakhir (ringkasan); `denganBonus` memilih yang berbonus. */
function ringkasan(denganBonus: boolean): PartaiRingkasan {
  for (let benih = 1; benih < 500; benih++) {
    const acak = buatAcak(benih);
    let partai: Partai = bagiKocokan(mulaiPartai([0, 0]), acak);
    while (partai.status === 'berjalan') partai = langkahAcakPartai(partai, acak);
    if (
      partai.status === 'ringkasan' &&
      (partai.hasilTerakhir.bonus !== null) === denganBonus &&
      partai.hasilTerakhir.tambahan.some((t) => t > 0)
    ) {
      return partai;
    }
  }
  throw new Error('tidak ada kocokan yang cocok');
}

test('giliran: hanya kursi yang sedang jalan bertanda, tangan Anda bertanda pada giliran Anda', () => {
  for (let benih = 1; benih <= 30; benih++) {
    const partai = partaiBerjalan(benih, benih % 9);
    const html = htmlMeja(partai);
    const lawanBergiliran = hitung(html, /class="lawan \w+ giliran"/g);
    assert.equal(lawanBergiliran, partai.kocokan.giliran === 0 ? 0 : 1, `benih ${benih}`);
    assert.equal(/class="tangan giliran"/.test(html), partai.kocokan.giliran === 0, `benih ${benih}`);
    if (partai.kocokan.giliran !== 0) assert.match(html, /class="berpikir"/);
  }
});

test('kartu terbaru: hanya satu kartu bertanda baru beserta arah datangnya; tanpa opsi tidak ada tanda', () => {
  const partai = partaiBerjalan(4, 6);
  const id = partai.kocokan.meja.rangkaian[1]?.kartu.id ?? '';
  const html = htmlMeja(partai, { terbaru: { id, dari: 'barat' } });
  assert.equal(hitung(html, /data-baru="1"/g), 1);
  assert.match(html, /data-baru="1" data-dari="barat"/);
  assert.equal(hitung(htmlMeja(partai), /data-baru/g), 0);
  assert.equal(kursiPemain(0), 'selatan');
  assert.equal(kursiPemain(2), 'utara');
});

test('bagi: kelas animasi hanya saat diminta', () => {
  const partai = partaiBerjalan(2, 0);
  assert.match(htmlMeja(partai, { bagi: true }), /class="meja bagi-baru"/);
  assert.doesNotMatch(htmlMeja(partai), /bagi-baru/);
});

test('dialog: konfirmasi keluar dan jeda memakai tirai dengan tombol fokus awal; tanpa keduanya tidak ada tirai', () => {
  const partai = partaiBerjalan(3, 3);
  assert.doesNotMatch(htmlMeja(partai), /class="tirai"/);
  const konfirmasi = htmlMeja(partai, { konfirmasi: true });
  assert.match(konfirmasi, /role="alertdialog"/);
  assert.match(konfirmasi, /data-aksi="batal-keluar" data-fokus/);
  assert.match(konfirmasi, /data-aksi="keluar"/);
  const jeda = htmlMeja(partai, { dijeda: true });
  assert.match(jeda, /role="dialog"[^>]*>.*Dijeda/s);
  assert.match(jeda, /data-aksi="jeda" data-fokus>Lanjut main/);
});

test('ringkasan kocokan: tambahan markah muncul di papan, cap bonus hanya bila ada bonus', () => {
  const biasa = ringkasan(false);
  const htmlBiasa = htmlMeja(biasa);
  assert.equal(hitung(htmlBiasa, /class="tambah"/g), biasa.hasilTerakhir.tambahan.filter((t) => t > 0).length);
  assert.doesNotMatch(htmlBiasa, /cap-bonus/);
  const berbonus = ringkasan(true);
  const bonus = berbonus.hasilTerakhir.bonus;
  assert.ok(bonus !== null);
  assert.match(htmlMeja(berbonus), new RegExp(`class="cap-bonus" aria-hidden="true">${bonus.jenis} \\+${bonus.nilai}<`));
  // Selama kocokan berjalan tidak ada tambahan.
  assert.doesNotMatch(htmlMeja(partaiBerjalan(1, 4)), /class="tambah"/);
});

test('pengumuman untuk pembaca layar: polos, memuat langkah terakhir dan giliran', () => {
  const partai = partaiBerjalan(5, 5);
  const teks = teksPengumuman(partai);
  assert.doesNotMatch(teks, /[<>]/);
  assert.match(teks, /memainkan|lewat/);
  assert.match(teks, /Giliran/);
  assert.match(teksPengumuman(ringkasan(false)), /menghabiskan kartu|Tabrak/);
});

test('menu: denah duduk dan ringkasan pilihan; pemain baru melihat Cara bermain terbuka dan saran Latihan', () => {
  const baru = htmlMenu(PENGATURAN_BAWAAN);
  assert.match(baru, /class="denah"/);
  assert.match(baru, /Anda di selatan, Utara mitra Anda/);
  assert.match(baru, /<details class="aturan" open>/);
  assert.match(baru, /Baru pertama kali\?/);
  assert.match(baru, /Pertandingan · Terbaik dari 3 · Lawan Mudah/);
  const lama = htmlMenu({ ...PENGATURAN_BAWAAN, pernahMain: true, mode: 'latihan', ai: 'sulit', format: 'bo5' });
  assert.doesNotMatch(lama, /<details class="aturan" open>/);
  assert.doesNotMatch(lama, /Baru pertama kali/);
  assert.match(lama, /Latihan · Terbaik dari 5 · Lawan Sulit/);
  assert.equal(teksRingkasPilihan({ ...PENGATURAN_BAWAAN }), 'Pertandingan · Terbaik dari 3 · Lawan Mudah');
});

test('menekan Main menandai pemain sudah pernah main', () => {
  assert.equal(aplikasiBaru().pengaturan.pernahMain, false);
  assert.equal(mulaiPermainan(aplikasiBaru(), buatAcak(1)).pengaturan.pernahMain, true);
});

test('layar akhir: konfeti hanya bila tim Anda juara', () => {
  const dasar = (juara: 0 | 1): Pertandingan => {
    const a = mulaiPermainan(aplikasiBaru(), buatAcak(1));
    const t = a.pertandingan;
    assert.ok(t !== null);
    return { ...t, juara };
  };
  assert.equal(hitung(htmlAkhir(dasar(0)), /<span style="left:/g), 30);
  assert.doesNotMatch(htmlAkhir(dasar(1)), /konfeti/);
});

test('garis bantu pengembangan: batas area, margin, kerangka, dan sumbu hanya saat diminta', () => {
  const partai = partaiBerjalan(4, 6);
  const html = htmlMeja(partai, { garis: true });
  assert.match(html, /class="rangkaian-svg dengan-garis"/);
  for (const kelas of ['gb-area', 'gb-margin', 'gb-kerangka']) assert.equal(hitung(html, new RegExp(`class="${kelas}"`, 'g')), 1, kelas);
  assert.equal(hitung(html, /class="gb-sumbu"/g), 2);
  assert.doesNotMatch(htmlMeja(partai), /garis-bantu|dengan-garis/);
});
