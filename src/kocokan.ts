// kocokan.ts: jalannya satu kocokan (satu kali bagi 28 kartu).
//
// State kocokan adalah objek biasa:
//   {
//     tangan:        [[kartu x7], [kartu x7], [kartu x7], [kartu x7]],  // per pemain
//     meja:          { rangkaian, ujungKiri, ujungKanan },
//     giliran:       0..3,            // pemain yang sedang berhak jalan
//     syaratPembuka: { jenis, ... },  // syarat untuk kartu pertama (lihat pembuka.ts)
//     riwayat:       [ ...kejadian ]  // semua langkah, urut dari awal
//   }
//
// Setiap kejadian di riwayat:
//   { pemain, aksi: 'main',  kartu, sisi, ujungSebelum: {kiri, kanan} }
//   { pemain, aksi: 'lewat',            ujungSebelum: {kiri, kanan} }
//
// `mainkan` dan `lewat` TIDAK mengubah state lama. Keduanya mengembalikan
// state baru. Jika langkahnya melanggar aturan, keduanya melempar Error.
//
// Setelah kocokan berakhir (habis atau tabrak, lihat akhir.ts) `mainkan` dan
// `lewat` menolak langkah apa pun. Markah dihitung di markah.ts.

import { JUMLAH_PEMAIN, NAMA_PEMAIN, adalahNomorPemain, giliranBerikutnya } from './engine.ts';
import type { EmpatTangan, Kartu, NomorPemain } from './engine.ts';
import { buatMejaKosong, kartuLegal, letakkan } from './meja.ts';
import type { PilihanKartu, Sisi } from './meja.ts';
import { akhirKocokan } from './akhir.ts';
import { SYARAT_BEBAS, deskripsiSyarat, kartuMemenuhiSyarat, tentukanPembuka } from './pembuka.ts';
import type { PembukaUlang, RencanaPembukaan, Syarat } from './pembuka.ts';
import type { StateKocokan } from './tipe-kocokan.ts';

// Dipakai juga oleh modul lain lewat kocokan.ts.
export { NAMA_PEMAIN, giliranBerikutnya, timPemain } from './engine.ts';

/** Hasil `mulaiDariRencana`: kocokan siap dimainkan, atau kartu harus dikocok ulang. */
export type HasilMulai =
  { readonly status: 'siap'; readonly state: StateKocokan; readonly pembuka: NomorPemain; readonly alasan: string } | PembukaUlang;

function pastikanPemainSah(pemain: number): asserts pemain is NomorPemain {
  if (!adalahNomorPemain(pemain)) {
    throw new RangeError(`Nomor pemain harus 0 sampai ${JUMLAH_PEMAIN - 1}, diterima: ${pemain}`);
  }
}

function pastikanBelumBerakhir(state: StateKocokan): void {
  const akhir = akhirKocokan(state);
  if (akhir) throw new Error(`Kocokan sudah berakhir (${akhir.akhir}), tidak ada langkah lagi`);
}

/** Tangan baru dengan tangan `pemain` diganti `baru`. */
function gantiTangan(tangan: EmpatTangan, pemain: NomorPemain, baru: readonly Kartu[]): EmpatTangan {
  const pilih = (p: NomorPemain): readonly Kartu[] => (p === pemain ? baru : tangan[p]);
  return [pilih(0), pilih(1), pilih(2), pilih(3)];
}

/**
 * Memulai kocokan dari 4 tangan yang sudah dibagi.
 *
 * @param tangan empat tangan (dari `bagi`)
 * @param pembuka nomor pemain yang berjalan pertama
 * @param syarat syarat kartu pertama (bawaan: bebas). Pembuka harus
 *   punya setidaknya satu kartu yang memenuhi syarat itu.
 */
export function mulaiKocokan(tangan: EmpatTangan, pembuka: NomorPemain, syarat: Syarat = SYARAT_BEBAS): StateKocokan {
  if (!Array.isArray(tangan) || tangan.length !== JUMLAH_PEMAIN) {
    throw new RangeError(`Harus ada ${JUMLAH_PEMAIN} tangan`);
  }
  pastikanPemainSah(pembuka);
  if (!tangan[pembuka].some((k) => kartuMemenuhiSyarat(k, syarat))) {
    throw new Error(`${NAMA_PEMAIN[pembuka]} tidak punya kartu yang memenuhi syarat pembuka (${deskripsiSyarat(syarat)})`);
  }
  return {
    // salin supaya masukan tidak ikut berubah
    tangan: [[...tangan[0]], [...tangan[1]], [...tangan[2]], [...tangan[3]]],
    meja: buatMejaKosong(),
    giliran: pembuka,
    syaratPembuka: syarat,
    riwayat: [],
  };
}

