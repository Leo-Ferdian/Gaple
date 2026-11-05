// meja-html.ts: mengubah state partai menjadi HTML meja permainan.
//
// Murni: masukan state, keluaran string. Tidak menyentuh halaman. Di browser,
// main.ts yang memasang hasilnya ke halaman. Pemain manusia selalu Selatan
// (nomor 0), partainya Utara (2), lawannya Barat (1) dan Timur (3).
//
// Tangan Anda berupa tombol. Hanya kartu yang legal, pada giliran Anda, yang
// aktif; sisanya disabled sehingga tampil redup dan tidak bisa diketuk.

import { NAMA_PEMAIN, kartuLegalPemain } from '../kocokan.ts';
import { PEMAIN_MANUSIA } from '../controller.ts';
import type { PilihanManusia, Saran } from '../controller.ts';
import type { Kartu, NomorPemain, NomorTim } from '../engine.ts';
import type { Sisi } from '../meja.ts';
import type { Partai, PartaiBerjalan, PartaiRingkasan } from '../partai.ts';
import type { HasilKocokan } from '../markah.ts';
import type { StateKocokan } from '../tipe-kocokan.ts';
import { BATAS_MARKAH } from '../markah.ts';
import { svgKartu, svgPunggung, ARAH_TEGAK } from './kartu-svg.ts';
import { buatPelacak, pandangan } from '../pelacak.ts';
import { tataRantai, indeksAnchor, AREA_LUAS } from './tata-rantai.ts';
import type { Area } from './tata-rantai.ts';
import { svgRangkaian } from './rangkaian-svg.ts';
import { hitungBayangan } from './bayangan.ts';
import type { KartuBaru } from './rangkaian-svg.ts';

export type { KartuBaru };

const KURSI = { 0: 'selatan', 1: 'barat', 2: 'utara', 3: 'timur' } as const satisfies Record<NomorPemain, KartuBaru['dari']>;
/** Nama kursi pemain (dipakai untuk arah datang kartu). */
export const kursiPemain = (pemain: NomorPemain): KartuBaru['dari'] => KURSI[pemain];

export { PEMAIN_MANUSIA };
const UTARA: NomorPemain = 2;
const BARAT: NomorPemain = 1;
const TIMUR: NomorPemain = 3;

const NAMA_TIM = ['Kita', 'Lawan'] as const;

/** Partai yang punya kocokan untuk digambar. */
type PartaiTampil = PartaiBerjalan | PartaiRingkasan;

function urutkanTangan(tangan: readonly Kartu[]): Kartu[] {
  return [...tangan].sort((x, y) => x.a - y.a || x.b - y.b);
}

function htmlBar(partai: PartaiTampil, nomorPartai: number, dijeda: boolean, latihan: boolean, suara: boolean): string {
  const batang = (tim: NomorTim): string => {
    const persen = Math.min(100, Math.round((100 * partai.markah[tim]) / BATAS_MARKAH));
    const tambah = partai.status === 'ringkasan' ? partai.hasilTerakhir.tambahan[tim] : 0;
    return (
      `<div class="markah markah-${tim}"><span class="nama">${NAMA_TIM[tim]}</span>` +
      `<span class="angka">${partai.markah[tim]}</span>` +
      (tambah > 0 ? `<span class="tambah" aria-hidden="true">+${tambah}</span>` : '') +
      `<span class="batang" aria-hidden="true"><span style="width:${persen}%"></span></span></div>`
    );
  };
  return (
    `<header class="bar">` +
    `<div class="markah-dua papan" aria-label="Markah, batas ${BATAS_MARKAH}">${batang(0)}${batang(1)}</div>` +
    `<div class="info">${latihan ? 'Latihan · ' : ''}Poin ${partai.poin[0]}-${partai.poin[1]} · Partai ${nomorPartai} · Kocokan ${partai.nomorKocokan}</div>` +
    `<div class="aksi"><button type="button" data-aksi="suara" aria-pressed="${suara}">${suara ? 'Suara nyala' : 'Suara mati'}</button>` +
    `<button type="button" data-aksi="jeda">${dijeda ? 'Lanjut' : 'Jeda'}</button><button type="button" data-aksi="menu">Menu</button></div>` +
    `</header>`
  );
}

