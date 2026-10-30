// layar-html.ts: layar di luar meja permainan: menu, akhir partai, akhir pertandingan.
// Murni: masukan data, keluaran teks HTML.

import { AI_TERSEDIA } from '../controller.ts';
import { BATAS_MARKAH } from '../markah.ts';
import type { Markah } from '../markah.ts';
import type { Pengaturan } from '../controller.ts';
import type { Pertandingan } from '../pertandingan.ts';

const NAMA_TIM = ['Kita', 'Lawan'] as const;

interface Pilihan {
  readonly nilai: string;
  readonly nama: string;
  readonly ket?: string;
}

const PILIHAN_FORMAT: readonly Pilihan[] = [
  { nilai: 'bo3', nama: 'Terbaik dari 3', ket: 'menang 2 partai' },
  { nilai: 'bo5', nama: 'Terbaik dari 5', ket: 'menang 3 partai' },
];

const PILIHAN_AI: readonly Pilihan[] = [
  { nilai: 'mudah', nama: 'Mudah' },
  { nilai: 'sedang', nama: 'Sedang' },
  { nilai: 'sulit', nama: 'Sulit' },
];

const teksPoin = (poin: Markah): string => `Kita ${poin[0]} - ${poin[1]} Lawan`;

function radio(nama: string, pilihan: readonly Pilihan[], terpilih: string, aktif: (nilai: string) => boolean): string {
  return pilihan
    .map((p) => {
      const bisa = aktif(p.nilai);
      return (
        `<label class="pilihan${bisa ? '' : ' mati'}"><input type="radio" name="${nama}" value="${p.nilai}"` +
        `${p.nilai === terpilih ? ' checked' : ''}${bisa ? '' : ' disabled'}> ${p.nama}` +
        `${p.ket ? ` <small>(${p.ket})</small>` : ''}${bisa ? '' : ' <small>(segera)</small>'}</label>`
      );
    })
    .join('');
}

const ATURAN = [
  '28 kartu, tiap pemain 7. Anda (Selatan) berpasangan dengan Utara melawan Barat dan Timur.',
  'Kocokan pertama tiap partai dibuka pemegang kartu sesuai poin pertandingan (poin 0-0: kartu 0-0). Sesudah itu wajib dibuka dengan balak, oleh penutup kocokan sebelumnya (setelah tabrak: pemain dari tim pemenang dengan titik paling sedikit). Tanpa balak, hak pindah ke pemain berikutnya.',
  'Kartu disambung ke ujung yang angkanya sama. Tidak punya kartu cocok berarti lewat.',
  'Habis: pemain pertama yang menghabiskan kartu menutup. Tim lawannya mendapat markah sebesar total titik sisa kedua pemainnya, ditambah bonus bila ada.',
  'Bonus saat habis: double (kedua ujung sama) +20, triplet (menutup dengan balak) +30, quartet (keduanya) +50.',
  'Tabrak: tidak ada yang bisa main. Tim dengan titik sisa lebih banyak mendapat markah sebesar totalnya. Bila sama, tidak ada markah dan kocokan berikutnya dibuka 0-0.',
  `Tim yang markahnya mencapai ${BATAS_MARKAH} kalah partai; lawannya mendapat 1 poin. Markah kembali 0 di partai berikutnya.`,
  'Pertandingan dimenangkan tim yang lebih dulu mencapai 2 poin (terbaik dari 3) atau 3 poin (terbaik dari 5).',
];

export function htmlMenu(pengaturan: Pengaturan): string {
  return (
    `<div class="meja layar menu">` +
    `<h1>Gaple 2vs2</h1>` +
    `<p class="ket">Anda dan Utara melawan Barat dan Timur.</p>` +
    `<fieldset><legend>Format pertandingan</legend>${radio('format', PILIHAN_FORMAT, pengaturan.format, () => true)}</fieldset>` +
    `<fieldset><legend>Lawan</legend>${radio('ai', PILIHAN_AI, pengaturan.ai, (n) => AI_TERSEDIA.some((a) => a === n))}</fieldset>` +
    `<fieldset><legend>Bantuan</legend><label class="pilihan"><input type="checkbox" name="bantuan"${pengaturan.bantuan ? ' checked' : ''}> Bantuan hitung <small>(kartu tersisa dan peluang kartu lawan)</small></label></fieldset>` +
    `<button type="button" class="utama" data-aksi="main">Main</button>` +
    `<details class="aturan"><summary>Aturan singkat</summary><ul>${ATURAN.map((a) => `<li>${a}</li>`).join('')}</ul></details>` +
    `</div>`
  );
}

/** Layar antara dua partai (partai sudah selesai tetapi belum dicatat ke poin). */
export function htmlPartaiSelesai(pertandingan: Pertandingan): string {
  const { partai } = pertandingan;
  if (partai === null || partai.status !== 'selesai') throw new Error('Partai belum selesai, layar ini belum bisa ditampilkan');
  const menang = partai.pemenang.menang;
  const poinBaru: Markah =
    menang === 0 ? [pertandingan.poin[0] + 1, pertandingan.poin[1]] : [pertandingan.poin[0], pertandingan.poin[1] + 1];
  const penentu = poinBaru[menang] >= pertandingan.target;
  return (
    `<div class="meja layar partai-selesai">` +
    `<h2>Partai ${pertandingan.riwayatPartai.length + 1} selesai</h2>` +
    `<p>${NAMA_TIM[partai.pemenang.kalah]} mencapai ${BATAS_MARKAH}. ${menang === 0 ? 'Anda menang partai ini.' : 'Lawan menang partai ini.'}</p>` +
    `<p>Markah akhir: Kita ${partai.markah[0]}, Lawan ${partai.markah[1]}</p>` +
    `<p class="poin">Poin: ${teksPoin(poinBaru)} (target ${pertandingan.target})</p>` +
    `<button type="button" class="utama" data-aksi="lanjut">${penentu ? 'Lihat hasil' : 'Partai berikutnya'}</button>` +
    `</div>`
  );
}

export function htmlAkhir(pertandingan: Pertandingan): string {
  const juara = pertandingan.juara;
  const baris = pertandingan.riwayatPartai
    .map((r) => `<li>Partai ${r.nomor}: markah ${r.markahAkhir[0]} - ${r.markahAkhir[1]}, menang ${NAMA_TIM[r.menang]}</li>`)
    .join('');
  return (
    `<div class="meja layar akhir">` +
    `<h2>${juara === 0 ? 'Tim Anda juara!' : 'Lawan juara.'}</h2>` +
    `<p class="poin">${teksPoin(pertandingan.poin)}</p>` +
    `<ol class="riwayat">${baris}</ol>` +
    `<div class="tombol-baris"><button type="button" class="utama" data-aksi="main-lagi">Main lagi</button>` +
    `<button type="button" data-aksi="menu">Kembali ke menu</button></div>` +
    `</div>`
  );
}
