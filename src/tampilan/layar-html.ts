// layar-html.ts: layar di luar meja permainan: menu, akhir partai, akhir pertandingan.
// Murni: masukan data, keluaran teks HTML.

import { AI_TERSEDIA } from '../controller.ts';
import { BATAS_MARKAH } from '../markah.ts';
import { svgKartu, ARAH_DATAR } from './kartu-svg.ts';
import type { Markah } from '../markah.ts';
import type { Pengaturan } from '../controller.ts';
import type { Statistik, Hitungan } from '../statistik.ts';
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

const PILIHAN_MODE: readonly Pilihan[] = [
  { nilai: 'pertandingan', nama: 'Pertandingan' },
  { nilai: 'latihan', nama: 'Latihan', ket: 'dengan tombol Saran dan Bantuan hitung' },
];

const PILIHAN_TEMA: readonly Pilihan[] = [
  { nilai: 'hijau', nama: 'Hijau' },
  { nilai: 'biru', nama: 'Biru' },
  { nilai: 'anggur', nama: 'Anggur' },
  { nilai: 'kontras', nama: 'Kontras tinggi' },
];

const PILIHAN_ANIMASI: readonly Pilihan[] = [
  { nilai: 'penuh', nama: 'Penuh' },
  { nilai: 'kurang', nama: 'Kurang', ket: 'tanpa hiasan' },
  { nilai: 'mati', nama: 'Mati' },
];

const PILIHAN_AI: readonly Pilihan[] = [
  { nilai: 'mudah', nama: 'Mudah' },
  { nilai: 'sedang', nama: 'Sedang' },
  { nilai: 'sulit', nama: 'Sulit' },
];

const namaDari = (pilihan: readonly Pilihan[], nilai: string): string => pilihan.find((p) => p.nilai === nilai)?.nama ?? nilai;

/** Ringkasan pilihan di dekat tombol Main, mis. "Pertandingan, Terbaik dari 3, lawan Sedang". */
export function teksRingkasPilihan(pengaturan: Pengaturan): string {
  return `${namaDari(PILIHAN_MODE, pengaturan.mode)} · ${namaDari(PILIHAN_FORMAT, pengaturan.format)} · Lawan ${namaDari(PILIHAN_AI, pengaturan.ai)}`;
}

/** Denah duduk: Anda di bawah, Rekan di seberang, Lawan Kiri dan Lawan Kanan di samping. */
function htmlDenah(): string {
  return (
    `<figure class="denah" role="img" aria-label="Denah duduk: Anda di bawah, Rekan di seberang Anda, Lawan Kiri dan Lawan Kanan di samping">` +
    `<span class="kursi utara">Rekan<small>tim Anda</small></span>` +
    `<span class="kursi barat lawan">Lawan Kiri</span>` +
    `<span class="kursi timur lawan">Lawan Kanan</span>` +
    `<span class="kursi selatan">Anda</span>` +
    `</figure>`
  );
}

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
  '28 kartu, tiap pemain 7. Anda berpasangan dengan Rekan (komputer) melawan Lawan Kiri dan Lawan Kanan.',
  'Kocokan pertama tiap partai dibuka pemegang kartu sesuai poin pertandingan (poin 0-0: kartu 0-0). Sesudah itu wajib dibuka dengan balak, oleh penutup kocokan sebelumnya (setelah tabrak: pemain dari tim pemenang dengan titik paling sedikit). Tanpa balak, hak pindah ke pemain berikutnya.',
  'Kartu disambung ke ujung yang angkanya sama. Tidak punya kartu cocok berarti lewat.',
  'Habis: pemain pertama yang menghabiskan kartu menutup. Tim lawannya mendapat markah sebesar total titik sisa kedua pemainnya, ditambah bonus bila ada.',
  'Bonus saat habis: double (kedua ujung sama) +20, triplet (menutup dengan balak) +30, quartet (keduanya) +50.',
  'Tabrak: tidak ada yang bisa main. Tim dengan titik sisa lebih banyak mendapat markah sebesar totalnya. Bila sama, tidak ada markah dan kocokan berikutnya dibuka 0-0.',
  `Tim yang markahnya mencapai ${BATAS_MARKAH} kalah partai; lawannya mendapat 1 poin. Markah kembali 0 di partai berikutnya.`,
  'Pertandingan dimenangkan tim yang lebih dulu mencapai 2 poin (terbaik dari 3) atau 3 poin (terbaik dari 5).',
];