const capLewat = `<span class="lewat-cap" aria-hidden="true">Lewat</span>`;

function htmlLawan(kocokan: StateKocokan, pemain: NomorPemain, kelas: string, berjalan: boolean, buka: boolean, lewat: boolean): string {
  const giliran = berjalan && kocokan.giliran === pemain ? ' giliran' : '';
  const tangan = kocokan.tangan[pemain];
  const jumlah = tangan.length;
  if (buka) {
    // Kocokan berakhir: kartu sisa dibuka supaya jelas dari mana markah berasal.
    const titik = tangan.reduce((jml, k) => jml + k.a + k.b, 0);
    const kartu = urutkanTangan(tangan)
      .map((k) => `<span class="lipatan">${svgKartu(k.a, k.b, ARAH_TEGAK)}</span>`)
      .join('');
    const ringkas = jumlah === 0 ? 'habis' : `${jumlah} kartu · ${titik} titik`;
    return (
      `<section class="lawan ${kelas} terbuka" aria-label="${NAMA_PEMAIN[pemain]}, ${jumlah === 0 ? 'kartu habis' : `sisa ${jumlah} kartu, ${titik} titik`}">` +
      `<div class="nama-pemain">${NAMA_PEMAIN[pemain]} · ${ringkas}</div>` +
      `<div class="kipas">${kartu}</div></section>`
    );
  }
  const punggung = Array.from({ length: jumlah }, () => `<span class="lipatan">${svgPunggung(ARAH_TEGAK)}</span>`).join('');
  return (
    `<section class="lawan ${kelas}${giliran}${lewat ? ' lewat-baru' : ''}" aria-label="${NAMA_PEMAIN[pemain]}, ${jumlah} kartu">` +
    `<div class="nama-pemain">${NAMA_PEMAIN[pemain]} · ${jumlah}</div>` +
    `<div class="kipas">${punggung}</div>${lewat ? capLewat : ''}</section>`
  );
}

function htmlRangkaian(
  kocokan: StateKocokan,
  area: Area,
  terbaru: KartuBaru | null,
  garis: boolean,
  pilihan: PilihanManusia | null,
): string {
  const { meja } = kocokan;
  if (meja.rangkaian.length === 0) {
    return `<div class="rangkaian kosong">Meja masih kosong</div>`;
  }
  const tata = tataRantai(meja.rangkaian, { area, indeksAnchor: indeksAnchor(kocokan) });
  // Pilihan kartu yang bisa dipasang di dua ujung: tampilkan bayangan di masing-masing ujung.
  const bayangan = pilihan !== null && pilihan.sisi.length > 1 ? hitungBayangan(kocokan, pilihan.kartu, pilihan.sisi, area, tata) : [];
  return `<div class="rangkaian">${svgRangkaian(tata, meja, terbaru, garis, bayangan)}</div>`;
}

function teksLangkahTerakhir(kocokan: StateKocokan): string {
  const terakhir = kocokan.riwayat.at(-1);
  if (!terakhir) return '';
  const nama = terakhir.pemain === PEMAIN_MANUSIA ? 'Anda' : NAMA_PEMAIN[terakhir.pemain];
  return terakhir.aksi === 'lewat' ? `${nama} lewat` : `${nama} memainkan ${terakhir.kartu.a}-${terakhir.kartu.b}`;
}

/** Teks polos untuk pembaca layar: langkah terakhir dan giliran sekarang. */
export function teksPengumuman(partai: Partai): string {
  if (partai.kocokan === null) return '';
  const status = partai.status === 'ringkasan' ? teksAkhirKocokan(partai.hasilTerakhir) : teksStatus(partai).replace(/<[^>]*>/g, '');
  return [teksLangkahTerakhir(partai.kocokan), status].filter((t) => t !== '').join('. ');
}

