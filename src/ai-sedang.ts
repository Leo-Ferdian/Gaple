// ai-sedang.ts: pemain komputer tingkat Sedang (tahap 4).
//
// Murni: masukan state kocokan, keluaran satu langkah. Tidak mengubah apa pun.
//
// Cara kerja: tiap pasangan (kartu, sisi) yang legal diberi nilai, langkah bernilai
// tertinggi dipilih; bila seri, dipilih acak di antara yang seri (memakai `acak` yang dioper,
// jadi tetap bisa diulang dengan benih yang sama).
//
// Yang dinilai (bobot ada di BOBOT supaya mudah disetel):
//  - Menutup kocokan (kartu terakhir) paling utama, bonus bila bonus kocokan didapat.
//  - Membuang kartu berat lebih dulu: titik yang tersisa di tangan menjadi markah lawan.
//  - Membuang balak lebih dulu: balak hanya bisa dimainkan pada satu angka.
//  - Menjaga ujung yang masih bisa dilanjutkan: ujung baru yang angkanya ada di sisa tangan.
//  - Memakai pemain yang pernah lewat: angka yang terbukti tidak dimiliki lawan dijadikan ujung
//    (supaya lawan lewat); angka yang tidak dimiliki rekan dihindari.
//
// Belum ada di sini (tahap 5): menghitung kartu yang sudah keluar dan peluang kartu lawan.

import { adalahBalak, nilaiKartu, timPemain } from './engine.ts';
import type { Angka, Kartu, NomorPemain } from './engine.ts';
import { kartuLegalPemain } from './kocokan.ts';
import { letakkan } from './meja.ts';
import type { Sisi } from './meja.ts';
import type { FungsiAcak } from './rng.ts';
import type { LangkahAcak } from './simulasi.ts';
import type { StateKocokan } from './tipe-kocokan.ts';
import { angkaTerlarang, pandangan } from './pelacak.ts';
import type { Pandangan } from './pelacak.ts';

export const BOBOT = {
  menutup: 1000,
  bonusDouble: 40,
  bonusTriplet: 30,
  titik: 1,
  balak: 4,
  lanjutPerKartu: 2.5,
  tanpaLanjutan: -6,
  lawanLewat: 5,
  rekanLewat: -5,
} as const;

const SEMUA_PEMAIN = [0, 1, 2, 3] as const;

/**
 * Angka yang terbukti TIDAK dimiliki pemain, dibaca dari riwayat: pemain yang lewat tidak
 * punya kartu berangka salah satu ujung meja saat itu, dan kartunya tidak pernah bertambah.
 */
export function angkaTidakDimiliki(state: Pick<StateKocokan, 'riwayat'>, pemain: NomorPemain): ReadonlySet<Angka> {
  return angkaTerlarang(state.riwayat, pemain);
}

const punyaAngka = (kartu: Kartu, angka: Angka): boolean => kartu.a === angka || kartu.b === angka;

/** Nilai satu langkah (makin besar makin baik). */
function nilaiLangkah(v: Pandangan, kartu: Kartu, sisi: Sisi): number {
  const pemain = v.pemain;
  const sisa = v.tangan.filter((k) => k.id !== kartu.id);
  const mejaBaru = letakkan(v.meja, kartu, sisi);
  const ujung = [mejaBaru.ujungKiri, mejaBaru.ujungKanan];

  if (sisa.length === 0) {
    let nilai = BOBOT.menutup;
    if (ujung[0] === ujung[1]) nilai += BOBOT.bonusDouble;
    if (adalahBalak(kartu)) nilai += BOBOT.bonusTriplet;
    return nilai;
  }

  let nilai = nilaiKartu(kartu) * BOBOT.titik + (adalahBalak(kartu) ? BOBOT.balak : 0);

  // Lanjutan: berapa kartu sisa kita yang masih bisa dimainkan pada ujung baru.
  let lanjutan = 0;
  for (const angka of ujung) {
    if (angka === null) continue;
    lanjutan += sisa.filter((k) => punyaAngka(k, angka)).length;
  }
  nilai += lanjutan === 0 ? BOBOT.tanpaLanjutan : lanjutan * BOBOT.lanjutPerKartu;

  // Pemain yang pernah lewat: ujung yang terbukti tidak dimiliki lawan baik, rekan buruk.
  for (const lain of SEMUA_PEMAIN) {
    if (lain === pemain) continue;
    const tidakPunya = angkaTerlarang(v.riwayat, lain);
    const bobot = timPemain(lain) === timPemain(pemain) ? BOBOT.rekanLewat : BOBOT.lawanLewat;
    for (const angka of ujung) {
      if (angka !== null && tidakPunya.has(angka)) nilai += bobot;
    }
  }
  return nilai;
}

/** Memilih langkah untuk pemain yang sedang giliran. Lewat bila tidak ada kartu legal. */
export function pilihLangkahSedang(state: StateKocokan, acak: FungsiAcak): LangkahAcak {
  const pemain = state.giliran;
  const v = pandangan(state, pemain); // hanya ini yang boleh dipakai untuk menilai langkah
  const pilihan = kartuLegalPemain(state, pemain);
  if (pilihan.length === 0) return { aksi: 'lewat', pemain };

  let terbaik = -Infinity;
  let kandidat: { kartu: Kartu; sisi: Sisi }[] = [];
  for (const p of pilihan) {
    for (const sisi of p.sisi) {
      const nilai = nilaiLangkah(v, p.kartu, sisi);
      if (nilai > terbaik + 1e-9) {
        terbaik = nilai;
        kandidat = [{ kartu: p.kartu, sisi }];
      } else if (Math.abs(nilai - terbaik) <= 1e-9) {
        kandidat.push({ kartu: p.kartu, sisi });
      }
    }
  }
  const dipilih = kandidat[Math.floor(acak() * kandidat.length)];
  if (dipilih === undefined) throw new Error('Tidak ada kandidat langkah, seharusnya tidak mungkin');
  return { aksi: 'main', pemain, kartu: dipilih.kartu, sisi: dipilih.sisi };
}
