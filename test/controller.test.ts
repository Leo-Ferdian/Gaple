import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buatAcak } from '../src/rng.ts';
import { mulaiPartai, bagiKocokan, lanjutkanPartai, STATUS_BERJALAN, STATUS_RINGKASAN, STATUS_SELESAI } from '../src/partai.ts';
import type { Partai, PartaiBerjalan, StatusPartai } from '../src/partai.ts';
import type { FungsiAcak } from '../src/rng.ts';
import type { Sisi } from '../src/meja.ts';
import type { PilihanManusia } from '../src/controller.ts';
import { ada } from '../bantu/bantuan-tes.ts';
import { kartuLegalPemain } from '../src/kocokan.ts';
import { PEMAIN_MANUSIA, menungguManusia, adaLangkahOtomatis, langkahOtomatis, pilihanKartu, mainkanManusia } from '../src/controller.ts';
import { htmlMeja } from '../src/tampilan/meja-html.ts';

const partaiBaru = (benih: number): { partai: PartaiBerjalan; acak: FungsiAcak } => {
  const acak = buatAcak(benih);
  return { partai: bagiKocokan(mulaiPartai([0, 0]), acak), acak };
};

/** Pilihan pertama manusia: kartu legal pertama dan sisi pertama yang boleh. */
function pilihanPertama(partai: PartaiBerjalan): { id: string; sisi: Sisi } {
  const { kartu, sisi } = ada(kartuLegalPemain(partai.kocokan, PEMAIN_MANUSIA)[0]);
  return { id: kartu.id, sisi: ada(sisi[0]) };
}

/** Manusia memainkan kartu legal pertamanya (dengan sisi pertama yang boleh). */
function manusiaMain(partai: PartaiBerjalan) {
  const { id, sisi } = pilihanPertama(partai);
  return mainkanManusia(partai, id, sisi);
}

/** Satu langkah: manusia main bila gilirannya, selain itu komputer. */
function langkah(partai: PartaiBerjalan, acak: FungsiAcak) {
  return menungguManusia(partai) ? manusiaMain(partai) : langkahOtomatis(partai, acak);
}

function punyaStatus<S extends StatusPartai>(partai: Partai, status: S): partai is Extract<Partai, { status: S }> {
  return partai.status === status;
}

/** Memainkan satu partai penuh: manusia memilih kartu legal pertama, komputer acak. */
function mainkanSampai<S extends StatusPartai>(awal: Partai, acak: FungsiAcak, status: S): Extract<Partai, { status: S }> {
  let partai = awal;
  for (let i = 0; i < 20000; i++) {
    if (punyaStatus(partai, status)) return partai;
    if (partai.status === STATUS_BERJALAN) {
      if (menungguManusia(partai)) {
        const { kartu } = ada(kartuLegalPemain(partai.kocokan, PEMAIN_MANUSIA)[0]);
        const { sisi } = ada(pilihanKartu(partai, kartu.id));
        partai = mainkanManusia(partai, kartu.id, ada(sisi[0]));
      } else {
        partai = langkahOtomatis(partai, acak);
      }
    } else if (partai.status === STATUS_RINGKASAN) {
      partai = lanjutkanPartai(partai);
    } else if (partai.status === 'siap') {
      partai = bagiKocokan(partai, acak);
    } else {
      break;
    }
  }
  throw new Error(`Status ${status} tidak tercapai`);
}

test('tepat satu dari menungguManusia dan adaLangkahOtomatis berlaku saat kocokan berjalan', () => {
  for (let benih = 1; benih <= 60; benih++) {
    const { partai: awal, acak } = partaiBaru(benih);
    let partai: Partai = awal;
    for (let i = 0; i < 40 && partai.status === STATUS_BERJALAN; i++) {
      assert.notEqual(menungguManusia(partai), adaLangkahOtomatis(partai), `benih ${benih}, langkah ${i}`);
      partai = langkah(partai, acak);
    }
  }
});

test('langkahOtomatis menolak bila sedang menunggu manusia', () => {
  for (let benih = 1; benih <= 60; benih++) {
    const { partai, acak } = partaiBaru(benih);
    if (menungguManusia(partai)) {
      assert.throws(() => langkahOtomatis(partai, acak), /menunggu pemain manusia/);
      return;
    }
  }
  assert.fail('tidak ada benih yang membuka dengan giliran manusia');
});

test('manusia tanpa kartu cocok lewat otomatis, dan komputer tidak pernah melanggar aturan', () => {
  let lewatManusia = 0;
  for (let benih = 1; benih <= 150; benih++) {
    const { partai: awal, acak } = partaiBaru(benih);
    let partai: Partai = awal;
    while (partai.status === STATUS_BERJALAN) {
      if (menungguManusia(partai)) {
        partai = manusiaMain(partai);
      } else {
        if (partai.kocokan.giliran === PEMAIN_MANUSIA) lewatManusia++;
        partai = langkahOtomatis(partai, acak);
      }
    }
    assert.equal(partai.status, STATUS_RINGKASAN, `benih ${benih}`);
  }
  assert.ok(lewatManusia > 0, 'seharusnya ada kocokan di mana manusia harus lewat');
});

test('pilihanKartu: hanya kartu legal pada giliran manusia', () => {
  for (let benih = 1; benih <= 60; benih++) {
    const { partai } = partaiBaru(benih);
    if (!menungguManusia(partai)) {
      assert.equal(pilihanKartu(partai, ada(partai.kocokan.tangan[0][0]).id), null);
      continue;
    }
    const legal = kartuLegalPemain(partai.kocokan, 0).map((p) => p.kartu.id);
    for (const kartu of partai.kocokan.tangan[0]) {
      const pilihan = pilihanKartu(partai, kartu.id);
      assert.equal(pilihan !== null, legal.includes(kartu.id), `benih ${benih}, ${kartu.id}`);
    }
    assert.equal(pilihanKartu(partai, 'bukan-kartu'), null);
  }
});

