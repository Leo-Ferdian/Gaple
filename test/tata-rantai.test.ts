import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buatAcak } from '../src/rng.ts';
import { buatKartu } from '../src/engine.ts';
import { buatMejaKosong, letakkan, SISI_AWAL, SISI_KANAN, SISI_KIRI } from '../src/meja.ts';
import type { Letak, Sisi } from '../src/meja.ts';
import { mulaiPartai, bagiKocokan, STATUS_BERJALAN } from '../src/partai.ts';
import type { Partai } from '../src/partai.ts';
import { langkahAcakPartai } from '../src/simulasi.ts';
import { tataRantai, indeksAnchor, AREA_LUAS, AREA_SEMPIT, UKURAN_KARTU, SKALA_AWAL } from '../src/tampilan/tata-rantai.ts';
import type { Area, KartuTata, UkuranKartu } from '../src/tampilan/tata-rantai.ts';
import { ada } from '../bantu/bantuan-tes.ts';

const { panjang: P, lebar: W } = UKURAN_KARTU;
const EPS = 0.01;

interface Kotak {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}
/** Satu langkah menyusun meja: angka kartu dan sisi peletakan. */
type LangkahMeja = readonly [number, number, Sisi];

/** Elemen yang pasti ada (menggantikan indeks yang mungkin undefined). */
const di = <T>(daftar: readonly T[], i: number): T => ada(daftar[i], `tidak ada elemen ke-${i}`);

// ---------------------------------------------------------------------------
// Alat bantu uji
// ---------------------------------------------------------------------------

/** Meja dari urutan (kartu, sisi). Mengembalikan rangkaian untuk tataRantai. */
function susunMeja(langkah: readonly LangkahMeja[]): readonly Letak[] {
  let meja = buatMejaKosong();
  for (const [a, b, sisi] of langkah) meja = letakkan(meja, buatKartu(a, b), sisi);
  return meja.rangkaian;
}

/** Kotak (AABB) sebuah kartu hasil tata letak, dalam satuan area. */
function kotak(item: KartuTata, ukuran: UkuranKartu): Kotak {
  const tegak = item.rotasi % 180 === 90;
  const hw = (tegak ? ukuran.lebar : ukuran.panjang) / 2;
  const hh = (tegak ? ukuran.panjang : ukuran.lebar) / 2;
  return { x1: item.x - hw, x2: item.x + hw, y1: item.y - hh, y2: item.y + hh };
}

const tumpang = (p: Kotak, q: Kotak): boolean =>
  Math.min(p.x2, q.x2) - Math.max(p.x1, q.x1) > EPS && Math.min(p.y2, q.y2) - Math.max(p.y1, q.y1) > EPS;
/** Panjang sisi yang saling menempel; 0 bila berjauhan, bertumpuk, atau hanya bersentuhan di satu titik sudut. */
function panjangSentuhan(p: Kotak, q: Kotak): number {
  const tumpangX = Math.min(p.x2, q.x2) - Math.max(p.x1, q.x1);
  const tumpangY = Math.min(p.y2, q.y2) - Math.max(p.y1, q.y1);
  if (tumpangX > EPS && Math.abs(tumpangY) <= EPS) return tumpangX;
  if (tumpangY > EPS && Math.abs(tumpangX) <= EPS) return tumpangY;
  return 0;
}

/** Vektor dari pusat kartu ke pusat separuh yang memuat `awal`, setelah rotasi (kartu datar: separuh awal di kiri). */
function arahAwal(rotasi: number): { x: number; y: number } {
  const r = (rotasi * Math.PI) / 180;
  return { x: -Math.cos(r), y: -Math.sin(r) };
}

