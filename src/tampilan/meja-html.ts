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
    return (
      `<div class="markah markah-${tim}"><span class="nama">${NAMA_TIM[tim]}</span>` +
      `<span class="angka">${partai.markah[tim]}</span>` +
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

function htmlLawan(kocokan: StateKocokan, pemain: NomorPemain, kelas: string): string {
  const jumlah = kocokan.tangan[pemain].length;
  const punggung = Array.from({ length: jumlah }, () => `<span class="lipatan">${svgPunggung(ARAH_TEGAK)}</span>`).join('');
  return (
    `<section class="lawan ${kelas}" aria-label="${NAMA_PEMAIN[pemain]}, ${jumlah} kartu">` +
    `<div class="nama-pemain">${NAMA_PEMAIN[pemain]} · ${jumlah}</div>` +
    `<div class="kipas">${punggung}</div></section>`
  );
}

function htmlRangkaian(kocokan: StateKocokan, area: Area): string {
  const { meja } = kocokan;
  if (meja.rangkaian.length === 0) {
    return `<div class="rangkaian kosong">Meja masih kosong</div>`;
  }
  const tata = tataRantai(meja.rangkaian, { area, indeksAnchor: indeksAnchor(kocokan) });
  return `<div class="rangkaian">${svgRangkaian(tata, meja)}</div>`;
}

function teksLangkahTerakhir(kocokan: StateKocokan): string {
  const terakhir = kocokan.riwayat.at(-1);
  if (!terakhir) return '';
  const nama = terakhir.pemain === PEMAIN_MANUSIA ? 'Anda' : NAMA_PEMAIN[terakhir.pemain];
  return terakhir.aksi === 'lewat' ? `${nama} lewat` : `${nama} memainkan ${terakhir.kartu.a}-${terakhir.kartu.b}`;
}

function teksStatus(partai: PartaiTampil): string {
  const { kocokan } = partai;
  if (partai.status !== 'berjalan') return '';
  if (kocokan.giliran === PEMAIN_MANUSIA) {
    const legal = kartuLegalPemain(kocokan, PEMAIN_MANUSIA).length;
    return legal > 0 ? 'Giliran Anda: ketuk kartu yang menyala' : 'Giliran Anda: tidak ada kartu yang cocok, Anda lewat';
  }
  return `Giliran ${NAMA_PEMAIN[kocokan.giliran]}`;
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
function htmlSaran(partai: PartaiBerjalan, saran: Saran | null, sedangMemilihSisi: boolean): string {
  const { kocokan } = partai;
  if (kocokan.giliran !== PEMAIN_MANUSIA || kartuLegalPemain(kocokan, PEMAIN_MANUSIA).length === 0 || sedangMemilihSisi) return '';
  if (saran === null) return `<div class="saran-baris"><button type="button" data-aksi="saran">Saran</button></div>`;
  const ujung = saran.sisi === 'kiri' ? kocokan.meja.ujungKiri : saran.sisi === 'kanan' ? kocokan.meja.ujungKanan : null;
  const tempat = saran.sisi === 'awal' || ujung === null ? 'di meja' : `di sisi ${saran.sisi} (ujung ${ujung})`;
  return `<div class="saran-baris"><p class="teks-saran" role="status">Saran: kartu ${saran.kartu.a}-${saran.kartu.b} ${tempat}</p></div>`;
}

function htmlPilihSisi(kocokan: StateKocokan, pilihan: PilihanManusia): string {
  const tombol = pilihan.sisi.map((sisi) => `<button type="button" data-sisi="${sisi}">${labelSisi(kocokan, sisi)}</button>`).join('');
  return `<div class="pilih-sisi" role="group" aria-label="Pilih sisi">${tombol}<button type="button" data-sisi="batal" class="batal">Batal</button></div>`;
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
  return (
    `<div class="ringkasan"><p>${teksAkhirKocokan(hasil)}</p><p>Markah bertambah: ${tambahan}</p>${penutup}` +
    `<button type="button" data-aksi="lanjut">${tombol}</button></div>`
  );
}

function htmlTangan(partai: PartaiTampil, terpilih: string | null, saranId: string | null): string {
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
  return `<section class="tangan" aria-label="Tangan Anda, ${kocokan.tangan[PEMAIN_MANUSIA].length} kartu">${tombol}</section>`;
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
  }: OpsiMeja = {},
): string {
  if (partai.kocokan === null) throw new Error('Tidak ada kocokan yang bisa digambar');
  const { kocokan } = partai;
  const tampilBantuan = (bantuan || latihan) && partai.status === 'berjalan';
  return (
    `<div class="meja${tampilBantuan ? ' dengan-bantuan' : ''}">` +
    htmlBar(partai, nomorPartai, dijeda, latihan, suara) +
    htmlLawan(kocokan, UTARA, 'utara') +
    htmlLawan(kocokan, BARAT, 'barat') +
    `<section class="tengah">${htmlRangkaian(kocokan, areaRangkaian)}` +
    `<p class="status" role="status">${teksStatus(partai)}<span class="terakhir">${teksLangkahTerakhir(kocokan)}</span></p>` +
    (pilihan ? htmlPilihSisi(kocokan, pilihan) : '') +
    (latihan && partai.status === 'berjalan' ? htmlSaran(partai, saran, pilihan !== null) : '') +
    (partai.status === 'ringkasan' ? htmlRingkasan(partai) : '') +
    `</section>` +
    (tampilBantuan ? htmlBantuan(kocokan) : '') +
    htmlLawan(kocokan, TIMUR, 'timur') +
    htmlTangan(partai, pilihan?.kartu.id ?? null, saran?.kartu.id ?? null) +
    `</div>`
  );
}
