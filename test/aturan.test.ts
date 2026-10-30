import { test } from 'vitest';
import assert from 'node:assert/strict';
import { periksaTeks, pindai } from '../bantu/aturan.ts';

const aturanDari = (kode: string, berkas = 'src/contoh.ts'): string[] => periksaTeks(kode, berkas).map((p) => p.aturan);

test('kode bersih lolos, termasuk as const, import as, dan tanda tidak-sama', () => {
  const kode = [
    "import { a as b } from './x.ts';",
    "import * as semua from './y.ts';",
    "export { b as c } from './z.ts';",
    'export const DAFTAR = [1, 2] as const;',
    'const sama = b !== 3 && !semua;',
    'const x: number[] = [];',
  ].join('\n');
  assert.deepEqual(aturanDari(kode), []);
});

test('tipe any ditolak dalam berbagai bentuk', () => {
  for (const kode of ['let a: any;', 'let b = c as any;', 'const d: Array<any> = [];', 'function f(x: any[]) {}']) {
    assert.ok(
      aturanDari(kode).some((a) => a.includes('any')),
      kode,
    );
  }
});

test('penegasan tipe as ditolak, as const dan import as tidak', () => {
  assert.equal(aturanDari('const a = b as Kartu;').length, 1);
  assert.equal(aturanDari('const a = (b as unknown) as Kartu;').length, 2);
  assert.equal(aturanDari('const a = b as const;').length, 0);
  assert.equal(aturanDari("import { a as b } from './x.ts';").length, 0);
});

test('tanda ! penegas ditolak, tetapi !, !== dan !== di sela kode tidak', () => {
  assert.equal(aturanDari('const a = b!.c;').length, 1);
  assert.equal(aturanDari('const a = b[0]!;').length, 1);
  assert.equal(aturanDari('const a = f()!;').length, 1);
  assert.equal(aturanDari('if (!a && b !== c && d != e) {}').length, 0);
});

test('komentar, teks, template, dan regex tidak dihitung', () => {
  const kode = [
    '// let a: any; dan b as Kartu dan c!.d',
    '/* let a: any; */',
    "const t = 'ini any dan x as Y dan z!';",
    'const u = `kata any di template ${1 + 1}`;',
    'const r = /juara!/.test(t);',
    'const k = /[a-z]!(?!=)/.test(t);',
  ].join('\n');
  assert.deepEqual(aturanDari(kode), []);
});

test('@ts-ignore dan @ts-nocheck selalu ditolak; @ts-expect-error hanya di test/', () => {
  assert.equal(aturanDari('// @ts-ignore\nlet a = 1;').length, 1);
  assert.equal(aturanDari('// @ts-nocheck\nlet a = 1;', 'test/x.test.ts').length, 1);
  assert.equal(aturanDari('// @ts-expect-error alasan\nlet a = 1;', 'src/x.ts').length, 1);
  assert.equal(aturanDari('// @ts-expect-error alasan\nlet a = 1;', 'test/x.test.ts').length, 0);
  assert.equal(aturanDari('// @ts-expect-error alasan\nlet a = 1;', 'test\\x.test.ts').length, 0);
  // Komentar yang hanya menyebut namanya tidak dianggap direktif.
  assert.equal(aturanDari('// jangan pakai @ts-ignore di sini\nlet a = 1;').length, 0);
});

test('nomor baris pelanggaran benar, juga setelah komentar dan teks beberapa baris', () => {
  const kode = ['/* satu', 'dua */', 'const ok = `a', 'b`;', 'let salah: any;'].join('\n');
  const [p] = periksaTeks(kode, 'src/x.ts');
  assert.equal(p?.baris, 5);
  assert.equal(p?.teks, 'let salah: any;');
});

test('pindai mempertahankan jumlah baris', () => {
  const kode = '// a\n/* b\nc */\n`d\ne`\n';
  assert.equal(pindai(kode).kode.split('\n').length, kode.split('\n').length);
});