/** Memulai kocokan dari rencana pembukaan (lihat pembuka.ts). */
export function mulaiDariRencana(tangan: EmpatTangan, rencana: RencanaPembukaan): HasilMulai {
  const hasil = tentukanPembuka(tangan, rencana);
  if (hasil.status === 'ulang') return hasil;
  return {
    status: 'siap',
    state: mulaiKocokan(tangan, hasil.pembuka, hasil.syarat),
    pembuka: hasil.pembuka,
    alasan: hasil.alasan,
  };
}

/**
 * Kartu yang boleh dimainkan seorang pemain SAAT INI, dengan memperhitungkan
 * syarat pembuka: selama meja masih kosong, hanya kartu yang memenuhi syarat
 * pembuka yang legal. Sesudah kartu pertama diletakkan, syarat itu tidak
 * berlaku lagi.
 */
export function kartuLegalPemain(state: StateKocokan, pemain: NomorPemain): PilihanKartu[] {
  const legal = kartuLegal(state.tangan[pemain], state.meja);
  if (state.meja.rangkaian.length > 0) return legal;
  return legal.filter((pilihan) => kartuMemenuhiSyarat(pilihan.kartu, state.syaratPembuka));
}

/**
 * Pemain memainkan sebuah kartu di sebuah sisi.
 * Melempar Error bila: kocokan sudah berakhir, bukan gilirannya, kartu tidak ada di tangannya, kartu
 * tidak bisa diletakkan di sisi itu, atau (untuk kartu pertama) kartu tidak
 * memenuhi syarat pembuka.
 */
export function mainkan(state: StateKocokan, pemain: NomorPemain, kartu: Kartu, sisi: Sisi): StateKocokan {
  pastikanPemainSah(pemain);
  pastikanBelumBerakhir(state);
  if (pemain !== state.giliran) {
    throw new Error(`Bukan giliran ${NAMA_PEMAIN[pemain]}, sekarang giliran ${NAMA_PEMAIN[state.giliran]}`);
  }
  if (!state.tangan[pemain].some((k) => k.id === kartu.id)) {
    throw new Error(`Kartu ${kartu.id} tidak ada di tangan ${NAMA_PEMAIN[pemain]}`);
  }
  if (state.meja.rangkaian.length === 0 && !kartuMemenuhiSyarat(kartu, state.syaratPembuka)) {
    throw new Error(`Kartu ${kartu.id} tidak memenuhi syarat pembuka: ${deskripsiSyarat(state.syaratPembuka)}`);
  }

  const mejaBaru = letakkan(state.meja, kartu, sisi); // melempar Error bila ilegal

  return {
    ...state,
    tangan: gantiTangan(
      state.tangan,
      pemain,
      state.tangan[pemain].filter((k) => k.id !== kartu.id),
    ),
    meja: mejaBaru,
    giliran: giliranBerikutnya(pemain),
    riwayat: [
      ...state.riwayat,
      {
        pemain,
        aksi: 'main',
        kartu,
        sisi,
        ujungSebelum: { kiri: state.meja.ujungKiri, kanan: state.meja.ujungKanan },
      },
    ],
  };
}

/**
 * Pemain melewati gilirannya.
 * Hanya sah bila pemain itu benar-benar tidak punya kartu yang bisa dimainkan.
 */
export function lewat(state: StateKocokan, pemain: NomorPemain): StateKocokan {
  pastikanPemainSah(pemain);
  pastikanBelumBerakhir(state);
  if (pemain !== state.giliran) {
    throw new Error(`Bukan giliran ${NAMA_PEMAIN[pemain]}, sekarang giliran ${NAMA_PEMAIN[state.giliran]}`);
  }
  if (kartuLegalPemain(state, pemain).length > 0) {
    throw new Error(`${NAMA_PEMAIN[pemain]} tidak boleh lewat karena masih punya kartu yang bisa dimainkan`);
  }

  return {
    ...state,
    giliran: giliranBerikutnya(pemain),
    riwayat: [
      ...state.riwayat,
      {
        pemain,
        aksi: 'lewat',
        ujungSebelum: { kiri: state.meja.ujungKiri, kanan: state.meja.ujungKanan },
      },
    ],
  };
}
