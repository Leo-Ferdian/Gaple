import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buatSuara } from '../src/suara.ts';
import type { KonteksAudio, ParamAudio } from '../src/suara.ts';

function buatPalsu() {
  const catatan = { osilator: 0, mulai: 0, berhenti: 0, dibuat: 0 };
  const param = (): ParamAudio => ({ setValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined });
  const konteks: KonteksAudio = {
    currentTime: 1,
    destination: {},
    createOscillator: () => {
      catatan.osilator++;
      return {
        type: 'sine',
        frequency: param(),
        connect: () => undefined,
        start: () => void catatan.mulai++,
        stop: () => void catatan.berhenti++,
      };
    },
    createGain: () => ({ gain: param(), connect: () => undefined }),
  };
  return { catatan, buat: () => (catatan.dibuat++, konteks) };
}

test('suara: tiap efek memutar nada dan konteks dibuat sekali, baru saat efek pertama', () => {
  const { catatan, buat } = buatPalsu();
  const suara = buatSuara(buat);
  assert.equal(catatan.dibuat, 0);
  suara.putar('letak');
  suara.putar('lewat');
  suara.putar('menang');
  assert.equal(catatan.dibuat, 1);
  assert.equal(catatan.osilator, 2 + 2 + 4);
  suara.putar('bagi', 0.3);
  assert.equal(catatan.osilator, 2 + 2 + 4 + 7);
  assert.equal(catatan.mulai, catatan.osilator);
  assert.equal(catatan.berhenti, catatan.osilator);
});

test('suara: mati tidak memutar apa pun dan tidak membuat konteks', () => {
  const { catatan, buat } = buatPalsu();
  const suara = buatSuara(buat, false);
  suara.putar('balak');
  assert.equal(catatan.dibuat, 0);
  suara.aktif(true);
  suara.putar('balak');
  assert.equal(catatan.osilator, 3);
  suara.aktif(false);
  suara.putar('kalah');
  assert.equal(catatan.osilator, 3);
});

test('suara: konteks tidak ada atau galat tidak menjatuhkan game', () => {
  buatSuara(() => null).putar('letak');
  buatSuara(() => {
    throw new Error('tidak didukung');
  }).putar('letak');
  const { buat } = buatPalsu();
  const rusak = buatSuara(() => {
    const k = buat();
    return {
      ...k,
      createOscillator: () => {
        throw new Error('ditutup');
      },
    };
  });
  rusak.putar('letak');
});
