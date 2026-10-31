import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buatAcak } from '../src/rng.ts';
import { mulaiPartai } from '../src/partai.ts';
import { langkahAcakPartai } from '../src/simulasi.ts';
import { periksaKocokan } from '../bantu/pemeriksa.ts';
import type { KartuPeriksa, RencanaPeriksa } from '../bantu/pemeriksa.ts';
import type { Partai } from '../src/partai.ts';
import type { HasilKocokan } from '../src/markah.ts';
import { ada } from '../bantu/bantuan-tes.ts';
import { jalankanGerbang, laporanMarkdown } from '../bantu/gerbang.ts';
import { pilihLangkahSedang } from '../src/ai-sedang.ts';
import { pilihLangkahSulit } from '../src/ai-sulit.ts';

// Salinan masukan pemeriksa yang BISA DIUBAH, supaya tes dapat merusaknya dengan sengaja.
type LangkahU =
  | { pemain: number; aksi: 'main'; kartu: KartuPeriksa; sisi: string; ujungSebelum: { kiri: number | null; kanan: number | null } }
  | { pemain: number; aksi: 'lewat'; ujungSebelum: { kiri: number | null; kanan: number | null } };

interface MasukanU {
  kocokan: {
    tangan: KartuPeriksa[][];
    meja: { rangkaian: { kartu: KartuPeriksa; kiri: number; kanan: number }[]; ujungKiri: number | null; ujungKanan: number | null };
    riwayat: LangkahU[];
  };
  hasil: {
    akhir: HasilKocokan['akhir'];
    penutup: number | undefined;
    bonus: { jenis: string; nilai: number } | null;
    tambahan: number[];
    rencanaBerikutnya: RencanaPeriksa;
  };
  rencana: RencanaPeriksa;
  markahSebelum: number[];
  markahSesudah: number[];
}

const salinKartu = (k: KartuPeriksa): KartuPeriksa => ({ a: k.a, b: k.b, id: k.id });

/**
 * Memainkan partai acak sampai satu kocokan berakhir, lalu mengembalikan semua
 * yang dibutuhkan pemeriksa. `syarat` memilih kocokan tertentu (misalnya yang habis).
 */
function ambilKocokanSelesai(syarat: (m: MasukanU) => boolean = () => true): MasukanU {
  for (let benih = 1; benih < 500; benih++) {
    const acak = buatAcak(benih);
    let partai: Partai = mulaiPartai([0, 0]);
    let markahSebelum: number[] = [0, 0];
    for (let i = 0; i < 5000 && partai.status !== 'selesai'; i++) {
      const sebelum: Partai['status'] = partai.status;
      if (sebelum === 'siap') markahSebelum = [partai.markah[0], partai.markah[1]];
      partai = langkahAcakPartai(partai, acak);
      if (sebelum === 'berjalan' && partai.status === 'ringkasan') {
        const { kocokan, hasilTerakhir: h } = partai;
        const masukan: MasukanU = {
          kocokan: {
            tangan: kocokan.tangan.map((t) => t.map(salinKartu)),
            meja: {
              rangkaian: kocokan.meja.rangkaian.map((l) => ({ kartu: salinKartu(l.kartu), kiri: l.kiri, kanan: l.kanan })),
              ujungKiri: kocokan.meja.ujungKiri,
              ujungKanan: kocokan.meja.ujungKanan,
            },
            riwayat: kocokan.riwayat.map((e) =>
              e.aksi === 'main'
                ? { pemain: e.pemain, aksi: 'main', kartu: salinKartu(e.kartu), sisi: e.sisi, ujungSebelum: { ...e.ujungSebelum } }
                : { pemain: e.pemain, aksi: 'lewat', ujungSebelum: { ...e.ujungSebelum } },
            ),
          },
          hasil: {
            akhir: h.akhir,
            penutup: h.penutup,
            bonus: h.bonus ? { jenis: h.bonus.jenis, nilai: h.bonus.nilai } : null,
            tambahan: [...h.tambahan],
            rencanaBerikutnya: structuredClone(h.rencanaBerikutnya),
          },
          rencana: structuredClone(partai.rencana),
          markahSebelum,
          markahSesudah: [partai.markah[0], partai.markah[1]],
        };
        if (syarat(masukan)) return masukan;
      }
    }
  }
  throw new Error('Tidak menemukan kocokan yang diminta');
}