/** Isi tambahan menu: pertandingan tersimpan (satu baris keterangan) dan statistik pemain. */
export interface TambahanMenu {
  readonly simpanan?: string | null;
  readonly statistik?: Statistik | null;
}

const persen = (h: Hitungan): string => (h.main === 0 ? '-' : `${Math.round((100 * h.menang) / h.main)}%`);
const baris = (nama: string, isi: string): string => `<tr><th scope="row">${nama}</th><td>${isi}</td></tr>`;

/** Statistik pemain; kosong bila belum ada permainan yang tercatat. */
function htmlStatistik(s: Statistik): string {
  const adaIsi = s.pertandingan.main + s.partai.main + s.kocokan.main > 0;
  const isi = adaIsi
    ? `<table class="tabel-statistik"><tbody>` +
      baris('Pertandingan', `${s.pertandingan.menang} menang dari ${s.pertandingan.main} (${persen(s.pertandingan)})`) +
      baris('Partai', `${s.partai.menang} menang dari ${s.partai.main} (${persen(s.partai)})`) +
      baris(
        'Kocokan',
        `${s.kocokan.menang} menang, ${s.kocokan.kalah} kalah, ${s.kocokan.main - s.kocokan.menang - s.kocokan.kalah} seri`,
      ) +
      baris('Bonus tim Anda', `double ${s.bonus.double}, triplet ${s.bonus.triplet}, quartet ${s.bonus.quartet}`) +
      baris('Menang beruntun', `${s.beruntun} sekarang, terbaik ${s.beruntunTerbaik}`) +
      baris('Lawan Mudah', `${s.perAi.mudah.menang} dari ${s.perAi.mudah.main} (${persen(s.perAi.mudah)})`) +
      baris('Lawan Sedang', `${s.perAi.sedang.menang} dari ${s.perAi.sedang.main} (${persen(s.perAi.sedang)})`) +
      baris('Lawan Sulit', `${s.perAi.sulit.menang} dari ${s.perAi.sulit.main} (${persen(s.perAi.sulit)})`) +
      `</tbody></table><button type="button" class="kecil" data-aksi="hapus-statistik">Hapus statistik</button>`
    : `<p>Belum ada permainan yang tercatat.</p>`;
  return `<details class="statistik"><summary>Statistik</summary>${isi}</details>`;
}

