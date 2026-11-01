// main.ts: titik masuk di browser. Satu-satunya berkas yang menyentuh halaman.
//
// Menyimpan state aplikasi di satu variabel, menggambar ulang setiap berubah,
// menangani ketukan lewat satu pendengar klik, dan menjadwalkan langkah komputer.
//
// Parameter di alamat halaman:
//   ?benih=7   benih pengacak (sama = kocokan sama)
//   ?jeda=700  jeda tiap langkah komputer dalam milidetik (0 = tanpa jeda)

import { buatAcak } from './rng.ts';
import { adalahSisi } from './meja.ts';
import type { Sisi } from './meja.ts';
import {
  aplikasiBaru,
  mulaiPermainan,
  kembaliKeMenu,
  ubahPengaturan,
  layarAktif,
  partaiAktif,
  nomorPartai,
  ubahPartaiAktif,
  lanjutkan,
  adaLangkahOtomatis,
  langkahOtomatis,
  pilihanKartu,
  mainkanManusia,
  adalahAi,
  adalahMode,
  saranManusia,
  menungguManusia,
  PEMAIN_MANUSIA,
} from './controller.ts';
import type { PilihanManusia, Saran } from './controller.ts';
import { adalahFormat } from './pertandingan.ts';
import { muatPengaturan, simpanPengaturan } from './penyimpanan.ts';
import { htmlMeja, teksPengumuman, kursiPemain } from './tampilan/meja-html.ts';
import type { KartuBaru } from './tampilan/meja-html.ts';
import { AREA_LUAS, AREA_SEMPIT } from './tampilan/tata-rantai.ts';
import { htmlMenu, htmlPartaiSelesai, htmlAkhir } from './tampilan/layar-html.ts';
import { buatSuara } from './suara.ts';

const parameter = new URLSearchParams(location.search);
const acak = buatAcak(Number(parameter.get('benih') ?? Date.now() % 100000));
const jeda = Number(parameter.get('jeda') ?? 700);
function ambilApp(): HTMLElement {
  const elemen = document.querySelector('#app');
  if (!(elemen instanceof HTMLElement)) throw new Error('Elemen #app tidak ada di halaman');
  return elemen;
}
const app = ambilApp();

