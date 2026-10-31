import { test } from 'vitest';
import assert from 'node:assert/strict';
import { muatPengaturan, simpanPengaturan, KUNCI_PENGATURAN } from '../src/penyimpanan.ts';
import { PENGATURAN_BAWAAN, rapikanPengaturan } from '../src/controller.ts';
import { ada } from '../bantu/bantuan-tes.ts';

/** Penyimpanan palsu yang meniru localStorage. */
function penyimpananPalsu(isi: Record<string, string> = {}) {
  const data = new Map<string, string>(Object.entries(isi));
  return {
    getItem: (k: string): string | null => data.get(k) ?? null,
    setItem: (k: string, v: string): void => {
      data.set(k, v);
    },
    data,
  };
}

const rusak = {
  getItem() {
    throw new Error('dilarang');
  },
  setItem() {
    throw new Error('penuh');
  },
};

test('simpan lalu muat mengembalikan pengaturan yang sama', () => {
  const s = penyimpananPalsu();
  assert.equal(simpanPengaturan(s, { format: 'bo5', ai: 'sulit', bantuan: true, mode: 'latihan', suara: true }), true);
  assert.deepEqual(muatPengaturan(s), { format: 'bo5', ai: 'sulit', bantuan: true, mode: 'latihan', suara: true });
});

test('penyimpanan kosong menghasilkan pengaturan bawaan', () => {
  assert.deepEqual(muatPengaturan(penyimpananPalsu()), PENGATURAN_BAWAAN);
});

test('data tersimpan yang rusak atau tidak masuk akal diganti nilai bawaan', () => {
  const kasus = [
    'bukan json {{{',
    'null',
    '42',
    '"bo5"',
    '[]',
    JSON.stringify({ format: 'bo7', ai: 'dewa' }),
    JSON.stringify({ format: 'bo5', ai: 'ahli', mode: 'turnamen' }),
    JSON.stringify({ format: 'toString', ai: '__proto__' }),
  ];
  for (const teks of kasus) {
    const hasil = muatPengaturan(penyimpananPalsu({ [KUNCI_PENGATURAN]: teks }));
    assert.ok(['bo3', 'bo5'].includes(hasil.format), teks);
    assert.equal(hasil.ai, 'mudah', teks);
  }
  assert.deepEqual(muatPengaturan(penyimpananPalsu({ [KUNCI_PENGATURAN]: JSON.stringify({ format: 'bo7' }) })), PENGATURAN_BAWAAN);
});

test('hanya kunci yang dikenal yang dipertahankan', () => {
  const s = penyimpananPalsu({ [KUNCI_PENGATURAN]: JSON.stringify({ format: 'bo5', ai: 'mudah', rahasia: 'x', __proto__: { a: 1 } }) });
  assert.deepEqual(Object.keys(muatPengaturan(s)).sort(), ['ai', 'bantuan', 'format', 'mode', 'suara']);
  assert.deepEqual(Object.keys(rapikanPengaturan({ format: 'bo5', tambahan: 1 })).sort(), ['ai', 'bantuan', 'format', 'mode', 'suara']);
});

test('penyimpanan yang melarang akses tidak membuat game gagal', () => {
  assert.deepEqual(muatPengaturan(rusak), PENGATURAN_BAWAAN);
  assert.equal(simpanPengaturan(rusak, { format: 'bo5' }), false);
  assert.deepEqual(muatPengaturan(null), PENGATURAN_BAWAAN); // localStorage tidak tersedia sama sekali
  assert.equal(simpanPengaturan(null, { format: 'bo5' }), false);
});

test('yang disimpan sudah dirapikan', () => {
  const s = penyimpananPalsu();
  simpanPengaturan(s, { format: 'bo9', ai: 'x' });
  assert.deepEqual(JSON.parse(ada(s.data.get(KUNCI_PENGATURAN))), PENGATURAN_BAWAAN);
});

test('suara: bawaan menyala, nilai bukan boolean diganti bawaan, false tersimpan', () => {
  assert.equal(rapikanPengaturan({}).suara, true);
  assert.equal(rapikanPengaturan({ suara: 'ya' }).suara, true);
  const s = penyimpananPalsu({});
  assert.equal(simpanPengaturan(s, { suara: false }), true);
  assert.equal(muatPengaturan(s).suara, false);
});
