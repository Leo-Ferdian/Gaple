import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buatAcak } from '../src/rng.ts';
import { aplikasiBaru, mulaiPermainan, layarAktif, lanjutkan, ubahPartaiAktif, partaiAktif } from '../src/controller.ts';
import type { Aplikasi } from '../src/controller.ts';
import { langkahAcakPartai } from '../src/simulasi.ts';
import { KUNCI_SIMPANAN, muatSimpanan, simpanPertandingan, hapusSimpanan, ringkasSimpanan, adalahPertandingan } from '../src/simpanan.ts';
import type { Penyimpanan } from '../src/penyimpanan.ts';
import { ada } from '../bantu/bantuan-tes.ts';

function penyimpananPalsu(isi: Record<string, string> = {}): Penyimpanan & { data: Map<string, string> } {
  const data = new Map<string, string>(Object.entries(isi));
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
    data,
  };
}

const rusak: Penyimpanan = {
  getItem() {
    throw new Error('dilarang');
  },
  setItem() {
    throw new Error('penuh');
  },
  removeItem() {
    throw new Error('dilarang');
  },
};

/** Satu pertandingan acak penuh, sambil menyerahkan tiap keadaan sebelum ada juara ke `periksa`. */
function mainDanPeriksa(benih: number, periksa: (a: Aplikasi) => void): void {
  const acak = buatAcak(benih);
  let a = mulaiPermainan(aplikasiBaru(), acak);
  for (let i = 0; i < 5000 && layarAktif(a) !== 'akhir'; i++) {
    periksa(a);
    const layar = layarAktif(a);
    const partai = partaiAktif(a);
    a =
      layar === 'partai-selesai' || partai?.status === 'ringkasan'
        ? lanjutkan(a, acak)
        : ubahPartaiAktif(a, (p) => langkahAcakPartai(p, acak));
  }
  assert.equal(layarAktif(a), 'akhir');
}

test('simpan lalu muat mengembalikan pertandingan yang sama di setiap keadaan (berjalan, ringkasan, partai selesai)', () => {
  const status = new Set<string>();
  for (const benih of [1, 2, 3]) {
    mainDanPeriksa(benih, (a) => {
      const t = a.pertandingan;
      if (t === null || t.juara !== null) return;
      const s = penyimpananPalsu();
      assert.equal(simpanPertandingan(s, { id: 'x', ai: 'sedang', mode: 'latihan', pertandingan: t }), true);
      const muat = muatSimpanan(s);
      assert.ok(muat !== null, `gagal dimuat pada status ${t.partai?.status}`);
      assert.equal(JSON.stringify(muat.pertandingan), JSON.stringify(t));
      assert.equal(muat.ai, 'sedang');
      assert.equal(muat.mode, 'latihan');
      assert.equal(muat.id, 'x');
      status.add(t.partai?.status ?? 'null');
    });
  }
  for (const nama of ['berjalan', 'ringkasan', 'selesai']) assert.ok(status.has(nama), `status ${nama} tidak teruji`);
});

function contoh(): Aplikasi {
  const acak = buatAcak(5);
  let a = mulaiPermainan(aplikasiBaru(), acak);
  for (let i = 0; i < 10; i++) a = ubahPartaiAktif(a, (p) => langkahAcakPartai(p, acak));
  return a;
}

const adalahRekaman = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Pertandingan contoh sebagai data JSON yang boleh dirusak; `ubah` menerima objek aslinya (bukan salinan dangkal). */
function simpanRusak(ubah: (t: Record<string, unknown>) => void): string {
  const t: unknown = JSON.parse(JSON.stringify(ada(contoh().pertandingan)));
  if (!adalahRekaman(t)) throw new Error('bentuk tak terduga');
  ubah(t);
  return JSON.stringify({ versi: 1, id: 'x', ai: 'mudah', mode: 'pertandingan', pertandingan: t });
}

/** Objek bersarang pada jalur kunci dari objek `akar` (mengembalikan objek ASLI di dalamnya agar bisa diubah). */
function dalam(akar: Record<string, unknown>, ...jalur: string[]): Record<string, unknown> {
  let sekarang: Record<string, unknown> = akar;
  for (const kunci of jalur) {
    const berikut = sekarang[kunci];
    if (!adalahRekaman(berikut)) throw new Error(`tidak ada: ${kunci}`);
    sekarang = berikut;
  }
  return sekarang;
}

