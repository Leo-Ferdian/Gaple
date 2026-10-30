// bantu/pemeriksa.ts: pemeriksa MANDIRI untuk satu kocokan yang sudah berakhir.
//
// Tujuan: gerbang tahap 1 tidak boleh menilai mesin dengan mesin itu sendiri.
// Pemeriksa ini sengaja TIDAK mengimpor apa pun dari src/, bahkan tipenya. Ia
// mendeklarasikan sendiri bentuk masukan yang ia butuhkan (tipe struktural, jadi
// state dari mesin tetap cocok), menulis ulang aturan dengan cara paling
// sederhana, lalu memutar ulang kocokan dari `riwayat` langkah demi langkah dan
// membandingkannya dengan hasil mesin.
//
// Yang diperiksa:
//   1. Dek: 28 kartu lengkap, tanpa ganda, 7 kartu per pemain (direkonstruksi
//      dari sisa tangan + kartu yang sudah dimainkan).
//   2. Tiap langkah: giliran searah jarum jam, kartu milik pemain, menyambung
//      ke ujung yang benar, lewat hanya bila tidak punya kartu cocok.
//   3. Kocokan tidak berlanjut setelah habis atau tabrak, dan berakhir tepat
//      saat salah satunya terjadi.
//   4. Pembuka dan kartu pertama sesuai rencana pembukaan.
//   5. Hasil: markah tambahan, bonus, dan rencana pembuka berikutnya.
//
// Semua pelanggaran dilempar sebagai Error berawalan "PELANGGARAN".

// ---------------------------------------------------------------------------
// Bentuk masukan (dideklarasikan sendiri, tanpa impor dari src/)
// ---------------------------------------------------------------------------

export interface KartuPeriksa {
  readonly a: number;
  readonly b: number;
  readonly id: string;
}

interface UjungPeriksa {
  readonly kiri: number | null;
  readonly kanan: number | null;
}

export type LangkahPeriksa =
  | {
      readonly pemain: number;
      readonly aksi: 'main';
      readonly kartu: KartuPeriksa;
      readonly sisi: string;
      readonly ujungSebelum: UjungPeriksa;
    }
  | { readonly pemain: number; readonly aksi: 'lewat'; readonly ujungSebelum: UjungPeriksa };

export interface KocokanPeriksa {
  readonly tangan: readonly (readonly KartuPeriksa[])[];
  readonly meja: {
    readonly rangkaian: readonly { readonly kartu: KartuPeriksa; readonly kiri: number; readonly kanan: number }[];
    readonly ujungKiri: number | null;
    readonly ujungKanan: number | null;
  };
  readonly riwayat: readonly LangkahPeriksa[];
}

export interface HasilPeriksa {
  readonly akhir: string;
  readonly penutup: number | undefined;
  readonly bonus: { readonly nilai: number } | null;
  readonly tambahan: readonly number[];
  readonly rencanaBerikutnya: unknown;
}

export type RencanaPeriksa =
  | { readonly jenis: 'poin'; readonly poin: readonly number[] }
  | { readonly jenis: 'netral' }
  | { readonly jenis: 'balak'; readonly calon: number };

export interface MasukanPeriksa {
  /** state kocokan yang sudah berakhir */
  readonly kocokan: KocokanPeriksa;
  /** hasil dari mesin (hitungHasil) */
  readonly hasil: HasilPeriksa;
  /** rencana pembukaan yang dipakai kocokan ini */
  readonly rencana: RencanaPeriksa;
  readonly markahSebelum: readonly number[];
  readonly markahSesudah: readonly number[];
}

export interface RingkasanPeriksa {
  readonly langkah: number;
  readonly lewat: number;
  readonly pembuka: number;
  readonly akhir: 'habis' | 'tabrak';
}

// ---------------------------------------------------------------------------

const SEMUA_ID: string[] = [];
for (let x = 0; x <= 6; x++) for (let y = x; y <= 6; y++) SEMUA_ID.push(`${x}-${y}`);

function gagal(pesan: string): never {
  throw new Error(`PELANGGARAN: ${pesan}`);
}