// Mengakses localStorage saja bisa melempar error di mode pribadi.
function ambilPenyimpanan(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
const penyimpanan = ambilPenyimpanan();

let aplikasi = aplikasiBaru(muatPengaturan(penyimpanan));
let pilihan: PilihanManusia | null = null; // kartu yang dipilih dan masih menunggu penentuan sisi
let dijeda = false;
let saran: Saran | null = null; // saran langkah yang sedang tampil (mode Latihan)
let pewaktu: ReturnType<typeof setTimeout> | undefined;

// Suara: konteks audio dibuat saat efek pertama diputar (setelah ketukan pemain).
const suara = buatSuara(() => new AudioContext(), aplikasi.pengaturan.suara);
let kunciKocokan = ''; // partai dan kocokan yang riwayatnya sedang diikuti (suara dan animasi)
let riwayatTerdengar = 0;
let layarSebelumnya = '';
let statusSebelumnya = '';
// Garis bantu pengembangan (batas meja): ?garis=1 di alamat, atau tombol G.
let garisBantu = parameter.get('garis') === '1';
let konfirmasiKeluar = false; // dialog "Keluar ke menu?" sedang tampil
let papanKetik = false; // masukan terakhir dari papan ketik (fokus perlu dijaga saat gambar ulang)

/** Yang perlu ditampilkan khusus pada gambar ini: kartu yang baru meluncur, kocokan yang baru dibagi. */
interface Kejadian {
  readonly terbaru: KartuBaru | null;
  readonly bagi: boolean;
}

/** Memutar efek untuk yang baru terjadi sejak gambar terakhir, dan mengembalikan penanda animasinya. */
function bunyikan(layar: string): Kejadian {
  const partai = partaiAktif(aplikasi);
  let kejadian: Kejadian = { terbaru: null, bagi: false };
  if (layar === 'akhir' && layarSebelumnya !== 'akhir') {
    suara.putar(aplikasi.pertandingan?.juara === 0 ? 'menang' : 'kalah');
  }
  layarSebelumnya = layar;
  if (partai === null || partai.kocokan === null || layar === 'akhir') return kejadian;

  const kunci = `${nomorPartaiSaatIni()}-${partai.nomorKocokan}`;
  const { riwayat } = partai.kocokan;
  if (kunci !== kunciKocokan) {
    kejadian = { terbaru: null, bagi: riwayat.length === 0 };
    if (kejadian.bagi) suara.putar('bagi');
  } else if (riwayat.length > riwayatTerdengar) {
    const terakhir = riwayat.at(-1);
    if (terakhir !== undefined) {
      if (terakhir.aksi === 'lewat') {
        suara.putar('lewat');
      } else {
        suara.putar(terakhir.kartu.a === terakhir.kartu.b ? 'balak' : 'letak');
        kejadian = { terbaru: { id: terakhir.kartu.id, dari: kursiPemain(terakhir.pemain) }, bagi: false };
      }
      // Giliran Anda tiba (setelah langkah komputer): bunyi lembut sesudah klak kartu.
      if (partai.status === 'berjalan' && terakhir.pemain !== PEMAIN_MANUSIA && menungguManusia(partai)) suara.putar('giliran', 0.18);
    }
  }
  if (partai.status === 'ringkasan' && statusSebelumnya !== 'ringkasan' && partai.hasilTerakhir.bonus !== null) suara.putar('bonus', 0.3);
  statusSebelumnya = partai.status;
  kunciKocokan = kunci;
  riwayatTerdengar = riwayat.length;
  return kejadian;
}
const nomorPartaiSaatIni = (): number => (aplikasi.pertandingan === null ? 0 : nomorPartai(aplikasi));

// Layar sempit (HP) memakai area rantai yang lebih tinggi dan kurang lebar.
const layarSempit = window.matchMedia('(max-width: 640px)');
const areaRangkaian = () => (layarSempit.matches ? AREA_SEMPIT : AREA_LUAS);

const pengumuman = document.querySelector('#pengumuman');
let teksPengumumanTerakhir = '';
function umumkan(teks: string): void {
  if (teks === teksPengumumanTerakhir) return;
  teksPengumumanTerakhir = teks;
  if (pengumuman instanceof HTMLElement) pengumuman.textContent = teks;
}

/** Penanda elemen yang sedang fokus, supaya bisa difokuskan lagi setelah gambar ulang. */
function pemilihFokus(): string | null {
  const aktif = document.activeElement;
  if (!(aktif instanceof HTMLElement) || !app.contains(aktif)) return null;
  const { kartu, sisi, aksi } = aktif.dataset;
  if (kartu) return `[data-kartu="${kartu}"]`;
  if (sisi) return `[data-sisi="${sisi}"]`;
  if (aksi) return `[data-aksi="${aksi}"]`;
  if (aktif instanceof HTMLInputElement) return `input[name="${aktif.name}"][value="${aktif.value}"]`;
  return null;
}

/** Fokus kembali ke elemen yang sama, atau ke tempat yang masuk akal bila elemen itu sudah tidak ada. */
function pulihkanFokus(pemilih: string | null): void {
  if (!papanKetik) return;
  const sama = pemilih === null ? null : app.querySelector(pemilih);
  const kandidat =
    (sama instanceof HTMLButtonElement && sama.disabled ? null : sama) ??
    app.querySelector('[data-fokus]') ??
    app.querySelector('.pilih-sisi button') ??
    app.querySelector('.ringkasan button') ??
    app.querySelector('.layar button.utama') ??
    app.querySelector('button.kartu-tangan.legal');
  if (kandidat instanceof HTMLElement) kandidat.focus({ preventScroll: true });
}

function gambar(): void {
  clearTimeout(pewaktu);
  const layar = layarAktif(aplikasi);
  const { pertandingan } = aplikasi;
  const kejadian = bunyikan(layar);
  const fokus = pemilihFokus();
  const aturanTerbuka = app.querySelector('details.aturan');
  const bukaAturan = aturanTerbuka instanceof HTMLDetailsElement ? aturanTerbuka.open : null;

  if (layar === 'menu' || pertandingan === null) {
    app.innerHTML = htmlMenu(aplikasi.pengaturan);
    umumkan('');
    const aturan = app.querySelector('details.aturan');
    if (bukaAturan !== null && aturan instanceof HTMLDetailsElement) aturan.open = bukaAturan;
  } else if (layar === 'akhir') {
    app.innerHTML = htmlAkhir(pertandingan);
    umumkan(pertandingan.juara === 0 ? 'Tim Anda juara' : 'Lawan juara');
  } else if (layar === 'partai-selesai') {
    app.innerHTML = htmlPartaiSelesai(pertandingan);
    umumkan('Partai selesai');
  } else {
    const partai = partaiAktif(aplikasi);
    if (partai === null) throw new Error('Layar meja tanpa partai aktif');
    app.innerHTML = htmlMeja(partai, {
      nomorPartai: nomorPartai(aplikasi),
      dijeda,
      pilihan,
      areaRangkaian: areaRangkaian(),
      bantuan: aplikasi.pengaturan.bantuan,
      latihan: aplikasi.pengaturan.mode === 'latihan',
      saran,
      suara: aplikasi.pengaturan.suara,
      terbaru: kejadian.terbaru,
      bagi: kejadian.bagi,
      konfirmasi: konfirmasiKeluar,
      garis: garisBantu,
    });
    umumkan(teksPengumuman(partai));
    // Dialog terbuka: isi meja tidak bisa dijangkau papan ketik maupun pembaca layar.
    if (konfirmasiKeluar || dijeda) {
      for (const anak of Array.from(app.querySelectorAll('.meja > :not(.tirai)'))) anak.setAttribute('inert', '');
    }
    if (!dijeda && !konfirmasiKeluar && adaLangkahOtomatis(partai)) {
      pewaktu = setTimeout(() => {
        aplikasi = ubahPartaiAktif(aplikasi, (p) => langkahOtomatis(p, acak, aplikasi.pengaturan.ai));
        gambar();
      }, jeda);
    }
  }
  pulihkanFokus(fokus);
}

function mainkan(sisi: Sisi): void {
  if (pilihan === null) return;
  const idKartu = pilihan.kartu.id;
  aplikasi = ubahPartaiAktif(aplikasi, (p) => mainkanManusia(p, idKartu, sisi));
  pilihan = null;
  saran = null;
  gambar();
}

function mulai(): void {
  aplikasi = mulaiPermainan(aplikasi, acak);
  simpanPengaturan(penyimpanan, aplikasi.pengaturan);
  pilihan = null;
  saran = null;
  dijeda = false;
  konfirmasiKeluar = false;
  kunciKocokan = '';
  statusSebelumnya = '';
  gambar();
}

function keluarKeMenu(): void {
  aplikasi = kembaliKeMenu(aplikasi);
  pilihan = null;
  saran = null;
  dijeda = false;
  konfirmasiKeluar = false;
  kunciKocokan = '';
  gambar();
}

app.addEventListener('click', (e) => {
  const tombol = e.target instanceof Element ? e.target.closest('button') : null;
  if (!tombol || tombol.disabled) return;
  const { kartu, sisi, aksi } = tombol.dataset;

  if (kartu) {
    const partai = partaiAktif(aplikasi);
    const dipilih = partai === null ? null : pilihanKartu(partai, kartu);
    if (!dipilih) return;
    pilihan = dipilih;
    const sisiTunggal = dipilih.sisi.length === 1 ? dipilih.sisi[0] : undefined;
    if (sisiTunggal !== undefined) mainkan(sisiTunggal);
    else gambar();
  } else if (sisi) {
    if (sisi === 'batal') {
      pilihan = null;
      gambar();
    } else if (adalahSisi(sisi)) {
      mainkan(sisi);
    }
  } else if (aksi === 'main' || aksi === 'main-lagi') {
    mulai();
  } else if (aksi === 'lanjut') {
    aplikasi = lanjutkan(aplikasi, acak);
    gambar();
  } else if (aksi === 'saran') {
    const partai = partaiAktif(aplikasi);
    saran = partai === null ? null : saranManusia(partai, acak);
    gambar();
  } else if (aksi === 'suara') {
    aplikasi = ubahPengaturan(aplikasi, { suara: !aplikasi.pengaturan.suara });
    suara.aktif(aplikasi.pengaturan.suara);
    simpanPengaturan(penyimpanan, aplikasi.pengaturan);
    gambar();
  } else if (aksi === 'jeda') {
    dijeda = !dijeda;
    gambar();
  } else if (aksi === 'menu') {
    if (layarAktif(aplikasi) === 'meja') {
      konfirmasiKeluar = true;
      gambar();
    } else {
      keluarKeMenu();
    }
  } else if (aksi === 'batal-keluar') {
    konfirmasiKeluar = false;
    gambar();
  } else if (aksi === 'keluar') {
    keluarKeMenu();
  }
});

// Papan ketik: Esc menutup dialog atau membatalkan pilihan kartu, panah kiri dan kanan memilih sisi,
// P menjeda. Fokus dijaga saat gambar ulang hanya bila pemain memakai papan ketik.
document.addEventListener('pointerdown', () => {
  papanKetik = false;
});
document.addEventListener('keydown', (e) => {
  papanKetik = true;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const partai = layarAktif(aplikasi) === 'meja' ? partaiAktif(aplikasi) : null;
  if (partai === null) return;
  if (e.key === 'Escape') {
    if (konfirmasiKeluar) konfirmasiKeluar = false;
    else if (pilihan !== null) pilihan = null;
    else return;
    gambar();
  } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && pilihan !== null && !konfirmasiKeluar) {
    const sisiTuju: Sisi = e.key === 'ArrowLeft' ? 'kiri' : 'kanan';
    if (pilihan.sisi.includes(sisiTuju)) {
      e.preventDefault();
      mainkan(sisiTuju);
    }
  } else if ((e.key === 'g' || e.key === 'G') && !(e.target instanceof HTMLInputElement)) {
    garisBantu = !garisBantu;
    gambar();
  } else if ((e.key === 'p' || e.key === 'P') && !konfirmasiKeluar && !(e.target instanceof HTMLInputElement)) {
    dijeda = !dijeda;
    gambar();
  }
});

// Pilihan di menu (mode, format, lawan, bantuan) disimpan begitu diubah.
app.addEventListener('change', (e) => {
  if (!(e.target instanceof HTMLInputElement)) return;
  const { name, value } = e.target;
  if (name === 'format' && adalahFormat(value)) aplikasi = ubahPengaturan(aplikasi, { format: value });
  else if (name === 'mode' && adalahMode(value)) aplikasi = ubahPengaturan(aplikasi, { mode: value });
  else if (name === 'ai' && adalahAi(value)) aplikasi = ubahPengaturan(aplikasi, { ai: value });
  else if (name === 'bantuan') aplikasi = ubahPengaturan(aplikasi, { bantuan: e.target.checked });
  else if (name === 'suara') {
    aplikasi = ubahPengaturan(aplikasi, { suara: e.target.checked });
    suara.aktif(aplikasi.pengaturan.suara);
  } else return;
  simpanPengaturan(penyimpanan, aplikasi.pengaturan);
  gambar(); // ringkasan pilihan di menu ikut berubah
});

layarSempit.addEventListener('change', gambar); // gambar ulang saat layar berpindah antara lebar dan sempit
gambar();