function teksStatus(partai: PartaiTampil): string {
  const { kocokan } = partai;
  if (partai.status !== 'berjalan') return '';
  if (kocokan.giliran === PEMAIN_MANUSIA) {
    const legal = kartuLegalPemain(kocokan, PEMAIN_MANUSIA).length;
    return legal > 0 ? 'Giliran Anda: ketuk kartu yang menyala' : 'Giliran Anda: tidak ada kartu yang cocok, Anda lewat';
  }
  return `Giliran ${NAMA_PEMAIN[kocokan.giliran]}<span class="berpikir" aria-hidden="true"></span>`;
}

function labelSisi(kocokan: StateKocokan, sisi: Sisi): string {
  switch (sisi) {
    case 'kiri':
      return `Kiri (ujung ${kocokan.meja.ujungKiri})`;
    case 'kanan':
      return `Kanan (ujung ${kocokan.meja.ujungKanan})`;
    case 'awal':
      return 'Letakkan';
  }
}

const persen = (x: number): string => `${Math.round(x * 100)}%`;

/** Panel bantuan hitung: sisa kartu per angka dan peluang tiap pemain lain, dari pandangan Anda sendiri. */
function htmlBantuan(kocokan: StateKocokan): string {
  const pelacak = buatPelacak(pandangan(kocokan, PEMAIN_MANUSIA));
  const { ujungKiri, ujungKanan } = kocokan.meja;
  const sisa = pelacak.sisaPerAngka.map((n, angka) => `<li><span class="angka-sisa">${angka}</span> ${n}</li>`).join('');
  let peluang = '';
  if (ujungKiri !== null && ujungKanan !== null) {
    const baris = [BARAT, UTARA, TIMUR]
      .map((p) => {
        const kiri = persen(pelacak.peluangPunyaAngka(p, ujungKiri));
        const kanan = ujungKiri === ujungKanan ? '' : persen(pelacak.peluangPunyaAngka(p, ujungKanan));
        const lewat = persen(pelacak.peluangTidakPunya(p, ujungKiri, ujungKanan));
        return `<tr><th scope="row">${NAMA_PEMAIN[p]}</th><td>${kiri}</td><td>${kanan === '' ? '-' : kanan}</td><td>${lewat}</td></tr>`;
      })
      .join('');
    peluang =
      `<table class="peluang"><caption>Peluang punya kartu berangka ujung</caption>` +
      `<thead><tr><th></th><th>${ujungKiri}</th><th>${ujungKiri === ujungKanan ? '-' : ujungKanan}</th><th>lewat</th></tr></thead><tbody>${baris}</tbody></table>`;
  }
  return (
    `<section class="bantuan" aria-label="Bantuan hitung">` +
    `<div class="sisa"><span class="judul">Sisa kartu per angka</span><ul>${sisa}</ul></div>${peluang}</section>`
  );
}

/** Tombol Saran dan teks saran (mode Latihan). Hanya pada giliran Anda memilih kartu. */
function htmlSaran(partai: PartaiBerjalan, saran: Saran | null, sedangMemilihSisi: boolean, bisaUlang: boolean): string {
  const { kocokan } = partai;
  if (kocokan.giliran !== PEMAIN_MANUSIA || sedangMemilihSisi) return '';
  const ulang = bisaUlang ? `<button type="button" data-aksi="ulang">Ulang langkah</button>` : '';
  if (kartuLegalPemain(kocokan, PEMAIN_MANUSIA).length === 0) return ulang === '' ? '' : `<div class="saran-baris">${ulang}</div>`;
  if (saran === null) return `<div class="saran-baris"><button type="button" data-aksi="saran">Saran</button>${ulang}</div>`;
  const ujung = saran.sisi === 'kiri' ? kocokan.meja.ujungKiri : saran.sisi === 'kanan' ? kocokan.meja.ujungKanan : null;
  const tempat = saran.sisi === 'awal' || ujung === null ? 'di meja' : `di sisi ${saran.sisi} (ujung ${ujung})`;
  return `<div class="saran-baris"><p class="teks-saran" role="status">Saran: kartu ${saran.kartu.a}-${saran.kartu.b} ${tempat}</p>${ulang}</div>`;
}