// ---------------------------------------------------------------------------
// Pemeriksa harus meloloskan data benar...
// ---------------------------------------------------------------------------

test('pemeriksa meloloskan kocokan asli dan melaporkan ringkasannya', () => {
  const masukan = ambilKocokanSelesai();
  const ringkas = periksaKocokan(masukan);
  assert.equal(ringkas.langkah, masukan.kocokan.riwayat.length);
  assert.ok(['habis', 'tabrak'].includes(ringkas.akhir));
  assert.equal(ringkas.pembuka, ada(masukan.kocokan.riwayat[0]).pemain);
});

// ---------------------------------------------------------------------------
// ... dan menolak data yang sengaja dirusak (tes untuk si penguji).
// ---------------------------------------------------------------------------

const rusak = (nama: string, ubah: (m: MasukanU) => void, syarat?: (m: MasukanU) => boolean): void => {
  test(`pemeriksa menolak: ${nama}`, () => {
    const masukan = ambilKocokanSelesai(syarat);
    ubah(masukan);
    assert.throws(() => periksaKocokan(masukan), /^Error: PELANGGARAN/);
  });
};

rusak('giliran yang salah', (m) => {
  const e = ada(m.kocokan.riwayat[2]);
  e.pemain = (e.pemain + 1) % 4;
});

rusak('langkah yang diulang', (m) => {
  m.kocokan.riwayat.splice(2, 0, structuredClone(ada(m.kocokan.riwayat[1])));
});

rusak('langkah terakhir dihapus sehingga kocokan belum berakhir', (m) => {
  const terakhir = ada(m.kocokan.riwayat.pop());
  assert.ok(terakhir.aksi === 'main');
  ada(m.kocokan.tangan[terakhir.pemain]).push(terakhir.kartu);
});

rusak('lewat padahal punya kartu yang cocok', (m) => {
  const i = m.kocokan.riwayat.findIndex((e, n) => n >= 1 && e.aksi === 'main');
  const e = ada(m.kocokan.riwayat[i]);
  assert.ok(e.aksi === 'main');
  ada(m.kocokan.tangan[e.pemain]).push(e.kartu); // kartunya dikembalikan ke tangan
  m.kocokan.riwayat[i] = { pemain: e.pemain, aksi: 'lewat', ujungSebelum: e.ujungSebelum };
});

rusak('ujungSebelum di riwayat yang salah', (m) => {
  ada(m.kocokan.riwayat[3]).ujungSebelum = { kiri: 9, kanan: 9 };
});

rusak('rangkaian meja yang tidak nyambung', (m) => {
  const letak = ada(m.kocokan.meja.rangkaian[1]);
  letak.kiri = (letak.kiri + 1) % 7;
});

rusak('kartu di meja yang tidak sama dengan yang dimainkan', (m) => {
  m.kocokan.meja.rangkaian.pop();
});

rusak('kartu ganda di dek', (m) => {
  const [a, b] = [ada(m.kocokan.riwayat[0]), ada(m.kocokan.riwayat[1])];
  assert.ok(a.aksi === 'main' && b.aksi === 'main');
  b.kartu = structuredClone(a.kartu);
});

rusak('tambahan markah yang salah', (m) => {
  m.hasil.tambahan = [ada(m.hasil.tambahan[0]) + 1, ada(m.hasil.tambahan[1])];
});

rusak('markah akhir yang tidak sesuai', (m) => {
  m.markahSesudah = [ada(m.markahSesudah[0]) + 1, ada(m.markahSesudah[1])];
});

rusak(
  'bonus yang salah',
  (m) => {
    m.hasil.bonus = m.hasil.bonus ? null : { jenis: 'double', nilai: 20 };
  },
  (m) => m.hasil.akhir === 'habis',
);

rusak(
  'bonus pada kocokan tabrak',
  (m) => {
    m.hasil.bonus = { jenis: 'double', nilai: 20 };
  },
  (m) => m.hasil.akhir === 'tabrak',
);

rusak('kartu pembuka yang tidak sesuai rencana', (m) => {
  const pertama = ada(m.kocokan.riwayat[0]);
  assert.ok(pertama.aksi === 'main');
  const lain = pertama.kartu.id === '6-6' ? [5, 5] : [6, 6];
  m.rencana = { jenis: 'poin', poin: lain };
});