export function htmlMenu(pengaturan: Pengaturan, { simpanan = null, statistik = null }: TambahanMenu = {}): string {
  return (
    `<div class="meja layar menu">` +
    `<header class="papan-nama">` +
    `<div class="hias" aria-hidden="true"><span class="hias-kiri">${svgKartu(6, 6, ARAH_DATAR)}</span><span class="hias-kanan">${svgKartu(6, 3, ARAH_DATAR)}</span></div>` +
    `<h1 tabindex="-1">Gaple <span class="dua">2vs2</span></h1>` +
    `<p class="ket">Anda dan Rekan melawan Lawan Kiri dan Lawan Kanan.</p>` +
    `</header>` +
    (simpanan === null
      ? ''
      : `<section class="lanjut-simpanan" aria-label="Pertandingan tersimpan"><p class="ket-simpanan"><strong>Pertandingan tersimpan</strong><span>${simpanan}</span></p>` +
        `<button type="button" class="utama" data-aksi="lanjut-simpanan">Lanjutkan</button>` +
        `<small>Memulai pertandingan baru dengan Main menghapus yang tersimpan.</small></section>`) +
    `<div class="pengaturan">` +
    `<fieldset><legend>Mode</legend><div class="ubin">${radio('mode', PILIHAN_MODE, pengaturan.mode, () => true)}</div></fieldset>` +
    `<fieldset><legend>Format pertandingan</legend><div class="ubin">${radio('format', PILIHAN_FORMAT, pengaturan.format, () => true)}</div></fieldset>` +
    `<fieldset><legend>Lawan</legend><div class="ubin">${radio('ai', PILIHAN_AI, pengaturan.ai, (n) => AI_TERSEDIA.some((a) => a === n))}</div></fieldset>` +
    `<fieldset class="tema"><legend>Tema</legend><div class="ubin">${radio('tema', PILIHAN_TEMA, pengaturan.tema, () => true)}</div></fieldset>` +
    `<fieldset><legend>Animasi</legend><div class="ubin">${radio('animasi', PILIHAN_ANIMASI, pengaturan.animasi, () => true)}</div></fieldset>` +
    `<fieldset><legend>Bantuan dan suara</legend>` +
    `<label class="pilihan"><input type="checkbox" name="bantuan"${pengaturan.bantuan ? ' checked' : ''}> Bantuan hitung <small>(kartu tersisa dan peluang kartu lawan)</small></label>` +
    `<label class="pilihan"><input type="checkbox" name="suara"${pengaturan.suara ? ' checked' : ''}> Efek suara</label></fieldset>` +
    `</div>` +
    `<div class="mulai">${htmlDenah()}<div class="mulai-aksi"><p class="ringkas-pilihan">${teksRingkasPilihan(pengaturan)}</p>` +
    `<button type="button" class="utama" data-aksi="main">Main</button></div></div>` +
    (pengaturan.pernahMain ? '' : `<p class="saran-awal">Baru pertama kali? Pilih mode Latihan: ada tombol Saran dan Bantuan hitung.</p>`) +
    (statistik === null ? '' : htmlStatistik(statistik)) +
    `<details class="aturan"${pengaturan.pernahMain ? '' : ' open'}><summary>Cara bermain</summary><ul>${ATURAN.map((a) => `<li>${a}</li>`).join('')}</ul></details>` +
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
    `<h1 tabindex="-1">Partai ${pertandingan.riwayatPartai.length + 1} selesai</h1>` +
    `<p>${NAMA_TIM[partai.pemenang.kalah]} mencapai ${BATAS_MARKAH}. ${menang === 0 ? 'Anda menang partai ini.' : 'Lawan menang partai ini.'}</p>` +
    `<p>Markah akhir: Kita ${partai.markah[0]}, Lawan ${partai.markah[1]}</p>` +
    `<p class="poin">Poin: ${teksPoin(poinBaru)} (target ${pertandingan.target})</p>` +
    `<button type="button" class="utama" data-aksi="lanjut">${penentu ? 'Lihat hasil' : 'Partai berikutnya'}</button>` +
    `</div>`
  );
}

/** Konfeti berupa titik kartu yang jatuh; posisi dan waktu ditentukan dari nomor urut (tanpa acak). */
function htmlKonfeti(): string {
  return Array.from({ length: 30 }, (_, i) => {
    const kiri = (i * 37 + 11) % 100;
    const tunda = ((i * 17) % 24) / 10;
    const durasi = 3 + (i % 5) * 0.5;
    return `<span style="left:${kiri}%;animation-delay:${tunda}s;animation-duration:${durasi}s"></span>`;
  }).join('');
}

export function htmlAkhir(pertandingan: Pertandingan): string {
  const juara = pertandingan.juara;
  const baris = pertandingan.riwayatPartai
    .map((r) => `<li>Partai ${r.nomor}: markah ${r.markahAkhir[0]} - ${r.markahAkhir[1]}, menang ${NAMA_TIM[r.menang]}</li>`)
    .join('');
  return (
    `<div class="meja layar akhir${juara === 0 ? ' menang' : ''}">` +
    (juara === 0 ? `<div class="konfeti" aria-hidden="true">${htmlKonfeti()}</div>` : '') +
    `<h1 tabindex="-1">${juara === 0 ? 'Tim Anda juara!' : 'Lawan juara.'}</h1>` +
    `<p class="poin">${teksPoin(pertandingan.poin)}</p>` +
    `<ol class="riwayat">${baris}</ol>` +
    `<div class="tombol-baris"><button type="button" class="utama" data-aksi="main-lagi">Main lagi</button>` +
    `<button type="button" data-aksi="menu">Kembali ke menu</button></div>` +
    `</div>`
  );
}