/** Pemeriksaan umum yang harus berlaku untuk SETIAP hasil tata letak. */
function periksa(rangkaian: readonly Letak[], indeks: number, area: Area, info: string) {
  const tata = tataRantai(rangkaian, { area, indeksAnchor: indeks });
  const { kartu, skala, ukuran } = tata;
  assert.equal(kartu.length, rangkaian.length, info);
  assert.ok(skala > 0 && skala <= 1, `${info}: skala ${skala}`);
  assert.ok(Math.abs(ukuran.panjang - P * skala) < EPS && Math.abs(ukuran.lebar - W * skala) < EPS, info);

  const kotakKartu = kartu.map((k) => kotak(k, ukuran));
  kotakKartu.forEach((k, i) => {
    assert.ok(
      k.x1 >= -EPS && k.y1 >= -EPS && k.x2 <= area.lebar + EPS && k.y2 <= area.tinggi + EPS,
      `${info}: kartu ${i} keluar meja ${JSON.stringify(k)}`,
    );
  });
  for (let i = 0; i < kartu.length; i++) {
    for (let j = i + 1; j < kartu.length; j++)
      assert.ok(!tumpang(di(kotakKartu, i), di(kotakKartu, j)), `${info}: kartu ${i} dan ${j} bertumpuk`);
  }

  // Kartu yang berjarak tiga langkah atau lebih di rantai tidak boleh berhimpitan:
  // ada jarak bebas (setidaknya 0,3 lebar kartu, dalam satuan area yang sudah diskala).
  const jarakMinimal = W * skala * 0.3;
  for (let i = 0; i < kartu.length; i++) {
    for (let j = i + 3; j < kartu.length; j++) {
      const p = di(kotakKartu, i);
      const q = di(kotakKartu, j);
      const jarak = Math.hypot(Math.max(q.x1 - p.x2, p.x1 - q.x2, 0), Math.max(q.y1 - p.y2, p.y1 - q.y2, 0));
      assert.ok(jarak >= jarakMinimal - EPS, `${info}: kartu ${i} dan ${j} terlalu rapat (jarak ${jarak.toFixed(1)})`);
    }
  }

  // Urutan, id, dan angka sama dengan rangkaian aslinya.
  kartu.forEach((k, i) => {
    const letak = di(rangkaian, i);
    assert.equal(k.id, letak.kartu.id, info);
    assert.equal(k.double, letak.kartu.a === letak.kartu.b, info);
    assert.deepEqual([k.awal, k.akhir].sort(), [letak.kiri, letak.kanan].sort(), info);
  });

  // Kartu bersebelahan di rantai saling menempel, dan angka yang bersentuhan sama.
  for (let i = 0; i < kartu.length; i++) {
    if (i === indeks) continue;
    const dekat = i < indeks ? i + 1 : i - 1; // tetangga yang lebih dekat ke anchor
    const ini = di(kartu, i);
    const tetangga = di(kartu, dekat);
    assert.ok(
      panjangSentuhan(di(kotakKartu, i), di(kotakKartu, dekat)) >= ukuran.lebar * 0.98,
      `${info}: kartu ${i} tidak menempel pada sisi kartu ${dekat} (minimal selebar sisi pendek)`,
    );
    // Belokan siku: kartu belokan ada di ujung kartu sebelumnya, tidak sejajar berdampingan.
    if (ini.arah !== 'pusat' && tetangga.arah !== 'pusat' && ini.arah !== tetangga.arah) {
      const p = di(kotakKartu, dekat);
      const q = di(kotakKartu, i);
      const searahMendatar = tetangga.arah === 'timur' || tetangga.arah === 'barat';
      const tumpangSearah = searahMendatar ? Math.min(p.x2, q.x2) - Math.max(p.x1, q.x1) : Math.min(p.y2, q.y2) - Math.max(p.y1, q.y1);
      if (tetangga.double) {
        // Double di sudut: kartu berikutnya tersambung dari ujung double, tepat di tengah sumbunya.
        const sejajar = searahMendatar ? Math.abs((q.x1 + q.x2) / 2 - (p.x1 + p.x2) / 2) : Math.abs((q.y1 + q.y2) / 2 - (p.y1 + p.y2) / 2);
        assert.ok(sejajar <= EPS, `${info}: kartu ${i} tidak di tengah ujung double sudut (kartu ${dekat})`);
      } else {
        assert.ok(tumpangSearah <= EPS, `${info}: kartu ${i} sejajar berdampingan dengan kartu ${dekat} di belokan`);
      }
    }
    assert.equal(tetangga.akhir, ini.awal, `${info}: angka bersentuhan kartu ${dekat}/${i} beda`);
    // Separuh `awal` menghadap ke arah anchor (kartu biasa saja; double simetris).
    if (!ini.double) {
      const v = arahAwal(ini.rotasi);
      const ke = { x: tetangga.x - ini.x, y: tetangga.y - ini.y };
      // Di sudut belokan kartu bisa tepat di atas tetangganya (hasil nol); yang dilarang hanya menghadap menjauh.
      assert.ok(v.x * ke.x + v.y * ke.y >= -EPS, `${info}: kartu ${i} menghadap terbalik`);
    }
  }
  return tata;
}