rusak(
  'rencana berikutnya yang salah',
  (m) => {
    m.hasil.rencanaBerikutnya = { jenis: 'netral' };
  },
  (m) => m.hasil.rencanaBerikutnya.jenis === 'balak',
);

rusak(
  'pembuka yang salah pada kocokan wajib balak',
  (m) => {
    m.rencana = { jenis: 'balak', calon: (ada(m.kocokan.riwayat[0]).pemain + 2) % 4 };
  },
  (m) => m.rencana.jenis === 'balak',
);

// ---------------------------------------------------------------------------
// Pelari gerbang
// ---------------------------------------------------------------------------

test('gerbang 800 kocokan: statistik saling cocok', () => {
  const s = jalankanGerbang({ jumlahKocokan: 800, benihAwal: 1 });

  assert.ok(s.kocokan >= 800 && s.kocokan < 900, `kocokan: ${s.kocokan}`); // berhenti di akhir pertandingan
  assert.equal(s.habis + s.tabrak, s.kocokan);
  assert.ok(s.tabrakSeri <= s.tabrak);
  assert.ok(s.bonus.double + s.bonus.triplet + s.bonus.quartet <= s.habis);
  assert.equal(s.rencana.poin + s.rencana.balak + s.rencana.netral, s.kocokan);
  assert.equal(s.rencana.poin, s.partai); // satu kocokan pertama per partai
  assert.equal(s.rencana.netral, s.tabrakSeri);
  assert.equal(s.juara[0] + s.juara[1], s.pertandingan);
  assert.equal(s.menangPartai[0] + s.menangPartai[1], s.partai);
  const jumlahBo = (arr: number[]): number => arr.reduce((j, x) => j + x, 0);
  assert.equal(jumlahBo(s.partaiPerPertandingan.bo3) + jumlahBo(s.partaiPerPertandingan.bo5), s.pertandingan);
  assert.ok(s.langkah.min >= 7 && s.langkah.max <= 60, `langkah: ${s.langkah.min}-${s.langkah.max}`);
});

test('gerbang dengan opsi sama menghasilkan statistik yang sama', () => {
  const a = jalankanGerbang({ jumlahKocokan: 200, benihAwal: 40 });
  const b = jalankanGerbang({ jumlahKocokan: 200, benihAwal: 40 });
  assert.deepEqual(a, b);
});

test('gerbang 3000 kocokan: sebaran hasil wajar untuk pemain acak', () => {
  const s = jalankanGerbang({ jumlahKocokan: 3000, benihAwal: 1000 });
  const habis = s.habis / s.kocokan;
  assert.ok(habis > 0.7 && habis < 0.85, `habis ${habis}`); // ukuran 300.000 kocokan: sekitar 77%
  const geser = s.hakPindah / s.rencana.balak;
  assert.ok(geser > 0.07 && geser < 0.13, `hak pindah ${geser}`); // teori sekitar 9,8%
  assert.ok(s.kocokUlang / s.kocokan < 0.01, `kocok ulang ${s.kocokUlang}`); // teori sekitar 0,3%
  assert.ok(s.bonus.double > 0 && s.bonus.triplet > 0 && s.bonus.quartet > 0);
});

test('laporanMarkdown lengkap dan tanpa nilai rusak', () => {
  const s = jalankanGerbang({ jumlahKocokan: 300, benihAwal: 7 });
  const teks = laporanMarkdown(s, '9.9.9');
  assert.match(teks, /tanpa satu pelanggaran aturan pun/);
  assert.match(teks, /Versi kode: 9\.9\.9/);
  assert.doesNotMatch(teks, /NaN|undefined|Infinity/);
});

test('gerbang dengan AI Sedang di keempat kursi: 1500 kocokan lolos pemeriksa mandiri tanpa pelanggaran', () => {
  const s = jalankanGerbang({ jumlahKocokan: 1500, benihAwal: 31, kebijakan: pilihLangkahSedang });
  assert.ok(s.kocokan >= 1500);
  assert.ok(s.partai > 10);
});

test('gerbang dengan AI Sulit di keempat kursi: 600 kocokan lolos pemeriksa mandiri tanpa pelanggaran', () => {
  const s = jalankanGerbang({
    jumlahKocokan: 600,
    benihAwal: 77,
    kebijakan: (state, acak) => pilihLangkahSulit(state, acak, { dugaan: 6 }),
  });
  assert.ok(s.kocokan >= 600);
}, 60000);
