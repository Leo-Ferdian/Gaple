import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buatAcak } from '../src/rng.ts';
import { mulaiPartai, bagiKocokan } from '../src/partai.ts';
import type { Partai, PartaiBerjalan } from '../src/partai.ts';
import type { NomorPemain } from '../src/engine.ts';
import { langkahAcakPartai } from '../src/simulasi.ts';
import { kartuLegalPemain } from '../src/kocokan.ts';
import { svgKartu, svgPunggung, ARAH_DATAR } from '../src/tampilan/kartu-svg.ts';
import { htmlMeja, PEMAIN_MANUSIA } from '../src/tampilan/meja-html.ts';
import { menungguManusia, saranManusia } from '../src/controller.ts';

const hitung = (teks: string, pola: RegExp): number => (teks.match(pola) ?? []).length;

// ---------------------------------------------------------------------------
// Kartu SVG
// ---------------------------------------------------------------------------

test('jumlah titik pada kartu = a + b, untuk semua 28 kartu dan kedua arah', () => {
  for (let a = 0; a <= 6; a++) {
    for (let b = a; b <= 6; b++) {
      assert.equal(hitung(svgKartu(a, b), /class="titik"/g), a + b, `${a}-${b} tegak`);
      assert.equal(hitung(svgKartu(a, b, ARAH_DATAR), /class="titik"/g), a + b, `${a}-${b} datar`);
    }
  }
});

test('kartu memuat label aksesibilitas dan ukuran sesuai arah', () => {
  assert.match(svgKartu(2, 5), /aria-label="Kartu 2-5"/);
  assert.match(svgKartu(2, 5), /viewBox="0 0 60 120"/);
  assert.match(svgKartu(2, 5, ARAH_DATAR), /viewBox="0 0 120 60"/);
});

test('angka atau arah tidak sah ditolak', () => {
  assert.throws(() => svgKartu(7, 0), RangeError);
  assert.throws(() => svgKartu(-1, 0), RangeError);
  assert.throws(() => svgKartu(1.5, 0), RangeError);
  // @ts-expect-error sengaja salah: arah tidak dikenal
  assert.throws(() => svgKartu(1, 2, 'miring'), RangeError);
  // @ts-expect-error sengaja salah: arah tidak dikenal
  assert.throws(() => svgPunggung('miring'), RangeError);
});

test('punggung kartu tidak membuka angkanya', () => {
  const punggung = svgPunggung();
  assert.equal(hitung(punggung, /class="titik"/g), 0);
  assert.doesNotMatch(punggung, /aria-label/);
});

// ---------------------------------------------------------------------------
// Meja
// ---------------------------------------------------------------------------

function sampaiGilirannya(benih: number, langkah: number): PartaiBerjalan {
  const acak = buatAcak(benih);
  let partai: Partai = bagiKocokan(mulaiPartai([0, 0]), acak);
  for (let i = 0; i < 200 && partai.status === 'berjalan' && (i < langkah || partai.kocokan.giliran !== PEMAIN_MANUSIA); i++) {
    partai = langkahAcakPartai(partai, acak);
  }
  assert.ok(partai.status === 'berjalan', 'kocokan harus masih berjalan');
  return partai;
}