function htmlPilihSisi(kocokan: StateKocokan, pilihan: PilihanManusia): string {
  const tombol = pilihan.sisi.map((sisi) => `<button type="button" data-sisi="${sisi}">${labelSisi(kocokan, sisi)}</button>`).join('');
  return `<div class="pilih-sisi" role="group" aria-label="Pilih sisi, atau tekan panah kiri dan kanan">${tombol}<button type="button" data-sisi="batal" class="batal">Batal</button></div>`;
}

function teksAkhirKocokan(hasil: HasilKocokan): string {
  if (hasil.akhir === 'habis') {
    const bonus = hasil.bonus ? ` dengan bonus ${hasil.bonus.jenis} (+${hasil.bonus.nilai})` : '';
    return `${NAMA_PEMAIN[hasil.penutup]} menghabiskan kartu${bonus}.`;
  }
  return hasil.seri ? 'Tabrak, titik kedua tim sama: tidak ada markah.' : 'Tabrak: tidak ada yang bisa main.';
}

function htmlRingkasan(partai: PartaiRingkasan): string {
  const { hasilTerakhir: hasil, pemenang } = partai;
  const tambahan = `${NAMA_TIM[0]} +${hasil.tambahan[0]}, ${NAMA_TIM[1]} +${hasil.tambahan[1]}`;
  const penutup = pemenang ? `<p class="akhir-partai">Partai selesai: ${NAMA_TIM[pemenang.kalah]} mencapai ${BATAS_MARKAH}.</p>` : '';
  const tombol = pemenang ? 'Lihat hasil partai' : 'Kocokan berikutnya';
  const cap = hasil.bonus ? `<p class="cap-bonus" aria-hidden="true">${hasil.bonus.jenis} +${hasil.bonus.nilai}</p>` : '';
  return (
    `<div class="ringkasan">${cap}<p>${teksAkhirKocokan(hasil)}</p><p>Markah bertambah: ${tambahan}</p>${penutup}` +
    `<button type="button" data-aksi="lanjut">${tombol}</button></div>`
  );
}

function htmlTangan(partai: PartaiTampil, terpilih: string | null, saranId: string | null, lewat: boolean): string {
  const { kocokan } = partai;
  const giliranAnda = partai.status === 'berjalan' && kocokan.giliran === PEMAIN_MANUSIA;
  const legal = new Set(kartuLegalPemain(kocokan, PEMAIN_MANUSIA).map((p) => p.kartu.id));
  const tombol = urutkanTangan(kocokan.tangan[PEMAIN_MANUSIA])
    .map((kartu) => {
      const aktif = giliranAnda && legal.has(kartu.id);
      const kelas = `kartu-tangan ${aktif ? 'legal' : 'redup'}${kartu.id === terpilih ? ' terpilih' : ''}${aktif && kartu.id === saranId ? ' saran' : ''}`;
      return `<button type="button" class="${kelas}" data-kartu="${kartu.id}"${aktif ? '' : ' disabled'}>${svgKartu(kartu.a, kartu.b, ARAH_TEGAK)}</button>`;
    })
    .join('');
  return `<section class="tangan${giliranAnda ? ' giliran' : ''}${lewat ? ' lewat-baru' : ''}" aria-label="Tangan Anda, ${kocokan.tangan[PEMAIN_MANUSIA].length} kartu">${tombol}${lewat ? capLewat : ''}</section>`;
}

function htmlTirai(konfirmasi: boolean, dijeda: boolean): string {
  if (konfirmasi) {
    return (
      `<div class="tirai"><div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="judul-dialog">` +
      `<h2 id="judul-dialog">Keluar ke menu?</h2><p>Pertandingan yang sedang berjalan akan hilang.</p>` +
      `<div class="tombol-baris"><button type="button" class="utama" data-aksi="batal-keluar" data-fokus>Lanjut main</button>` +
      `<button type="button" data-aksi="keluar">Keluar</button></div></div></div>`
    );
  }
  if (dijeda) {
    return (
      `<div class="tirai"><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="judul-dialog">` +
      `<h2 id="judul-dialog">Dijeda</h2><p>Komputer menunggu Anda.</p>` +
      `<div class="tombol-baris"><button type="button" class="utama" data-aksi="jeda" data-fokus>Lanjut main</button></div></div></div>`
    );
  }
  return '';
}

