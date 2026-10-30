import { test, expectTypeOf } from 'vitest';
import {
  buatKartu,
  bagi,
  buatDek,
  giliranBerikutnya,
  timPemain,
  type Kartu,
  type NomorPemain,
  type NomorTim,
  type EmpatTangan,
} from '../src/engine.ts';
import { buatMejaKosong, sisiLegal, letakkan, type Meja, type Sisi } from '../src/meja.ts';
import { buatAcak, type FungsiAcak } from '../src/rng.ts';

// Tes ini hanya memeriksa TIPE (dicek oleh `npm run typecheck`); isinya tidak menjalankan apa pun yang penting.
test('tipe domain: kartu, pemain, tim, meja, acak', () => {
  expectTypeOf(buatKartu(1, 2)).toEqualTypeOf<Kartu>();
  expectTypeOf(buatAcak(1)).toEqualTypeOf<FungsiAcak>();
  expectTypeOf(bagi(buatDek())).toEqualTypeOf<EmpatTangan>();
  expectTypeOf(giliranBerikutnya).parameter(0).toEqualTypeOf<NomorPemain>();
  expectTypeOf(giliranBerikutnya).returns.toEqualTypeOf<NomorPemain>();
  expectTypeOf(timPemain).returns.toEqualTypeOf<NomorTim>();
  expectTypeOf(buatMejaKosong()).toEqualTypeOf<Meja>();
  expectTypeOf(sisiLegal).returns.toEqualTypeOf<Sisi[]>();
  expectTypeOf(letakkan).returns.toEqualTypeOf<Meja>();

  // Nomor pemain di luar 0..3 dan sisi yang salah ditolak oleh kompiler.
  // Fungsi ini sengaja tidak pernah dipanggil: isinya hanya untuk diperiksa tipe.
  const tidakDijalankan = () => {
    // @ts-expect-error 4 bukan nomor pemain
    giliranBerikutnya(4);
    // @ts-expect-error 'tengah' bukan sisi
    letakkan(buatMejaKosong(), buatKartu(1, 2), 'tengah');
    // @ts-expect-error angka 9 bukan angka kartu
    const k: Kartu = { a: 9, b: 1, id: '1-9' };
    return k;
  };
  void tidakDijalankan;
});