/** Semua keadaan meja dari satu kocokan yang dimainkan acak. */
function* mejaDariKocokan(benih: number): Generator<{ rangkaian: readonly Letak[]; indeks: number }> {
  const acak = buatAcak(benih);
  let partai: Partai = bagiKocokan(mulaiPartai([0, 0]), acak);
  while (partai.status === STATUS_BERJALAN) {
    const { kocokan } = partai;
    if (kocokan.meja.rangkaian.length > 0) yield { rangkaian: kocokan.meja.rangkaian, indeks: indeksAnchor(kocokan) };
    partai = langkahAcakPartai(partai, acak);
  }
}

// ---------------------------------------------------------------------------
// Kasus tertentu
// ---------------------------------------------------------------------------

test('satu kartu biasa: di tengah meja, horizontal', () => {
  const satu = di(tataRantai(susunMeja([[2, 5, SISI_AWAL]]), { area: AREA_LUAS, indeksAnchor: 0 }).kartu, 0);
  assert.equal(satu.x, AREA_LUAS.lebar / 2);
  assert.equal(satu.y, AREA_LUAS.tinggi / 2);
  assert.equal(satu.rotasi, 0);
  assert.equal(satu.double, false);
});

test('satu kartu double: di tengah meja, melintang (vertikal)', () => {
  const satu = di(tataRantai(susunMeja([[6, 6, SISI_AWAL]]), { area: AREA_LUAS, indeksAnchor: 0 }).kartu, 0);
  assert.equal(satu.x, AREA_LUAS.lebar / 2);
  assert.equal(satu.rotasi % 180, 90);
  assert.equal(satu.double, true);
});

test('tumbuh ke dua arah dari anchor, kartu biasa memanjang searah rantai', () => {
  // 1-2 dulu, lalu 2-3 ke kanan dan 0-1 ke kiri.
  const rangkaian = susunMeja([
    [1, 2, SISI_AWAL],
    [2, 3, SISI_KANAN],
    [0, 1, SISI_KIRI],
  ]);
  assert.deepEqual(
    rangkaian.map((l) => l.kartu.id),
    ['0-1', '1-2', '2-3'],
  );
  const { kartu, skala } = tataRantai(rangkaian, { area: AREA_LUAS, indeksAnchor: 1 });
  const [kiri, tengah, kanan] = [di(kartu, 0), di(kartu, 1), di(kartu, 2)];
  assert.equal(tengah.x, AREA_LUAS.lebar / 2);
  assert.ok(Math.abs(kanan.x - (tengah.x + P * skala)) < EPS && Math.abs(kiri.x - (tengah.x - P * skala)) < EPS);
  for (const k of kartu) {
    assert.equal(k.y, AREA_LUAS.tinggi / 2);
    assert.ok(k.rotasi === 0 || k.rotasi === 180, 'memanjang horizontal');
  }
  // Di kanan: separuh dekat anchor = angka kiri kartu (2), di kiri: angka kanan kartu (1).
  assert.deepEqual([kanan.awal, kanan.akhir], [2, 3]);
  assert.deepEqual([kiri.awal, kiri.akhir], [1, 0]);
});

test('double di tengah rantai melintang pada sumbu rantai dan hanya selebar sisi pendek', () => {
  const rangkaian = susunMeja([
    [3, 4, SISI_AWAL],
    [4, 4, SISI_KANAN],
    [4, 1, SISI_KANAN],
  ]);
  const { kartu, skala } = tataRantai(rangkaian, { area: AREA_LUAS, indeksAnchor: 0 });
  const [a, dobel, b] = [di(kartu, 0), di(kartu, 1), di(kartu, 2)];
  assert.equal(dobel.double, true);
  assert.equal(dobel.rotasi % 180, 90, 'tegak lurus rantai horizontal');
  assert.equal(dobel.y, a.y, 'tetap di sumbu rantai');
  assert.ok(Math.abs(dobel.x - (a.x + (P / 2 + W / 2) * skala)) < EPS, 'jarak ke kartu sebelumnya = setengah panjang + setengah lebar');
  assert.ok(Math.abs(b.x - (dobel.x + (W / 2 + P / 2) * skala)) < EPS);
});