/** Elemen daftar pada indeks tertentu; pelanggaran bila tidak ada. */
function di<T>(daftar: readonly T[], indeks: number, nama: string): T {
  const nilai = daftar[indeks];
  if (nilai === undefined) return gagal(`${nama} ke-${indeks} tidak ada`);
  return nilai;
}

const titik = (tangan: readonly KartuPeriksa[]): number => tangan.reduce((jumlah, kartu) => jumlah + kartu.a + kartu.b, 0);
const punyaBalak = (tangan: readonly KartuPeriksa[]): boolean => tangan.some((kartu) => kartu.a === kartu.b);
const sama = (x: unknown, y: unknown): boolean => JSON.stringify(x) === JSON.stringify(y);

export function periksaKocokan({ kocokan, hasil, rencana, markahSebelum, markahSesudah }: MasukanPeriksa): RingkasanPeriksa {
  const riwayat = kocokan.riwayat;
  if (!Array.isArray(riwayat) || riwayat.length === 0) gagal('riwayat kosong');
  const langkahPertama = di(riwayat, 0, 'langkah');

  // ---- 1. Dek lengkap -------------------------------------------------------
  const awal: KartuPeriksa[][] = [0, 1, 2, 3].map((p) => [
    ...di(kocokan.tangan, p, 'tangan'),
    ...riwayat.flatMap((e) => (e.pemain === p && e.aksi === 'main' ? [e.kartu] : [])),
  ]);
  awal.forEach((tangan, p) => {
    if (tangan.length !== 7) gagal(`pemain ${p} awalnya memegang ${tangan.length} kartu, seharusnya 7`);
  });
  const semua = awal.flat();
  for (const kartu of semua) {
    if (!(kartu.a <= kartu.b) || kartu.id !== `${kartu.a}-${kartu.b}`) gagal(`kartu tidak baku: ${JSON.stringify(kartu)}`);
  }
  const urut = semua.map((kartu) => kartu.id).sort();
  if (!sama(urut, [...SEMUA_ID].sort())) gagal('dek tidak lengkap atau ada kartu ganda');

  // ---- 2 dan 3. Memutar ulang riwayat ----------------------------------------
  const tangan: KartuPeriksa[][] = awal.map((t) => [...t]);
  let kiri: number | null = null;
  let kanan: number | null = null;
  let giliran = langkahPertama.pemain;
  let jumlahLewat = 0;
  const cocok = (t: readonly KartuPeriksa[]): boolean =>
    kiri !== null && t.some((c) => c.a === kiri || c.b === kiri || c.a === kanan || c.b === kanan);

  riwayat.forEach((e, i) => {
    const nomor = `langkah ${i + 1}`;
    if (e.pemain !== giliran) gagal(`${nomor}: giliran pemain ${giliran}, tetapi yang jalan pemain ${e.pemain}`);
    if (!e.ujungSebelum || e.ujungSebelum.kiri !== kiri || e.ujungSebelum.kanan !== kanan) {
      gagal(`${nomor}: ujungSebelum di riwayat tidak sesuai dengan keadaan meja`);
    }
    if (tangan.some((t) => t.length === 0)) gagal(`${nomor}: kocokan sudah habis tetapi masih berlanjut`);
    if (kiri !== null && !tangan.some(cocok)) gagal(`${nomor}: kocokan sudah tabrak tetapi masih berlanjut`);

    const milik = di(tangan, e.pemain, 'tangan');
    if (e.aksi === 'main') {
      const indeks = milik.findIndex((c) => c.id === e.kartu.id);
      if (indeks === -1) gagal(`${nomor}: kartu ${e.kartu.id} bukan milik pemain ${e.pemain}`);
      const kartu = di(milik, indeks, 'kartu');

      if (kiri === null || kanan === null) {
        if (e.sisi !== 'awal') gagal(`${nomor}: kartu pertama harus di sisi awal`);
        kiri = kartu.a;
        kanan = kartu.b;
      } else if (e.sisi === 'kiri') {
        if (kartu.a !== kiri && kartu.b !== kiri) gagal(`${nomor}: kartu ${kartu.id} tidak menyambung ke ujung kiri ${kiri}`);
        kiri = kartu.a === kiri ? kartu.b : kartu.a;
      } else if (e.sisi === 'kanan') {
        if (kartu.a !== kanan && kartu.b !== kanan) gagal(`${nomor}: kartu ${kartu.id} tidak menyambung ke ujung kanan ${kanan}`);
        kanan = kartu.a === kanan ? kartu.b : kartu.a;
      } else {
        gagal(`${nomor}: sisi tidak dikenal "${e.sisi}"`);
      }
      milik.splice(indeks, 1);
    } else if (e.aksi === 'lewat') {
      if (kiri === null) gagal(`${nomor}: lewat di meja kosong`);
      if (cocok(milik)) gagal(`${nomor}: pemain ${e.pemain} lewat padahal punya kartu yang cocok`);
      jumlahLewat++;
    } else {
      gagal(`${nomor}: aksi tidak dikenal ${JSON.stringify(e)}`);
    }
    giliran = (giliran + 1) % 4;
  });

  // ---- 3. Berakhir tepat saat habis atau tabrak -------------------------------
  const terakhir = di(riwayat, riwayat.length - 1, 'langkah');
  if (terakhir.aksi !== 'main') gagal('langkah terakhir seharusnya memainkan kartu');
  const kosong = tangan.findIndex((t) => t.length === 0);
  let akhir: 'habis' | 'tabrak';
  if (kosong !== -1) {
    akhir = 'habis';
    if (kosong !== terakhir.pemain) gagal('yang menghabiskan kartu bukan pemain langkah terakhir');
  } else if (!tangan.some(cocok)) {
    akhir = 'tabrak';
  } else {
    return gagal('kocokan belum berakhir (belum habis dan belum tabrak)');
  }

  // Keadaan akhir milik state harus sama dengan hasil memutar ulang.
  for (let p = 0; p < 4; p++) {
    const a = di(tangan, p, 'tangan')
      .map((c) => c.id)
      .sort()
      .join(',');
    const b = di(kocokan.tangan, p, 'tangan')
      .map((c) => c.id)
      .sort()
      .join(',');
    if (a !== b) gagal(`tangan akhir pemain ${p} berbeda dari hasil memutar ulang`);
  }
  if (kocokan.meja.ujungKiri !== kiri || kocokan.meja.ujungKanan !== kanan) gagal('ujung meja di state berbeda dari hasil memutar ulang');

  // Rangkaian di meja: urutan kartu menyambung dari kiri ke kanan dan berisi persis kartu yang dimainkan.
  const rangkaian = kocokan.meja.rangkaian;
  const dimainkan = riwayat.flatMap((e) => (e.aksi === 'main' ? [e.kartu.id] : [])).sort();
  if (!sama(rangkaian.map((l) => l.kartu.id).sort(), dimainkan)) {
    gagal('kartu di meja tidak sama dengan kartu yang dimainkan di riwayat');
  }
  rangkaian.forEach((letak, i) => {
    const sisi = [letak.kiri, letak.kanan].sort((m, n) => m - n);
    if (sisi[0] !== letak.kartu.a || sisi[1] !== letak.kartu.b) gagal(`letak ke-${i + 1} di meja tidak cocok dengan kartunya`);
    const sebelumnya = rangkaian[i - 1];
    if (sebelumnya !== undefined && sebelumnya.kanan !== letak.kiri) gagal(`kartu ke-${i} dan ke-${i + 1} di meja tidak nyambung`);
  });
  const paling = { kiri: di(rangkaian, 0, 'letak').kiri, kanan: di(rangkaian, rangkaian.length - 1, 'letak').kanan };
  if (paling.kiri !== kiri || paling.kanan !== kanan) gagal('ujung rangkaian di meja berbeda dari hasil memutar ulang');

  // ---- 4. Pembuka ------------------------------------------------------------
  const pembuka = langkahPertama.pemain;
  if (langkahPertama.aksi !== 'main') gagal('langkah pertama seharusnya memainkan kartu');
  const pertama = langkahPertama.kartu;
  if (rencana.jenis === 'poin') {
    const [x, y] = [...rencana.poin].sort((m, n) => m - n);
    if (pertama.id !== `${x}-${y}`) gagal(`kartu pembuka seharusnya ${x}-${y}, tetapi ${pertama.id}`);
  } else if (rencana.jenis === 'netral') {
    if (pertama.id !== '0-0') gagal(`kocokan netral harus dibuka 0-0, tetapi ${pertama.id}`);
  } else if (rencana.jenis === 'balak') {
    if (pertama.a !== pertama.b) gagal(`kocokan ini harus dibuka dengan balak, tetapi ${pertama.id}`);
    const calon = rencana.calon;
    const berikutnya = (calon + 1) % 4;
    if (punyaBalak(di(awal, calon, 'tangan'))) {
      if (pembuka !== calon) gagal(`calon ${calon} punya balak, seharusnya dia yang membuka, bukan ${pembuka}`);
    } else {
      if (pembuka !== berikutnya) gagal(`calon ${calon} tanpa balak, hak membuka pindah ke ${berikutnya}, bukan ${pembuka}`);
      if (!punyaBalak(di(awal, berikutnya, 'tangan'))) gagal('kedua pembuka tanpa balak: kocokan seharusnya diulang');
    }
  } else {
    gagal(`jenis rencana tidak dikenal: ${JSON.stringify(rencana)}`);
  }

  // ---- 5. Hasil --------------------------------------------------------------
  const sisa: [number, number] = [
    titik([...di(tangan, 0, 'tangan'), ...di(tangan, 2, 'tangan')]),
    titik([...di(tangan, 1, 'tangan'), ...di(tangan, 3, 'tangan')]),
  ];
  const harapanTambahan: [number, number] = [0, 0];
  let harapanRencana: { jenis: 'balak'; calon: number } | { jenis: 'netral' };

  if (akhir === 'habis') {
    const penutup = terakhir.pemain;
    const lawan = penutup % 2 === 0 ? 1 : 0;
    const balak = terakhir.kartu.a === terakhir.kartu.b;
    const samaUjung = kiri === kanan;
    const bonus = balak && samaUjung ? 50 : balak ? 30 : samaUjung ? 20 : 0;
    harapanTambahan[lawan] = sisa[lawan] + bonus;
    harapanRencana = { jenis: 'balak', calon: penutup };
    if (hasil.penutup !== penutup) gagal(`penutup menurut mesin ${hasil.penutup}, seharusnya ${penutup}`);
    if ((hasil.bonus ? hasil.bonus.nilai : 0) !== bonus)
      gagal(`bonus menurut mesin ${hasil.bonus ? hasil.bonus.nilai : 0}, seharusnya ${bonus}`);
  } else {
    if (sisa[0] === sisa[1]) {
      harapanRencana = { jenis: 'netral' };
    } else {
      const kalah = sisa[0] > sisa[1] ? 0 : 1;
      const menang = kalah === 0 ? 1 : 0;
      harapanTambahan[kalah] = sisa[kalah];
      const a = menang;
      const b = menang + 2;
      harapanRencana = { jenis: 'balak', calon: titik(di(tangan, b, 'tangan')) < titik(di(tangan, a, 'tangan')) ? b : a };
    }
    if (hasil.bonus) gagal('tabrak tidak boleh membawa bonus');
  }

  if (hasil.akhir !== akhir) gagal(`akhir menurut mesin "${hasil.akhir}", seharusnya "${akhir}"`);
  if (!sama(hasil.tambahan, harapanTambahan)) {
    gagal(`tambahan markah menurut mesin ${JSON.stringify(hasil.tambahan)}, seharusnya ${JSON.stringify(harapanTambahan)}`);
  }
  if (!sama(hasil.rencanaBerikutnya, harapanRencana)) {
    gagal(`rencana berikutnya menurut mesin ${JSON.stringify(hasil.rencanaBerikutnya)}, seharusnya ${JSON.stringify(harapanRencana)}`);
  }
  const harapanMarkah = [(markahSebelum[0] ?? NaN) + harapanTambahan[0], (markahSebelum[1] ?? NaN) + harapanTambahan[1]];
  if (!sama(markahSesudah, harapanMarkah)) {
    gagal(`markah sesudah ${JSON.stringify(markahSesudah)}, seharusnya ${JSON.stringify(harapanMarkah)}`);
  }

  return { langkah: riwayat.length, lewat: jumlahLewat, pembuka, akhir };
}
