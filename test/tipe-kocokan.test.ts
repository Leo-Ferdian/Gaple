import { test, expectTypeOf } from 'vitest';
import assert from 'node:assert/strict';
import { adalahAngka, adalahNomorPemain, buatKartu } from '../src/engine.ts';
import type { NomorPemain, NomorTim } from '../src/engine.ts';
import { titikSisaTim } from '../src/pembuka.ts';
import type { Syarat, RencanaBerikutnya } from '../src/pembuka.ts';
import { akhirKocokan, jenisBonus } from '../src/akhir.ts';
import type { AkhirKocokan, JenisBonus } from '../src/akhir.ts';
import { hitungHasil, BONUS } from '../src/markah.ts';
import type { HasilKocokan } from '../src/markah.ts';
import { empat } from '../bantu/bantuan-tes.ts';
import { habisBiasa } from '../bantu/skenario.ts';

test('penjaga tipe: adalahAngka dan adalahNomorPemain', () => {
  assert.equal(adalahAngka(6), true);
  assert.equal(adalahAngka(7), false);
  assert.equal(adalahAngka(1.5), false);
  assert.equal(adalahNomorPemain(3), true);
  assert.equal(adalahNomorPemain(4), false);
  assert.equal(adalahNomorPemain('0'), false);
});

test('titikSisaTim menjumlahkan pemain 0+2 dan 1+3', () => {
  const k = buatKartu;
  assert.deepEqual(titikSisaTim(empat([k(1, 2)], [k(3, 4)], [k(0, 1)], [k(6, 6)])), [4, 19]);
});

test('bentuk tipe hasil kocokan tetap seperti yang dirancang', () => {
  expectTypeOf(akhirKocokan(habisBiasa())).toEqualTypeOf<AkhirKocokan | null>();
  expectTypeOf(jenisBonus(habisBiasa(), 0)).toEqualTypeOf<JenisBonus | null>();
  expectTypeOf<HasilKocokan['akhir']>().toEqualTypeOf<'habis' | 'tabrak'>();
  expectTypeOf<HasilKocokan['timKena']>().toEqualTypeOf<NomorTim | null>();
  expectTypeOf<Extract<HasilKocokan, { akhir: 'habis' }>['penutup']>().toEqualTypeOf<NomorPemain>();
  expectTypeOf<Extract<HasilKocokan, { akhir: 'tabrak' }>['penutup']>().toEqualTypeOf<undefined>();
  expectTypeOf<RencanaBerikutnya['jenis']>().toEqualTypeOf<'netral' | 'balak'>();
  expectTypeOf<Syarat['jenis']>().toEqualTypeOf<'bebas' | 'balak' | 'kartu'>();
  expectTypeOf(BONUS.quartet).toEqualTypeOf<50>();
  assert.equal(hitungHasil(habisBiasa()).akhir, 'habis');
});