test('rantai yang pendek tidak belok dan memakai skala awal', () => {
  const rangkaian = susunMeja([
    [3, 4, SISI_AWAL],
    [4, 5, SISI_KANAN],
    [3, 0, SISI_KIRI],
    [5, 5, SISI_KANAN],
  ]);
  const tata = periksa(rangkaian, 0, AREA_LUAS, 'pendek');
  assert.equal(tata.skala, SKALA_AWAL);
  assert.ok(tata.kartu.every((k) => k.rotasi % 180 === (k.double ? 90 : 0)));
});

/** Rantai panjang ke satu arah dengan kartu biasa: 0-1, 1-2, 2-3, ... dengan sisi tertentu. */
function rantaiLurus(jumlah: number, sisi: Sisi): LangkahMeja[] {
  const langkah: LangkahMeja[] = [[0, 0, SISI_AWAL]];
  let ujung = 0;
  for (let i = 0; i < jumlah; i++) {
    const berikut = (ujung + 1) % 7;
    langkah.push([ujung, berikut, sisi]);
    ujung = berikut;
  }
  return langkah;
}

test('ujung kanan membelok ke bawah lalu ke kiri; ujung kiri ke atas lalu ke kanan', () => {
  // 24 kartu biasa menumpuk di satu sisi anchor: harus belok dua kali.
  const kanan = periksa(susunMeja(rantaiLurus(24, SISI_KANAN)), 0, AREA_SEMPIT, 'kanan');
  const arahKanan = kanan.kartu.map((k) => k.arah);
  assert.ok(arahKanan.includes('selatan'), 'belok ke bawah');
  assert.ok(arahKanan.includes('barat'), 'lalu menyusur ke kiri');
  assert.ok(arahKanan.indexOf('selatan') < arahKanan.indexOf('barat'));
  assert.ok(!arahKanan.includes('utara'));

  const kiri = periksa(susunMeja(rantaiLurus(24, SISI_KIRI)), 24, AREA_SEMPIT, 'kiri');
  const arahKiri = kiri.kartu.map((k) => k.arah).reverse(); // dari anchor ke ujung
  assert.ok(arahKiri.includes('utara'), 'belok ke atas');
  assert.ok(arahKiri.includes('timur'), 'lalu menyusur ke kanan');
  assert.ok(arahKiri.indexOf('utara') < arahKiri.indexOf('timur'));
  assert.ok(!arahKiri.includes('selatan'));
});

test('rantai maksimal (28 kartu, banyak double) di satu sisi tetap seluruhnya terlihat, diskalakan bila perlu', () => {
  // Deret yang menyambung: tiap tiga kartu ada satu double. Id boleh berulang, yang diuji hanya geometri.
  const langkah: LangkahMeja[] = [[0, 0, SISI_AWAL]];
  let ujung = 0;
  while (langkah.length < 28) {
    const berikut = (ujung + 1) % 7;
    langkah.push([ujung, berikut, SISI_KANAN]);
    ujung = berikut;
    if (langkah.length < 28 && langkah.length % 3 === 0) langkah.push([ujung, ujung, SISI_KANAN]);
  }
  assert.equal(langkah.length, 28);
  assert.ok(langkah.filter(([a, b]) => a === b).length >= 9);
  for (const area of [AREA_LUAS, AREA_SEMPIT, { lebar: 300, tinggi: 200 }]) {
    periksa(susunMeja(langkah), 0, area, `rantai 28 kartu, area ${area.lebar}x${area.tinggi}`);
  }
  // Dua arah sekaligus: anchor di tengah rantai 28 kartu.
  const dua: LangkahMeja[] = [[0, 0, SISI_AWAL]];
  let kanan = 0;
  let kiri = 0;
  for (let i = 0; i < 27; i++) {
    if (i % 2 === 0) {
      const n = (kanan + 1) % 7;
      dua.push([kanan, n, SISI_KANAN]);
      kanan = n;
    } else {
      const n = (kiri + 1) % 7;
      dua.push([kiri, n, SISI_KIRI]);
      kiri = n;
    }
  }
  const banyakKiri = Math.floor(27 / 2);
  for (const area of [AREA_LUAS, AREA_SEMPIT, { lebar: 300, tinggi: 200 }]) {
    periksa(susunMeja(dua), banyakKiri, area, `dua arah, area ${area.lebar}x${area.tinggi}`);
  }
});