/** Pilihan tampilan meja. `pilihan`: kartu yang sedang dipilih dan sisi yang masih harus ditentukan. */
export interface OpsiMeja {
  readonly nomorPartai?: number;
  readonly dijeda?: boolean;
  readonly pilihan?: PilihanManusia | null;
  readonly areaRangkaian?: Area;
  /** Tampilkan panel bantuan hitung (kartu tersisa dan peluang). */
  readonly bantuan?: boolean;
  /** Mode Latihan: Bantuan hitung selalu tampil dan ada tombol Saran. */
  readonly latihan?: boolean;
  /** Saran langkah yang sedang ditampilkan (mode Latihan). */
  readonly saran?: Saran | null;
  /** Efek suara menyala (hanya untuk label tombol). */
  readonly suara?: boolean;
  /** Kartu yang baru dimainkan (animasi meluncur). */
  readonly terbaru?: KartuBaru | null;
  /** Ada langkah Anda yang bisa diulang (mode Latihan). */
  readonly bisaUlang?: boolean;
  /** Pemain yang baru saja lewat (balon "Lewat"). */
  readonly lewat?: NomorPemain | null;
  /** Kocokan baru saja dibagi (animasi membagi kartu). */
  readonly bagi?: boolean;
  /** Tampilkan dialog konfirmasi keluar ke menu. */
  readonly konfirmasi?: boolean;
  /** Garis bantu pengembangan: batas area, margin, dan kerangka tata letak rantai. */
  readonly garis?: boolean;
}

/** Meja untuk partai berstatus 'berjalan' atau 'ringkasan'. */
export function htmlMeja(
  partai: Partai,
  {
    nomorPartai = 1,
    dijeda = false,
    pilihan = null,
    areaRangkaian = AREA_LUAS,
    bantuan = false,
    latihan = false,
    saran = null,
    suara = true,
    terbaru = null,
    bagi = false,
    lewat = null,
    bisaUlang = false,
    konfirmasi = false,
    garis = false,
  }: OpsiMeja = {},
): string {
  if (partai.kocokan === null) throw new Error('Tidak ada kocokan yang bisa digambar');
  const { kocokan } = partai;
  const berjalan = partai.status === 'berjalan';
  const tampilBantuan = (bantuan || latihan) && partai.status === 'berjalan';
  return (
    `<div class="meja${tampilBantuan ? ' dengan-bantuan' : ''}${bagi ? ' bagi-baru' : ''}">` +
    htmlBar(partai, nomorPartai, dijeda, latihan, suara) +
    htmlLawan(kocokan, UTARA, 'utara', berjalan, partai.status === 'ringkasan', lewat === UTARA) +
    htmlLawan(kocokan, BARAT, 'barat', berjalan, partai.status === 'ringkasan', lewat === BARAT) +
    `<section class="tengah">${htmlRangkaian(kocokan, areaRangkaian, terbaru, garis, pilihan)}` +
    `<p class="status" role="status">${teksStatus(partai)}<span class="terakhir">${teksLangkahTerakhir(kocokan)}</span></p>` +
    (pilihan ? htmlPilihSisi(kocokan, pilihan) : '') +
    (latihan && partai.status === 'berjalan' ? htmlSaran(partai, saran, pilihan !== null, bisaUlang) : '') +
    (partai.status === 'ringkasan' ? htmlRingkasan(partai) : '') +
    `</section>` +
    (tampilBantuan ? htmlBantuan(kocokan) : '') +
    htmlLawan(kocokan, TIMUR, 'timur', berjalan, partai.status === 'ringkasan', lewat === TIMUR) +
    htmlTangan(partai, pilihan?.kartu.id ?? null, saran?.kartu.id ?? null, lewat === PEMAIN_MANUSIA) +
    htmlTirai(konfirmasi, dijeda) +
    `</div>`
  );
}
