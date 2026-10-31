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
} from './controller.ts';
import type { PilihanManusia, Saran } from './controller.ts';
import { adalahFormat } from './pertandingan.ts';
import { muatPengaturan, simpanPengaturan } from './penyimpanan.ts';
import { htmlMeja } from './tampilan/meja-html.ts';
import { AREA_LUAS, AREA_SEMPIT } from './tampilan/tata-rantai.ts';
import { htmlMenu, htmlPartaiSelesai, htmlAkhir } from './tampilan/layar-html.ts';

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

// Layar sempit (HP) memakai area rantai yang lebih tinggi dan kurang lebar.
const layarSempit = window.matchMedia('(max-width: 640px)');
const areaRangkaian = () => (layarSempit.matches ? AREA_SEMPIT : AREA_LUAS);

function gambar(): void {
  clearTimeout(pewaktu);
  const layar = layarAktif(aplikasi);
  const { pertandingan } = aplikasi;

  if (layar === 'menu' || pertandingan === null) {
    app.innerHTML = htmlMenu(aplikasi.pengaturan);
  } else if (layar === 'akhir') {
    app.innerHTML = htmlAkhir(pertandingan);
  } else if (layar === 'partai-selesai') {
    app.innerHTML = htmlPartaiSelesai(pertandingan);
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
    });
    if (!dijeda && adaLangkahOtomatis(partai)) {
      pewaktu = setTimeout(() => {
        aplikasi = ubahPartaiAktif(aplikasi, (p) => langkahOtomatis(p, acak, aplikasi.pengaturan.ai));
        gambar();
      }, jeda);
    }
  }
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
  pilihan = null;
  saran = null;
  dijeda = false;
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
  } else if (aksi === 'jeda') {
    dijeda = !dijeda;
    gambar();
  } else if (aksi === 'menu') {
    if (layarAktif(aplikasi) === 'meja' && !window.confirm('Keluar ke menu? Pertandingan yang sedang berjalan akan hilang.')) return;
    aplikasi = kembaliKeMenu(aplikasi);
    pilihan = null;
    saran = null;
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
  else return;
  simpanPengaturan(penyimpanan, aplikasi.pengaturan);
});

layarSempit.addEventListener('change', gambar); // gambar ulang saat layar berpindah antara lebar dan sempit
gambar();