test('area yang makin kecil memaksa skala mengecil, tidak memotong rantai', () => {
  const rangkaian = susunMeja(rantaiLurus(20, SISI_KANAN));
  const besar = periksa(rangkaian, 0, { lebar: 1400, tinggi: 700 }, 'besar');
  const kecil = periksa(rangkaian, 0, { lebar: 400, tinggi: 260 }, 'kecil');
  assert.ok(kecil.skala < besar.skala);
});

test('hasil tidak mengubah masukan dan deterministik', () => {
  const rangkaian = susunMeja(rantaiLurus(10, SISI_KANAN));
  const salinan = structuredClone(rangkaian);
  const a = tataRantai(rangkaian, { area: AREA_SEMPIT, indeksAnchor: 0 });
  const b = tataRantai(rangkaian, { area: AREA_SEMPIT, indeksAnchor: 0 });
  assert.deepEqual(rangkaian, salinan);
  assert.deepEqual(a, b);
});

test('masukan tidak sah ditolak', () => {
  const rangkaian = susunMeja([[1, 2, SISI_AWAL]]);
  assert.throws(() => tataRantai(rangkaian, { area: AREA_LUAS, indeksAnchor: 3 }), RangeError);
  assert.throws(() => tataRantai(rangkaian, { area: AREA_LUAS, indeksAnchor: -1 }), RangeError);
  assert.throws(() => tataRantai(rangkaian, { area: { lebar: 0, tinggi: 100 }, indeksAnchor: 0 }), RangeError);
  assert.deepEqual(tataRantai([], { area: AREA_LUAS, indeksAnchor: 0 }).kartu, []);
});

test('indeksAnchor: kartu yang pertama dimainkan, di mana pun letaknya sekarang', () => {
  for (let benih = 1; benih <= 30; benih++) {
    for (const { rangkaian, indeks } of mejaDariKocokan(benih)) {
      assert.ok(indeks >= 0 && indeks < rangkaian.length);
    }
  }
});

// ---------------------------------------------------------------------------
// Sifat yang harus berlaku untuk rantai nyata dari ribuan langkah acak
// ---------------------------------------------------------------------------

const kasusArea: [string, Area][] = [
  ['luas', AREA_LUAS],
  ['sempit', AREA_SEMPIT],
  ['sangat sempit', { lebar: 360, tinggi: 240 }],
];
for (const [nama, area] of kasusArea) {
  test(`area ${nama}: 150 kocokan acak, setiap langkahnya tertata tanpa tumpuk, dalam meja, menempel, angka sama`, () => {
    let jumlah = 0;
    let adaBelok = false;
    let adaSkala = false;
    for (let benih = 1; benih <= 150; benih++) {
      for (const { rangkaian, indeks } of mejaDariKocokan(benih)) {
        const tata = periksa(rangkaian, indeks, area, `benih ${benih}, ${rangkaian.length} kartu`);
        jumlah++;
        if (tata.kartu.some((k) => k.arah === 'utara' || k.arah === 'selatan')) adaBelok = true;
        if (tata.skala < 1) adaSkala = true;
      }
    }
    assert.ok(jumlah > 3000, `hanya ${jumlah} keadaan diuji`);
    if (area.lebar <= 360) assert.ok(adaBelok && adaSkala, 'di area sangat sempit harus ada belokan dan pengecilan');
  });
}

test('rata-rata skala dijaga (kartu tidak cepat mengecil walau posisinya terkunci)', () => {
  const batas: readonly (readonly [string, Area, number])[] = [
    ['luas', AREA_LUAS, 0.75],
    ['sempit', AREA_SEMPIT, 0.6],
  ];
  for (const [nama, area, minimal] of batas) {
    let total = 0;
    let jumlah = 0;
    for (let benih = 1; benih <= 100; benih++) {
      for (const { rangkaian, indeks } of mejaDariKocokan(benih)) {
        total += tataRantai(rangkaian, { area, indeksAnchor: indeks }).skala;
        jumlah++;
      }
    }
    const rata = total / jumlah;
    assert.ok(rata >= minimal, `area ${nama}: rata-rata skala ${rata.toFixed(3)} di bawah ${minimal}`);
  }
});