test('data simpanan yang rusak atau tidak masuk akal ditolak', () => {
  const tolak = (teks: string, nama: string): void => assert.equal(muatSimpanan(penyimpananPalsu({ [KUNCI_SIMPANAN]: teks })), null, nama);
  tolak('bukan json {{{', 'bukan json');
  tolak('null', 'null');
  tolak('[]', 'larik');
  tolak(JSON.stringify({ versi: 2, id: 'x', ai: 'mudah', mode: 'pertandingan', pertandingan: ada(contoh().pertandingan) }), 'versi lain');
  tolak(
    JSON.stringify({ versi: 1, id: 'x', ai: 'dewa', mode: 'pertandingan', pertandingan: ada(contoh().pertandingan) }),
    'ai tak dikenal',
  );
  tolak(JSON.stringify({ versi: 1, ai: 'mudah', mode: 'pertandingan', pertandingan: ada(contoh().pertandingan) }), 'tanpa id');
  tolak(
    simpanRusak((t) => (t.juara = 0)),
    'sudah ada juara',
  );
  tolak(
    simpanRusak((t) => (t.format = 'bo7')),
    'format salah',
  );
  tolak(
    simpanRusak((t) => (t.target = 9)),
    'target tak cocok format',
  );
  tolak(
    simpanRusak((t) => {
      const tangan = dalam(t, 'partai', 'kocokan').tangan;
      if (!Array.isArray(tangan) || !Array.isArray(tangan[0]) || !Array.isArray(tangan[1])) throw new Error('tangan tak terduga');
      tangan[0][0] = tangan[1][0];
    }),
    'kartu ganda',
  );
  tolak(
    simpanRusak((t) => {
      const meja = dalam(t, 'partai', 'kocokan', 'meja');
      meja.ujungKiri = typeof meja.ujungKiri === 'number' ? (meja.ujungKiri + 1) % 7 : 0;
    }),
    'ujung meja tak cocok',
  );
  tolak(
    simpanRusak((t) => (dalam(t, 'partai').status = 'siap')),
    'status partai siap',
  );
  tolak(
    simpanRusak((t) => (dalam(t, 'partai', 'kocokan').giliran = 7)),
    'giliran di luar 0 sampai 3',
  );
});

test('hapus, penyimpanan kosong, tidak ada, atau menolak tidak membuat game gagal', () => {
  const s = penyimpananPalsu();
  simpanPertandingan(s, { id: 'a', ai: 'mudah', mode: 'pertandingan', pertandingan: ada(contoh().pertandingan) });
  assert.ok(muatSimpanan(s) !== null);
  hapusSimpanan(s);
  assert.equal(muatSimpanan(s), null);
  assert.equal(muatSimpanan(null), null);
  assert.equal(muatSimpanan(rusak), null);
  assert.equal(simpanPertandingan(null, { id: 'a', ai: 'mudah', mode: 'pertandingan', pertandingan: ada(contoh().pertandingan) }), false);
  assert.equal(simpanPertandingan(rusak, { id: 'a', ai: 'mudah', mode: 'pertandingan', pertandingan: ada(contoh().pertandingan) }), false);
  assert.doesNotThrow(() => hapusSimpanan(rusak));
  assert.doesNotThrow(() => hapusSimpanan(null));
});

test('keterangan simpanan menyebut partai, poin, markah, dan lawan', () => {
  const s = penyimpananPalsu();
  simpanPertandingan(s, { id: 'a', ai: 'sulit', mode: 'pertandingan', pertandingan: ada(contoh().pertandingan) });
  assert.match(ringkasSimpanan(ada(muatSimpanan(s))), /^Partai 1 · poin 0-0 · markah \d+-\d+ · Lawan Sulit$/);
});

test('adalahPertandingan menolak yang bukan objek', () => {
  for (const x of [null, 3, 'a', [], {}]) assert.equal(adalahPertandingan(x), false);
});