test('meja: tangan Anda berupa tombol, yang aktif tepat kartu legal', () => {
  for (let benih = 1; benih <= 40; benih++) {
    const partai = sampaiGilirannya(benih, benih % 15);
    if (partai.status !== 'berjalan') continue;
    const html = htmlMeja(partai);
    const legal = kartuLegalPemain(partai.kocokan, PEMAIN_MANUSIA)
      .map((p) => p.kartu.id)
      .sort();
    const aktif = [...html.matchAll(/class="kartu-tangan legal" data-kartu="([^"]+)">/g)].map((m) => m[1]).sort();
    assert.deepEqual(aktif, legal, `benih ${benih}`);
    assert.equal(hitung(html, /class="kartu-tangan /g), partai.kocokan.tangan[0].length, `benih ${benih}`);
    assert.equal(hitung(html, /class="kartu-tangan redup" data-kartu="[^"]+" disabled>/g), partai.kocokan.tangan[0].length - legal.length);
  }
});

test('meja: bukan giliran Anda, semua kartu tangan dinonaktifkan', () => {
  const acak = buatAcak(5);
  const partai = bagiKocokan(mulaiPartai([0, 0]), acak);
  if (partai.kocokan.giliran === PEMAIN_MANUSIA) return; // benih ini kebetulan Anda yang membuka
  const html = htmlMeja(partai);
  assert.equal(hitung(html, /class="kartu-tangan legal"/g), 0);
  assert.match(html, /Giliran (Lawan Kiri|Rekan|Lawan Kanan)/);
});

test('meja: rangkaian menampilkan semua kartu dan menandai dua ujung', () => {
  const partai = sampaiGilirannya(7, 14);
  const html = htmlMeja(partai);
  assert.equal(hitung(html, /class="letak/g), partai.kocokan.meja.rangkaian.length);
  assert.equal(hitung(html, /class="letak ujung"/g), 2);
  assert.match(html, new RegExp(`ujung kiri ${partai.kocokan.meja.ujungKiri}, ujung kanan ${partai.kocokan.meja.ujungKanan}`));
});

test('meja: lawan hanya tampil sebagai punggung dengan jumlah sisa kartunya', () => {
  const partai = sampaiGilirannya(7, 14);
  const html = htmlMeja(partai);
  const lawan: [NomorPemain, string][] = [
    [1, 'Lawan Kiri'],
    [2, 'Rekan'],
    [3, 'Lawan Kanan'],
  ];
  for (const [pemain, nama] of lawan) {
    assert.match(html, new RegExp(`aria-label="${nama}, ${partai.kocokan.tangan[pemain].length} kartu"`));
  }
  // Titik hanya muncul di kartu tangan Anda dan di meja, tidak pernah di kartu lawan.
  const jumlahTitikDiTangan = partai.kocokan.tangan[0].reduce((s, k) => s + k.a + k.b, 0);
  const jumlahTitikDiMeja = partai.kocokan.meja.rangkaian.reduce((s, l) => s + l.kiri + l.kanan, 0);
  assert.equal(hitung(html, /class="titik"/g), jumlahTitikDiTangan + jumlahTitikDiMeja);
});

test('meja: bar atas memuat markah, poin, nomor partai dan kocokan', () => {
  const partai = sampaiGilirannya(3, 5);
  const html = htmlMeja({ ...partai, markah: [37, 12], poin: [1, 0] }, { nomorPartai: 2 });
  assert.match(html, /Kita<\/span><span class="angka">37</);
  assert.match(html, /Lawan<\/span><span class="angka">12</);
  assert.match(html, /Poin 1-0 · Partai 2 · Kocokan 1/);
  assert.match(html, /width:37%/);
});

test('meja kosong di awal kocokan', () => {
  const partai = bagiKocokan(mulaiPartai([0, 0]), buatAcak(2));
  assert.match(htmlMeja(partai), /Meja masih kosong/);
});

test('htmlMeja menolak partai tanpa kocokan', () => {
  assert.throws(() => htmlMeja(mulaiPartai([0, 0])), /Tidak ada kocokan/);
});

test('meja: panel bantuan hitung hanya tampil bila diminta, berisi sisa per angka dan peluang tiga pemain lain', () => {
  const partai = sampaiGilirannya(7, 14);
  assert.equal(partai.status, 'berjalan');
  assert.doesNotMatch(htmlMeja(partai), /class="bantuan"/);
  const html = htmlMeja(partai, { bantuan: true });
  assert.match(html, /class="bantuan"/);
  assert.equal(hitung(html, /class="angka-sisa"/g), 7);
  for (const nama of ['Lawan Kiri', 'Rekan', 'Lawan Kanan']) assert.match(html, new RegExp(`<th scope="row">${nama}</th>`));
  assert.doesNotMatch(html, /<th scope="row">Anda/);
  assert.doesNotMatch(html, /undefined|NaN/);
  for (const m of html.matchAll(/<td>(\d+)%<\/td>/g)) assert.ok(Number(m[1]) >= 0 && Number(m[1]) <= 100);
});

test('meja: panel bantuan tidak membocorkan tangan lawan (tampilan sama bila tangan lawan ditukar)', () => {
  const partai = sampaiGilirannya(7, 14);
  if (partai.status !== 'berjalan') throw new Error('partai harus berjalan');
  const { kocokan } = partai;
  const t = kocokan.tangan;
  // Tukar satu kartu antara Barat dan Utara (jumlah kartu tiap pemain tetap).
  const [b0, u0] = [t[1][0], t[2][0]];
  if (b0 === undefined || u0 === undefined) throw new Error('Barat dan Utara harus punya kartu');
  const tukar = { ...partai, kocokan: { ...kocokan, tangan: [t[0], [u0, ...t[1].slice(1)], [b0, ...t[2].slice(1)], t[3]] as const } };
  const ambil = (html: string): string =>
    html.slice(html.indexOf('class="bantuan"'), html.indexOf('</section>', html.indexOf('class="bantuan"')));
  assert.equal(ambil(htmlMeja(tukar, { bantuan: true })), ambil(htmlMeja(partai, { bantuan: true })));
});

test('meja: mode Latihan menampilkan tombol Saran dan Bantuan hitung; mode biasa tidak', () => {
  let ada = 0;
  for (let benih = 1; benih <= 40; benih++) {
    const partai = sampaiGilirannya(benih, benih % 15);
    if (partai.status !== 'berjalan' || !menungguManusia(partai)) continue;
    ada++;
    const latihan = htmlMeja(partai, { latihan: true });
    assert.match(latihan, /data-aksi="saran"/);
    assert.match(latihan, /class="bantuan"/);
    assert.match(latihan, /Latihan · Poin/);
    const biasa = htmlMeja(partai);
    assert.doesNotMatch(biasa, /data-aksi="saran"|class="bantuan"|Latihan/);
  }
  assert.ok(ada > 5);
});

test('meja: saran menyorot kartu yang disarankan dan menyebut sisinya; tombol Saran hilang', () => {
  for (let benih = 1; benih <= 40; benih++) {
    const partai = sampaiGilirannya(benih, benih % 15);
    if (partai.status !== 'berjalan' || !menungguManusia(partai)) continue;
    const saran = saranManusia(partai, buatAcak(benih));
    if (saran === null) throw new Error('harus ada saran');
    const html = htmlMeja(partai, { latihan: true, saran });
    assert.equal(hitung(html, /class="kartu-tangan legal[^"]* saran"/g), 1);
    assert.match(html, new RegExp(`class="kartu-tangan legal[^"]* saran" data-kartu="${saran.kartu.id}"`));
    assert.match(html, new RegExp(`Saran: kartu ${saran.kartu.a}-${saran.kartu.b} `));
    assert.doesNotMatch(html, /data-aksi="saran"/);
    return;
  }
  throw new Error('tidak ada keadaan untuk diuji');
});

test('meja: bukan giliran Anda, tombol Saran tidak tampil walau mode Latihan', () => {
  const acak = buatAcak(5);
  const partai = bagiKocokan(mulaiPartai([0, 0]), acak);
  if (partai.kocokan.giliran === PEMAIN_MANUSIA) return;
  assert.doesNotMatch(htmlMeja(partai, { latihan: true }), /data-aksi="saran"/);
});