test('posisi terkunci: menambah kartu tidak mengubah bentuk kartu yang sudah ada (hanya skala seragam yang boleh berubah)', () => {
  for (const area of [AREA_LUAS, AREA_SEMPIT]) {
    for (let benih = 1; benih <= 60; benih++) {
      let sebelumnya: Map<string, { x: number; y: number; rotasi: number; awal: number; akhir: number }> | null = null;
      for (const { rangkaian, indeks } of mejaDariKocokan(benih)) {
        const tata = tataRantai(rangkaian, { area, indeksAnchor: indeks });
        // Posisi relatif terhadap anchor dalam satuan kartu asli (dibagi skala).
        const sekarang = new Map(
          tata.kartu.map((k) => [
            k.id,
            {
              x: (k.x - area.lebar / 2) / tata.skala,
              y: (k.y - area.tinggi / 2) / tata.skala,
              rotasi: k.rotasi,
              awal: k.awal,
              akhir: k.akhir,
            },
          ]),
        );
        // Rantai tidak bertambah: kocokan baru dimulai, mulai pembandingan dari awal.
        if (sebelumnya !== null && sekarang.size <= sebelumnya.size) sebelumnya = null;
        if (sebelumnya !== null) {
          for (const [id, lama] of sebelumnya) {
            const baru = sekarang.get(id);
            if (baru === undefined) continue; // kocokan baru dimulai
            assert.ok(
              Math.abs(baru.x - lama.x) < 0.01 && Math.abs(baru.y - lama.y) < 0.01 && baru.rotasi === lama.rotasi,
              `benih ${benih}, area ${area.lebar}: kartu ${id} berpindah atau berubah putaran`,
            );
          }
        }
        sebelumnya = sekarang;
      }
    }
  }
});

test('double di sudut tetap melintang di tengah sumbu baris, rantai lanjut dari ujungnya', () => {
  let ada = 0;
  for (let benih = 1; benih <= 60; benih++) {
    for (const { rangkaian, indeks } of mejaDariKocokan(benih)) {
      const { kartu } = tataRantai(rangkaian, { area: AREA_LUAS, indeksAnchor: indeks });
      for (const sisi of ['kiri', 'kanan'] as const) {
        const urut = kartu.filter((k) => k.sisi === sisi);
        if (sisi === 'kiri') urut.reverse();
        urut.forEach((k, i) => {
          const sesudah = urut[i + 1];
          if (sesudah !== undefined && k.double && sesudah.arah !== k.arah) {
            ada++;
            const mendatar = k.arah === 'timur' || k.arah === 'barat';
            // Double melintang: putarannya tegak lurus arah rantai kartu itu.
            assert.ok(mendatar ? k.rotasi % 180 === 90 : k.rotasi % 180 === 0, `benih ${benih}: double sudut tidak melintang`);
          }
        });
      }
    }
  }
  assert.ok(ada > 0);
});

test('balak selalu melintang, di segmen mana pun; satu-satunya pengecualian: balak yang menjadi kartu belokan siku', () => {
  let ada = 0;
  for (const area of [AREA_LUAS, AREA_SEMPIT]) {
    for (let benih = 1; benih <= 80; benih++) {
      for (const { rangkaian, indeks } of mejaDariKocokan(benih)) {
        const { kartu } = tataRantai(rangkaian, { area, indeksAnchor: indeks });
        for (const sisi of ['kiri', 'kanan'] as const) {
          const urut = kartu.filter((k) => k.sisi === sisi);
          if (sisi === 'kiri') urut.reverse();
          urut.forEach((k, i) => {
            if (!k.double) return;
            ada++;
            const mendatar = k.arah === 'timur' || k.arah === 'barat';
            const melintang = mendatar ? k.rotasi % 180 === 90 : k.rotasi % 180 === 0;
            const belokSiku = i > 0 && urut[i - 1]?.arah !== k.arah;
            assert.ok(melintang || belokSiku, `benih ${benih}: balak ${k.id} tidak melintang di tengah segmen`);
          });
        }
      }
    }
  }
  assert.ok(ada > 100);
});