test('pilihanKartu: dua sisi hanya ditawarkan bila kedua ujung berbeda', () => {
  let dua = 0;
  let setara = 0;
  for (let benih = 1; benih <= 300; benih++) {
    const { partai: awal, acak } = partaiBaru(benih);
    let partai: Partai = awal;
    for (let i = 0; i < 60 && partai.status === STATUS_BERJALAN; i++) {
      if (menungguManusia(partai)) {
        const { ujungKiri, ujungKanan } = partai.kocokan.meja;
        for (const { kartu, sisi } of kartuLegalPemain(partai.kocokan, 0)) {
          const pilihan: PilihanManusia = ada(pilihanKartu(partai, kartu.id));
          if (sisi.length === 2 && ujungKiri !== ujungKanan) {
            assert.deepEqual(pilihan.sisi, sisi);
            dua++;
          } else if (sisi.length === 2) {
            assert.deepEqual(pilihan.sisi, ['kanan']);
            setara++;
          } else {
            assert.deepEqual(pilihan.sisi, sisi);
          }
        }
        partai = manusiaMain(partai);
      } else {
        partai = langkahOtomatis(partai, acak);
      }
    }
  }
  assert.ok(dua > 0 && setara > 0, `dua=${dua}, setara=${setara}`);
});

test('mainkanManusia: kartu bukan milik Anda atau sisi ilegal melempar Error', () => {
  for (let benih = 1; benih <= 60; benih++) {
    const { partai } = partaiBaru(benih);
    if (!menungguManusia(partai)) continue;
    assert.throws(() => mainkanManusia(partai, 'bukan-kartu', 'kanan'), /tidak ada di tangan Anda/);
    const milikLawan = ada(partai.kocokan.tangan[1][0]).id;
    assert.throws(() => mainkanManusia(partai, milikLawan, 'kanan'), /tidak ada di tangan Anda/);
    const { id, sisi } = pilihanPertama(partai);
    const salah: Sisi = sisi === 'awal' ? 'kiri' : 'awal';
    assert.throws(() => mainkanManusia(partai, id, salah), Error);
    return;
  }
});

test('satu partai penuh dengan manusia bermain otomatis: berakhir dengan pemenang sah', () => {
  for (let benih = 1; benih <= 20; benih++) {
    const { partai, acak } = partaiBaru(benih);
    const selesai = mainkanSampai(partai, acak, STATUS_SELESAI);
    assert.ok(selesai.markah[selesai.pemenang.kalah] >= 100, `benih ${benih}`);
  }
});

// ---------------------------------------------------------------------------
// Tampilan yang bergantung pada controller
// ---------------------------------------------------------------------------

test('meja: pilihan sisi tampil dengan ujung kiri dan kanan, kartu terpilih ditandai', () => {
  for (let benih = 1; benih <= 300; benih++) {
    const { partai: awal, acak } = partaiBaru(benih);
    let partai: Partai = awal;
    for (let i = 0; i < 60 && partai.status === STATUS_BERJALAN; i++) {
      if (menungguManusia(partai)) {
        const berjalan = partai;
        const pilihan: PilihanManusia | null | undefined = kartuLegalPemain(berjalan.kocokan, 0)
          .map((p) => pilihanKartu(berjalan, p.kartu.id))
          .find((p) => p !== null && p.sisi.length === 2);
        if (pilihan) {
          const html = htmlMeja(partai, { pilihan });
          assert.match(html, /data-sisi="kiri"/);
          assert.match(html, /data-sisi="kanan"/);
          assert.match(html, /data-sisi="batal"/);
          assert.match(html, new RegExp(`Kiri \\(ujung ${partai.kocokan.meja.ujungKiri}\\)`));
          assert.match(html, new RegExp(`class="kartu-tangan legal terpilih" data-kartu="${pilihan.kartu.id}"`));
          return;
        }
        partai = manusiaMain(partai);
      } else {
        partai = langkahOtomatis(partai, acak);
      }
    }
  }
  assert.fail('tidak ketemu kasus dua sisi');
});

test('meja: ringkasan kocokan tampil dengan hasil, markah tambahan, dan tombol lanjut', () => {
  const { partai, acak } = partaiBaru(4);
  const ringkasan = mainkanSampai(partai, acak, STATUS_RINGKASAN);
  const html = htmlMeja(ringkasan);
  const hasil = ringkasan.hasilTerakhir;
  assert.match(html, /class="ringkasan"/);
  assert.match(html, new RegExp(`Markah bertambah: Kita \\+${hasil.tambahan[0]}, Lawan \\+${hasil.tambahan[1]}`));
  assert.match(html, /data-aksi="lanjut"/);
  assert.equal((html.match(/class="kartu-tangan legal/g) ?? []).length, 0, 'tidak ada kartu aktif di ringkasan');
  if (hasil.akhir === 'habis') assert.match(html, /menghabiskan kartu/);
});

test('meja: langkah terakhir ditulis di status', () => {
  const { partai, acak } = partaiBaru(9);
  let p: Partai = partai;
  while (p.status === STATUS_BERJALAN && p.kocokan.riwayat.length < 2) {
    p = langkah(p, acak);
  }
  assert.match(htmlMeja(p), /<span class="terakhir">(Anda|Barat|Utara|Timur) (lewat|memainkan \d-\d)</);
});

test('meja: tombol jeda berganti label', () => {
  const { partai } = partaiBaru(2);
  assert.match(htmlMeja(partai), />Jeda</);
  assert.match(htmlMeja(partai, { dijeda: true }), />Lanjut</);
});
