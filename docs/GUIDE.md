# GUIDE: panduan proyek Gaple 2vs2

Panduan di luar kode: struktur, alur, daftar fungsi, istilah, dan cara kerja. Diperbarui setiap struktur atau fungsi berubah.

## 1. Cara menjalankan

Dari folder proyek (folder yang berisi `package.json`):

| Perintah | Fungsi |
| --- | --- |
| `npm install` | Memasang TypeScript, Vite, Vitest (sekali, atau saat `package.json` berubah) |
| `npm run dev` | Server pengembangan Vite di http://localhost:8080 (`?benih=7` kocokan sama, `?jeda=0` komputer tanpa jeda). Pengaturan menu tersimpan di browser; untuk mengosongkannya, hapus data situs localhost |
| `npm run build` / `npm run preview` | Build produksi ke `dist/` dan mencobanya |
| `npm run typecheck` | `tsc --noEmit`; harus tanpa galat |
| `npm run aturan` | Aturan penulisan: tanpa `any`, `as` (kecuali `as const`), `!` penegas, `@ts-ignore` |
| `npm run format:cek` / `npm run format` | Cek / rapikan format (Prettier) |
| `npm run cek` | Typecheck + aturan + format + tes + build sekaligus |
| `npm test` | Menjalankan Vitest atas semua `test/**/*.test.{js,ts}` |
| `npm run demo` | Satu pertandingan penuh (bo3) secara acak sampai ada juara |
| `npm run demo -- 123 bo5` | Benih 123, format bo5 |
| `npm run gerbang` | Gerbang tahap 1: 10.000 kocokan acak diperiksa ulang, cetak statistik |
| `npm run gerbang -- 100000 500` | 100.000 kocokan mulai benih 500 |
| `npm run demo:sulit` | Mengukur AI Sulit melawan Sedang dan Mudah (lambat, beberapa menit) |
| `npm run demo:ai` | Mengukur AI Sedang melawan AI Mudah (jumlah partai dan benih opsional) |
| `npm run demo:4` | Demo potongan 4: satu partai penuh |
| `npm run demo:3` | Demo potongan 3: rantai kocokan dan aturan pembuka |
| `npm run demo:2` | Demo potongan 2: satu kocokan acak |

## 2. Struktur folder

```
gaple/
  package.json    pengaturan proyek ("type": "module" = pakai ES modules)
  README.md       pintu masuk proyek
  index.html      halaman game
  style.css       tampilan
  CLAUDE.md       petunjuk untuk asisten AI dan pengembang
  TECHSTACK.md    teknologi yang dipakai dan alasannya
  SKILSS.md       kemampuan yang dibutuhkan dan rujukannya
  SECURITY.md     kebijakan keamanan dan cara melapor
  docs/
    DEVLOG.md     catatan proses pengembangan
    GUIDE.md      dokumen ini
    HASIL-SIMULASI.md  hasil gerbang tahap 1 (10.000 kocokan, statistik)
  src/
    rng.ts        pembangkit acak berbenih (TypeScript)
    engine.ts     kartu, dek, kocok, bagi (TypeScript)
    meja.ts       rangkaian di meja, kartu legal, menyambung (TypeScript)
    pembuka.ts    aturan siapa dan dengan kartu apa kocokan dibuka
    akhir.ts      kapan kocokan berakhir (habis atau tabrak), bonus penutup
    markah.ts     hasil kocokan, markah tim, pemenang partai
    partai.ts     alur satu partai: bagi, main, ringkasan, selesai
    pertandingan.ts alur bo3 atau bo5: poin, partai berikutnya, juara
    kocokan.ts    state kocokan, main, lewat
    simulasi.ts   memainkan kocokan acak atau dengan kebijakan lain (untuk uji dan demo)
    ai-sedang.ts  pemain komputer tingkat Sedang
    pelacak.ts    pandangan seorang pemain, kartu keluar, peluang tepat kartu lawan, dugaan tangan lawan
    ai-sulit.ts   pemain komputer tingkat Sulit
    controller.ts jembatan mesin dan tampilan: giliran manusia, langkah komputer
    penyimpanan.ts simpan dan muat pengaturan (localStorage)
    simpanan.ts    simpan dan lanjutkan pertandingan yang berjalan
    statistik.ts   statistik pemain (rekor, per tingkat AI)
    suara.ts       efek suara sintetis (WebAudio, konteks dioper dari luar)
    main.ts       titik masuk browser
    tampilan/
      kartu-svg.ts  kartu domino sebagai teks SVG
      meja-html.ts  state partai menjadi HTML meja
      tata-rantai.ts posisi dan putaran tiap kartu rantai di meja
      rangkaian-svg.ts seluruh rantai sebagai satu gambar SVG
      layar-html.ts menu, akhir partai, akhir pertandingan
  demo/
    potongan-2.ts demo satu kocokan di terminal
    potongan-3.ts demo rantai kocokan dan aturan pembuka
    potongan-4.ts demo satu partai penuh dengan markah dan bonus
    potongan-5.ts demo satu pertandingan penuh sampai juara
    potongan-6.ts skrip gerbang tahap 1 (npm run gerbang)
    ai-sedang.ts  ukur kekuatan AI Sedang (npm run demo:ai)
    ai-sulit.ts   ukur kekuatan AI Sulit (npm run demo:sulit)
  bantu/
    skenario.ts   kocokan buatan sendiri untuk pengujian (di luar test/ supaya tidak dijalankan sebagai tes)
    bantuan-tes.ts pembantu tes bertipe: empat(), nomor(), ada()
    pemeriksa.ts  pemeriksa mandiri: memutar ulang kocokan dari riwayatnya, tanpa memakai kode src/
    gerbang.ts    pelari gerbang: pertandingan acak, pemeriksaan, statistik, laporan
    aturan.ts     pemeriksa aturan penulisan (pengganti lint)
    periksa-aturan.ts  menjalankan aturan.ts pada semua berkas .ts
  test/
    rng.test.ts
    engine.test.ts
    meja.test.ts
    tipe-domain.test.ts
    kocokan.test.ts
    pembuka.test.ts
    kocokan-pembuka.test.ts
    akhir.test.ts
    markah.test.ts
    partai.test.ts
    pertandingan.test.ts
    gerbang.test.ts
    tampilan.test.ts
    controller.test.ts
    alur.test.ts
    penyimpanan.test.ts
    tata-rantai.test.ts
```

Akan ditambahkan di tahap berikutnya: `ai.ts` dan `tracker.ts`. 

## 2b. TypeScript: cara kerja dan aturan migrasi

- Migrasi dilakukan per modul (lihat `docs/DEVLOG.md`). Seluruh `src/`, `bantu/` , `demo/`, dan `test/` kini TypeScript dan bertipe lengkap. `pemeriksa.ts` sengaja tidak mengimpor apa pun dari `src/`, bahkan tipenya: ia mendeklarasikan sendiri bentuk masukannya agar tetap mandiri.
- Berkas `.ts` diimpor dengan ekstensi `.ts` (`import { buatKartu } from './engine.ts'`). Karena itu tidak ada lapisan pembungkus `.js`: begitu sebuah modul pindah, semua pengimpornya langsung diubah. Node 22.18 ke atas menjalankan `.ts` langsung (demo dan gerbang), Vite dan Vitest juga.
- Sintaks TypeScript dibatasi yang bisa "dihapus" tanpa mengubah perilaku (`erasableSyntaxOnly`): tanpa `enum` dan tanpa `namespace`. Impor tipe memakai `import type`.
- Tipe domain: `Angka` (0 sampai 6), `Kartu`, `NomorPemain` (0 sampai 3), `NomorTim` (0 atau 1), `EmpatTangan`, `Meja`, `Letak`, `Sisi`, `FungsiAcak`. Nomor pemain dan tim dihitung dari tabel, bukan dari rumus, sehingga tidak perlu `as`.
- `tipe-domain.test.ts` memeriksa tipe: baris berlabel `@ts-expect-error` memastikan kode yang salah memang ditolak kompiler.
- Aturan: tanpa `any`, tanpa `as` selain `as const`.

## 2c. Aturan arsitektur, batas modul, dan alat pemeriksa

**Lapisan (impor hanya boleh ke bawah):**

| Lapisan | Modul | Boleh mengimpor |
| --- | --- | --- |
| 1. Dasar | `rng`, `engine` | tidak ada (selain satu sama lain) |
| 2. Aturan | `meja`, `pembuka`, `akhir`, `markah`, `tipe-kocokan` | lapisan 1 |
| 3. Alur | `kocokan`, `partai`, `pertandingan`, `simulasi` | lapisan 1 dan 2 |
| 4. Jembatan | `controller`, `penyimpanan` | lapisan 1 sampai 3 |
| 5. Tampilan | `tampilan/*` | lapisan 1 sampai 4 (hanya membaca state, mengembalikan teks/HTML) |
| 6. Halaman | `main.ts` | semuanya; **satu-satunya** berkas yang menyentuh DOM, `localStorage`, dan `setTimeout` |

Aturan lain: semua fungsi aturan dan alur murni (tidak mengubah masukan, tidak memakai waktu atau acak selain `FungsiAcak` yang dioper); pelanggaran aturan permainan dilempar sebagai `Error`; `bantu/pemeriksa.ts` tidak boleh mengimpor apa pun dari `src/` (supaya tetap penilai independen); data dari luar (localStorage, atribut HTML) selalu lewat penjaga tipe seperti `rapikanPengaturan`, `adalahSisi`, `adalahFormat`.

**Aturan penulisan (dijaga `npm run aturan` dan CI):** tanpa `any`; tanpa penegasan tipe `as` kecuali `as const`; tanpa `!` penegas bukan-null; tanpa `@ts-ignore`/`@ts-nocheck`; `@ts-expect-error` hanya di `test/` untuk masukan yang sengaja salah. Alasan pemeriksa buatan sendiri: `typescript-eslint` belum mendukung TypeScript 7. Bila nanti didukung, aturan yang sama bisa dipindah ke ESLint (`no-explicit-any`, `consistent-type-assertions`, `no-non-null-assertion`) dan `aturan.ts` dihapus.

**Format:** Prettier (`.prettierrc.json`); `docs/` dan `README.md` tidak diformat otomatis.

**CI:** `.github/workflows/ci.yml` menjalankan `npm ci`, typecheck, aturan, format, tes, build, dan gerbang pada Node 22 di setiap push dan pull request. Hasil build (`dist/`) tidak masuk repository (`.gitignore`).

**Kompatibilitas browser:** build menargetkan ES2022. Fitur yang dipakai di `src/`: `Array.prototype.at` (Chrome 92, Firefox 90, Safari 15.4). `structuredClone` dan `Object.hasOwn` hanya dipakai di tes dan skrip Node, bukan di halaman. Jadi game butuh browser sekitar 2022 ke atas (Chrome/Edge 94+, Firefox 93+, Safari 15.4+).

## 2d. Panduan pengembang

**Menambah modul baru (mis. `src/ai-sedang.ts`):**
1. Tentukan lapisannya (bagian 2c) dan impor hanya dari lapisan yang sama atau di bawahnya, dengan ekstensi `.ts` dan `import type` untuk tipe.
2. Beri tipe masukan dan keluaran secara eksplisit. Jangan memakai `any`, `as`, atau `!`. Untuk menyempitkan tipe, tulis penjaga tipe (`function adalahX(n: unknown): n is X`) atau cek `if`, dan lempar `Error` berpesan jelas bila tidak sah.
3. Daftar kemungkinan (status, jenis) ditulis sebagai gabungan terdiskriminasi (`{ status: 'siap' } | { status: 'berjalan', ... }`) supaya TypeScript memaksa semua kasus ditangani. Cabang `default` pada `switch` melempar `Error` dengan `JSON.stringify(nilai)`.
4. Fungsi yang butuh acak menerima `FungsiAcak`; tidak ada `Math.random()` di `src/`.
5. Tulis tes di `test/<nama>.test.ts` (Vitest + `node:assert/strict`). Tes properti memainkan banyak benih tetap; tambahkan tes sabotase untuk aturan penting (rusak sengaja, pastikan tertangkap).
6. Jalankan `npm run cek`; semuanya harus lulus sebelum diserahkan.

**Menulis tes bertipe:** pakai pembantu di `bantu/bantuan-tes.ts`: `empat(...tangan)` membuat empat tangan yang bisa diubah, `nomor(n)` menyempitkan `number` menjadi `NomorPemain`, `ada(nilai)` menggantikan `!` dan menegaskan nilai tidak kosong. Kocokan siap pakai ada di `bantu/skenario.ts`.

**Masukan yang sengaja salah di tes:** tulis `// @ts-expect-error alasan singkat` tepat di baris sebelum pemanggilan. Hanya boleh di `test/`; bila baris itu ternyata tidak lagi salah, TypeScript akan melaporkan direktifnya sebagai tidak terpakai, jadi tes ikut menjaga tipenya.

**Menyempitkan data dari luar:** localStorage, atribut HTML, argumen baris perintah bertipe `unknown` atau `string`. Lewatkan lewat penjaga tipe yang ada (`rapikanPengaturan`, `adalahSisi`, `adalahFormat`) atau tulis yang baru di modul pemiliknya.

**Alur satu potongan:** kode, tes, `npm run cek`, perbarui README (struktur dan perintah), GUIDE, dan DEVLOG (entri baru di atas), naikkan versi di `package.json`, lalu zip tanpa `node_modules` dan `dist` beserta `HAPUS.txt` bila ada berkas yang dihapus atau diganti nama (ZIP tidak menghapus berkas).

## 3. Aturan kode

1. **Mesin tidak menyentuh tampilan.** File di `src/` tidak boleh memakai `document` atau `window`. Hanya fungsi murni: hasil bergantung pada masukan, masukan tidak diubah.
2. **Acak selalu lewat `rng.ts`.** Jangan pakai `Math.random()` di mesin. Fungsi yang butuh acak menerima fungsi `acak` sebagai parameter.
3. **AI dan pelacak hanya melihat "pandangan seorang pemain"** (tangan sendiri, riwayat meja, jumlah kartu pemain lain), bukan state penuh. Berlaku mulai tahap AI: `pandangan(state, pemain)` di `pelacak.ts` adalah satu-satunya tempat state penuh dibaca untuk keperluan itu.
4. **Satu arah:** tampilan mengirim aksi ke pengendali, pengendali memanggil mesin, tampilan menggambar hasilnya.
5. **Fungsi pendek, satu tugas, nama jelas.**
6. **Langkah ilegal melempar `Error`.** Mesin tidak pernah diam-diam menerima langkah yang salah.

## 4. Alur data

Menyiapkan satu kocokan:

```
buatBenihBaru()  ->  buatAcak(benih)  ->  acak()
                                            |
buatDek()  ->  kocok(dek, acak)  ->  bagi(dek)  ->  4 tangan x 7 kartu
                                                         |
                                       mulaiKocokan(tangan, pembuka)  ->  state
```

Dengan aturan pembuka (dipakai game sebenarnya):

```
rencanaKocokanPertama(poin)               <- kocokan pertama partai
rencanaKocokanBerikutnya({akhir, ...})    <- setelah habis atau tabrak
        |
        v   rencana: poin | netral | balak(calon)
tentukanPembuka(tangan, rencana)  ->  siap: pembuka + syarat   |  ulang: kocok lagi
        |
mulaiDariRencana(tangan, rencana)  ->  state (syaratPembuka tersimpan di dalamnya)
```


Menjalankan satu langkah (state lama tidak berubah, hasilnya state baru):

```
state.giliran = pemain P
        |
kartuLegal(tangan P, meja)  ->  ada?  ya: mainkan(state, P, kartu, sisi)  ->  state baru
                                      tidak: lewat(state, P)              ->  state baru
```

Mengakhiri kocokan dan menghitung markah (setelah tiap langkah, periksa dulu apakah sudah berakhir):

```
akhirKocokan(state)  ->  null            : lanjut ke giliran berikutnya
                     ->  {akhir:'habis', penutup} atau {akhir:'tabrak'}
                                |
hitungHasil(state)  ->  hasil {tambahan, bonus, rencanaBerikutnya, ...}
                                |
terapkanHasil(markah, hasil)  ->  markah baru
pemenangPartai(markah)        ->  null (lanjut)  |  {kalah, menang}
                                |
hasil.rencanaBerikutnya  ->  tentukanPembuka / mulaiDariRencana  (kocokan berikutnya)
```

Alur satu partai (`partai.ts`). Status berpindah hanya lewat fungsi yang tercantum:

```
siap  --bagiKocokan-->  berjalan  --mainkanPartai / lewatPartai-->  ringkasan
 ^                      (berulang, satu langkah per pemain)         (kocokan berakhir,
 |                                                                   markah sudah dihitung)
 +---- lanjutkanPartai (belum ada yang 100) -----------------------------+
                                                                         |
selesai  <---- lanjutkanPartai (ada tim yang mencapai 100) --------------+
```

Alur satu pertandingan (`pertandingan.ts`):

```
mulaiPertandingan('bo3' | 'bo5')
   |
mulaiPartaiBerikutnya  ->  ubahPartai(...) berkali-kali, sampai partai 'selesai'
   ^                                  |
   |                           catatPartai  (poin pemenang +1)
   +---- belum ada juara <-----------+
                                      +---> juara (poin = target: 2 untuk bo3, 3 untuk bo5)
```

Alur tiga lapis (kocokan, partai, pertandingan) ada di bagian 4 brief proyek.

## 5. Bentuk data

**Kartu:** `{a, b, id}` dengan `a <= b`. Contoh `{a: 1, b: 3, id: "1-3"}`.

**Letak kartu di meja:** `{kartu, kiri, kanan}`. `kiri` dan `kanan` adalah angka yang tampil di sisi kiri dan kanan. Kartu 2-5 yang diletakkan di kiri meja yang berujung 2 tampil sebagai `[5|2]`.

**Meja:** `{rangkaian: [letak, ...], ujungKiri, ujungKanan}`. Meja kosong: `rangkaian` kosong dan kedua ujung `null`. Dua letak bersebelahan selalu nyambung: `kanan` letak kiri sama dengan `kiri` letak kanan.

**State kocokan:**

```
{
  tangan:  [[kartu x7], [kartu x7], [kartu x7], [kartu x7]],  // indeks = nomor pemain
  meja:    {...},
  giliran: 0..3,
  syaratPembuka: {jenis: 'bebas' | 'balak' | 'kartu', kartu?},  // syarat kartu pertama
  riwayat: [ {pemain, aksi: 'main', kartu, sisi, ujungSebelum}, {pemain, aksi: 'lewat', ujungSebelum}, ... ]
}
```

**Hasil kocokan** (keluaran `hitungHasil`):

```
{
  akhir:     'habis' | 'tabrak',
  penutup:   nomor pemain (hanya bila habis),
  seri:      true bila tabrak dengan total titik kedua tim sama,
  timKena:   tim yang markahnya bertambah (null bila seri),
  titikSisa: [titik tim 0, titik tim 1],
  bonus:     null | {jenis: 'double'|'triplet'|'quartet', nilai},
  tambahan:  [tambahan markah tim 0, tambahan markah tim 1],
  rencanaBerikutnya: rencana pembukaan untuk kocokan berikutnya
}
```

**Markah:** `[markahTim0, markahTim1]`, dua bilangan bulat tidak negatif yang hanya bertambah dalam satu partai.

**State partai:**

```
{
  poin:             [p0, p1],   // poin pertandingan saat partai dimulai
  markah:           [m0, m1],
  nomorKocokan:     0,          // jumlah kocokan yang sudah dibagi
  rencana:          {...},      // rencana pembukaan kocokan berikutnya
  status:           'siap' | 'berjalan' | 'ringkasan' | 'selesai',
  kocokan:          state kocokan | null,   // tetap ada saat 'ringkasan', untuk ditampilkan
  infoPembuka:      {pembuka, syarat, alasan, ulang} | null,
  hasilTerakhir:    hasil kocokan | null,
  riwayatHasil:     [ hasil + {nomor, pembuka, jumlahLangkah} ],
  jumlahKocokUlang: 0,
  pemenang:         null | {kalah, menang}
}
```

**State pertandingan:**

```
{
  format: 'bo3' | 'bo5',  target: 2 | 3,  poin: [p0, p1],
  partai: state partai | null,
  riwayatPartai: [ {nomor, poinAwal, menang, markahAkhir, jumlahKocokan, jumlahKocokUlang} ],
  juara: null | 0 | 1
}
```

## 6. Daftar fungsi

### `src/rng.ts`

| Fungsi | Masukan | Keluaran | Tugas |
| --- | --- | --- | --- |
| `buatAcak(benih)` | bilangan bulat | fungsi `acak()` | Tiap `acak()` memberi desimal 0 sampai kurang dari 1. Benih sama menghasilkan urutan sama. |
| `buatBenihBaru()` | tidak ada | bilangan bulat | Benih dari waktu sekarang, untuk game baru. |

### `src/engine.ts`

| Fungsi | Masukan | Keluaran | Tugas |
| --- | --- | --- | --- |
| `buatKartu(sisi1, sisi2)` | dua angka 0 sampai 6 | `{a, b, id}` | Kartu dengan sisi terurut. Melempar `RangeError` bila angka tidak sah. |
| `nilaiKartu(kartu)` | kartu | angka | Jumlah titik kedua sisi. |
| `adalahBalak(kartu)` | kartu | boolean | Benar bila kedua sisi sama. |
| `buatDek()` | tidak ada | array 28 kartu | Dek lengkap, belum dikocok. |
| `kocok(dek, acak)` | dek, fungsi acak | array baru | Fisher-Yates. Dek asli tidak berubah. |
| `bagi(dek)` | dek 28 kartu | 4 tangan x 7 kartu | Indeks tangan = nomor pemain. |
| `giliranBerikutnya(pemain)` | nomor pemain | nomor pemain | Searah jarum jam: 0, 1, 2, 3, 0. |
| `timPemain(pemain)` | nomor pemain | 0 atau 1 | Pemain 0 dan 2 tim 0, pemain 1 dan 3 tim 1. |

Konstanta: `ANGKA_TERBESAR` (6), `JUMLAH_KARTU` (28), `JUMLAH_PEMAIN` (4), `KARTU_PER_PEMAIN` (7), `NAMA_PEMAIN` (Anda, Lawan Kiri, Rekan, Lawan Kanan; nomor kursi 0 sampai 3 tetap, kelas CSS tetap berarah mata angin). `kocokan.ts` meneruskan (re-export) `NAMA_PEMAIN`, `giliranBerikutnya`, dan `timPemain` supaya impor lama tetap jalan.

### `src/meja.ts`

| Fungsi | Masukan | Keluaran | Tugas |
| --- | --- | --- | --- |
| `buatMejaKosong()` | tidak ada | meja | Meja tanpa kartu. |
| `sisiLegal(kartu, meja)` | kartu, meja | array sisi | `['awal']` di meja kosong; selain itu `'kiri'` dan atau `'kanan'` bila angka kartu cocok dengan ujungnya; kosong bila tidak bisa. |
| `kartuLegal(tangan, meja)` | tangan, meja | `[{kartu, sisi}]` | Kartu yang boleh dimainkan beserta sisinya. |
| `adaKartuLegal(tangan, meja)` | tangan, meja | boolean | Apakah ada kartu yang boleh dimainkan. |
| `letakkan(meja, kartu, sisi)` | meja, kartu, sisi | meja baru | Menyambung kartu. Melempar `Error` bila ilegal. |
| `teksMeja(meja)` | meja | teks | Misalnya `[1|3][3|5]`. Untuk uji dan terminal. |

Konstanta: `SISI_AWAL`, `SISI_KIRI`, `SISI_KANAN`.

### `src/pembuka.ts`

| Fungsi | Masukan | Keluaran | Tugas |
| --- | --- | --- | --- |
| `rencanaKocokanPertama(poin)` | `[p0, p1]` | `{jenis:'poin', poin}` | Kocokan pertama partai: dibuka pemegang kartu sesuai poin. |
| `rencanaKocokanBerikutnya(hasil)` | `{akhir:'habis', penutup}` atau `{akhir:'tabrak', tangan}` | `{jenis:'balak', calon}` atau `{jenis:'netral'}` | Habis: calon = penutup. Tabrak: calon = pemain tim pemenang bertitik terkecil (imbang: nomor kecil). Tabrak seri: netral. |
| `tentukanPembuka(tangan, rencana)` | 4 tangan, rencana | `{status:'siap', pembuka, syarat, alasan}` atau `{status:'ulang', pembuka, alasan}` | Calon tanpa balak: hak pindah ke pemain berikutnya. Dua-duanya tanpa balak: ulang. |
| `kartuMemenuhiSyarat(kartu, syarat)` | kartu, syarat | boolean | Apakah kartu boleh jadi kartu pertama. |
| `deskripsiSyarat(syarat)` | syarat | teks | Untuk pesan kesalahan dan tampilan. |
| `totalTitik(tangan)` | tangan | angka | Jumlah titik satu tangan. |

Syarat: `SYARAT_BEBAS`, `SYARAT_BALAK`, `syaratKartu(kartu)`.

### `src/akhir.ts`

| Fungsi | Masukan | Keluaran | Tugas |
| --- | --- | --- | --- |
| `akhirKocokan(state)` | state | `null`, `{akhir:'habis', penutup}`, atau `{akhir:'tabrak'}` | Habis: ada tangan kosong. Tabrak: meja berisi dan tidak ada pemain yang punya kartu legal. |
| `jenisBonus(state, penutup)` | state yang baru habis, nomor penutup | `null`, `'double'`, `'triplet'`, `'quartet'` | Double: kedua ujung sama. Triplet: menutup dengan balak. Quartet: keduanya. Melempar `Error` bila kartu terakhir bukan milik penutup. |

### `src/markah.ts`

| Fungsi | Masukan | Keluaran | Tugas |
| --- | --- | --- | --- |
| `hitungHasil(state)` | state yang sudah berakhir | hasil kocokan (lihat bagian 5) | Habis: lawan penutup menerima total sisa titik kedua pemainnya + bonus. Tabrak: tim bertitik lebih banyak menerima totalnya sendiri. Seri: tanpa markah. Melempar `Error` bila belum berakhir. |
| `terapkanHasil(markah, hasil)` | markah, hasil | markah baru | Menambahkan `hasil.tambahan`. Markah lama tidak berubah. |
| `pemenangPartai(markah)` | markah | `null` atau `{kalah, menang}` | Tim yang markahnya >= 100 kalah. |

Konstanta: `BATAS_MARKAH` (100), `BONUS` (`{double: 20, triplet: 30, quartet: 50}`). Mengubah nilai bonus cukup di `BONUS`.

### `src/partai.ts`

| Fungsi | Masukan | Keluaran | Tugas |
| --- | --- | --- | --- |
| `mulaiPartai(poin)` | `[p0, p1]` | partai (status `siap`) | Markah 0. Melempar `RangeError` bila poin tidak sah. |
| `bagiKocokan(partai, acak)` | partai `siap`, fungsi acak | partai `berjalan` | Mengocok dan membagi, mengocok ulang otomatis bila tidak adil, menentukan pembuka. |
| `mainkanPartai(partai, pemain, kartu, sisi)` | partai `berjalan`, langkah | partai baru | Seperti `mainkan`. Bila kocokan berakhir: status `ringkasan` dan markah sudah bertambah. |
| `lewatPartai(partai, pemain)` | partai `berjalan`, pemain | partai baru | Seperti `lewat`. Bisa mengakhiri kocokan (tabrak). |
| `lanjutkanPartai(partai)` | partai `ringkasan` | partai `siap` atau `selesai` | `selesai` bila ada tim yang markahnya mencapai 100; selain itu menyiapkan rencana pembuka berikutnya. |

Semua melempar `Error` bila dipanggil pada status yang salah. Konstanta: `STATUS_SIAP`, `STATUS_BERJALAN`, `STATUS_RINGKASAN`, `STATUS_SELESAI`.

### `src/pertandingan.ts`

| Fungsi | Masukan | Keluaran | Tugas |
| --- | --- | --- | --- |
| `mulaiPertandingan(format)` | `'bo3'` atau `'bo5'` | pertandingan | Poin 0-0, belum ada partai. Melempar `RangeError` bila format tidak dikenal. |
| `mulaiPartaiBerikutnya(p)` | pertandingan | pertandingan baru | Membuat partai dengan poin saat ini. Menolak bila sudah ada juara atau partai lama belum dicatat. |
| `ubahPartai(p, ubah)` | pertandingan, fungsi `partai -> partai` | pertandingan baru | Mengganti partai yang sedang berjalan. Contoh: `ubahPartai(p, (x) => bagiKocokan(x, acak))`. |
| `catatPartai(p)` | pertandingan dengan partai `selesai` | pertandingan baru | Poin pemenang +1, partai dikosongkan, juara ditetapkan bila poin mencapai target. |

Konstanta: `FORMAT_BO3`, `FORMAT_BO5`, `TARGET_POIN` (`{bo3: 2, bo5: 3}`).

### `src/controller.ts` (jembatan, murni)

Pemain manusia selalu Selatan (0); tiga lainnya komputer yang bermain acak (AI Mudah). Tidak ada `setTimeout` di sini, jadi alurnya bisa diuji penuh di Node.

| Fungsi | Masukan | Keluaran | Catatan |
| --- | --- | --- | --- |
| `menungguManusia(partai)` | partai | boolean | Giliran Anda dan ada kartu yang cocok. |
| `adaLangkahOtomatis(partai)` | partai | boolean | Kocokan berjalan dan bukan menunggu Anda: giliran komputer, atau Anda tanpa kartu cocok (lewat otomatis). Tepat satu dari dua fungsi ini benar saat kocokan berjalan. |
| `langkahOtomatis(partai, acak)` | partai, pengacak | partai baru | Satu langkah komputer atau lewat otomatis. Error bila sedang menunggu Anda. |
| `pilihanKartu(partai, idKartu)` | partai, id | `{kartu, sisi}` atau `null` | `null` bila bukan giliran Anda atau kartu tidak legal. Bila kedua ujung meja sama angkanya, sisi dipilihkan `['kanan']`. |
| `mainkanManusia(partai, idKartu, sisi)` | partai, id, sisi | partai baru | Aturan tetap dijaga mesin: ilegal melempar Error. |

**Alur aplikasi** (di berkas yang sama). State: `{pengaturan: {format, ai}, pertandingan}`; `pertandingan` bernilai `null` selama di menu. Layar tidak disimpan terpisah, tetapi diturunkan: `layarAktif(aplikasi)` mengembalikan `'menu'`, `'meja'`, `'partai-selesai'`, atau `'akhir'`.

| Fungsi | Fungsi |
| --- | --- |
| `aplikasiBaru(pengaturan)`, `rapikanPengaturan(mentah)` | Awal di menu. `rapikanPengaturan` mengganti nilai tak dikenal dengan bawaan dan membuang kunci lain (data dari browser tidak dipercaya). |
| `ubahPengaturan(a, perubahan)` | Pengaturan baru (state lama tidak berubah). |
| `mulaiPermainan(a, acak)` | Pertandingan baru sesuai format, kocokan pertama sudah dibagi. |
| `lanjutkan(a, acak)` | Tombol lanjut: ringkasan kocokan menjadi kocokan berikutnya atau akhir partai; akhir partai menjadi partai berikutnya atau layar hasil. Melempar Error di layar lain. |
| `kembaliKeMenu(a)` | Pengaturan tetap, pertandingan dibuang. |
| `partaiAktif(a)`, `nomorPartai(a)`, `ubahPartaiAktif(a, fn)` | Akses dan pembaruan partai yang sedang berjalan. |

### `src/suara.ts`

| Fungsi | Fungsi |
| --- | --- |
| `buatSuara(buatKonteks, aktifAwal)` | Pemutar efek (`letak`, `balak`, `lewat`, `menang`, `kalah`) yang disintesis dari osilator WebAudio. Konteks dibuat sekali saat efek pertama diputar; `aktif(bool)` menyalakan atau mematikan. Tanpa konteks audio, tidak melakukan apa-apa. |

### `src/penyimpanan.ts`

`muatPengaturan(storage)` dan `simpanPengaturan(storage, pengaturan)`. `storage` dioper dari luar (di browser `localStorage`, di tes penyimpanan palsu). Kunci: `gaple:pengaturan:v1`. Data kosong, rusak, atau ditolak browser menghasilkan pengaturan bawaan; `simpanPengaturan` mengembalikan `false` bila ditolak dan game tetap jalan.

`Penyimpanan` kini punya `removeItem` (untuk menghapus simpanan dan statistik).

### `src/simpanan.ts` (simpan dan lanjutkan)

`simpanPertandingan(storage, {id, ai, mode, pertandingan})`, `muatSimpanan(storage)`, `hapusSimpanan(storage)`, `ringkasSimpanan(simpanan)`. Kunci `gaple:simpanan:v1`, `VERSI_SIMPANAN` = 1 (naikkan bila bentuk state pertandingan berubah). Yang disimpan adalah state pertandingan apa adanya, ditambah tingkat AI, mode, dan `id` pertandingan. Pengacak tidak disimpan; kocokan sesudah dilanjutkan memakai benih baru. Data dari penyimpanan diperiksa `adalahPertandingan` (struktur, 28 kartu unik, ujung meja cocok dengan rangkaian, tanpa juara); yang tidak lolos menghasilkan `null`, dan `main.ts` juga membuang simpanan bila menggambarnya gagal. `main.ts` menyimpan di setiap `gambar()` pada layar meja dan partai-selesai, menghapus saat ada juara atau Main baru, dan menawarkan tombol Lanjutkan di menu.

### `src/statistik.ts`

`statistikBaru`, `catatKocokan`, `catatPartai`, `catatPertandingan` (murni), `rapikanStatistik`, `muatStatistik`, `simpanStatistik`, `hapusStatistik`. Kunci `gaple:statistik:v1`. Tiap kejadian punya kunci (`id:k:partai:kocokan`, `id:p:partai`, `id:t`) dan `dicatat` mengingat 8 kunci terakhir sehingga memuat ulang halaman tidak menghitung ganda. Kocokan menang bila lawan kena markah; bonus dihitung hanya bila Anda atau Rekan menutup.

**Ulang langkah (Latihan):** `main.ts` menyimpan keadaan pertandingan sebelum tiap langkah Anda (paling banyak 20, hanya mode Latihan); tombol Ulang langkah mengembalikan keadaan terakhir pada kocokan yang sama, sehingga langkah komputer sesudahnya ikut terulang. Tidak berlaku setelah kocokan berakhir.

**Transisi layar:** `gambar()` memberi kelas `masuk` pada layar yang baru muncul (menu, meja, partai selesai, akhir); animasi CSS `layar-masuk`, lebih singkat pada animasi Kurang, mati pada animasi Mati.

### `src/main.ts` (satu-satunya yang menyentuh halaman)

Menyimpan state di variabel (`partai`, `pilihan`, `dijeda`), menggambar ulang dengan `htmlMeja`, memasang satu pendengar klik di `#app` (delegasi: tombol dikenali dari atribut `data-kartu`, `data-sisi`, `data-aksi`), dan menjadwalkan langkah komputer dengan `setTimeout` (jeda bawaan 700 ms).

### `src/tampilan/` (menggambar, tanpa menyentuh halaman)

Semua fungsi di sini murni (masukan data, keluaran teks), sehingga bisa diuji di Node tanpa browser. Yang memasang hasilnya ke halaman hanya `src/main.ts`.

| Fungsi | Masukan | Keluaran | Catatan |
| --- | --- | --- | --- |
| `svgKartu(awal, akhir, arah)` | dua angka 0-6, `'tegak'` atau `'datar'` | string SVG | Titik di kisi 3x3 tiap separuh. Warna dari `style.css` lewat kelas (`badan`, `garis`, `titik`). Angka tidak sah melempar `RangeError`. |
| `svgPunggung(arah)` | arah | string SVG | Kartu tertutup lawan. Tidak memuat angka. |
| `htmlMeja(partai, {nomorPartai, dijeda, pilihan, areaRangkaian})` | partai berstatus `berjalan` atau `ringkasan` | string HTML | Bar markah, tiga lawan (punggung dan jumlah sisa), rangkaian (dua ujung bertanda), status giliran dan langkah terakhir, tangan Anda. Kartu tangan berupa `<button>`; hanya kartu legal pada giliran Anda yang aktif. `pilihan` memunculkan tombol Kiri/Kanan/Batal; status `ringkasan` memunculkan hasil kocokan dan tombol lanjut. |

Pemain manusia tetap Selatan (nomor 0). Kelas CSS `legal` dan `redup` menandai kartu yang bisa dan tidak bisa diketuk.

`layar-html.ts`: `htmlMenu(pengaturan)` (mode, format, lawan, saklar Bantuan hitung, tombol Main, aturan singkat), `htmlPartaiSelesai(pertandingan)` (markah akhir, poin baru, target), `htmlAkhir(pertandingan)` (juara, skor, riwayat partai, Main lagi, Kembali ke menu).

### `bantu/` (alat uji, bukan bagian game)

| Berkas | Fungsi |
| --- | --- |
| `skenario.ts` | Kocokan buatan sendiri (habis biasa, double, triplet, quartet, tabrak) untuk tes. |
| `pemeriksa.ts` | `periksaKocokan({kocokan, hasil, rencana, markahSebelum, markahSesudah})`. Menulis ulang aturan dengan kode sendiri (tanpa impor dari `src/`), memutar ulang riwayat langkah demi langkah, lalu membandingkan dengan hasil mesin. Melempar `Error` berawalan `PELANGGARAN` pada kesalahan pertama. |
| `aturan.ts` | `periksaTeks(teks, berkas)` mengembalikan daftar pelanggaran aturan penulisan; komentar, teks, template, dan regex diabaikan. `periksa-aturan.ts` menjalankannya pada semua berkas `.ts` (`npm run aturan`). |
| `gerbang.ts` | `jalankanGerbang({jumlahKocokan, benihAwal})` memainkan pertandingan acak (bo3 benih ganjil, bo5 benih genap), memeriksa tiap kocokan, mengembalikan statistik. `laporanMarkdown(statistik, versi)` menyusun laporan. |

Pemeriksa sendiri diuji di `test/gerbang.test.ts` dengan kocokan yang sengaja dirusak (giliran tertukar, kartu ganda, markah salah, bonus salah, rangkaian meja putus, dan lain-lain). Pemeriksa yang tidak pernah diuji menolak data rusak tidak bisa dipercaya.

### `src/kocokan.ts`

| Fungsi | Masukan | Keluaran | Tugas |
| --- | --- | --- | --- |
| `mulaiKocokan(tangan, pembuka, syarat)` | 4 tangan, nomor pemain, syarat (bawaan bebas) | state | Meja kosong, giliran = pembuka. Melempar `Error` bila pembuka tak punya kartu yang memenuhi syarat. |
| `mulaiDariRencana(tangan, rencana)` | 4 tangan, rencana | `{status:'siap', state, ...}` atau `{status:'ulang', ...}` | Gabungan `tentukanPembuka` dan `mulaiKocokan`. |
| `kartuLegalPemain(state, pemain)` | state, pemain | `[{kartu, sisi}]` | Seperti `kartuLegal`, tetapi di meja kosong disaring dengan syarat pembuka. |
| `mainkan(state, pemain, kartu, sisi)` | state, pemain, kartu, sisi | state baru | Melempar `Error` bila kocokan sudah berakhir, bukan giliran, kartu tidak ada di tangan, atau ilegal. |
| `lewat(state, pemain)` | state, pemain | state baru | Melempar `Error` bila kocokan sudah berakhir, bukan giliran, atau masih punya kartu legal. |


### `src/simulasi.ts`

| Fungsi | Tugas |
| --- | --- |
| `akhirSementara(state)` | `'habis'`, `'tabrak'`, atau `null`. Bungkus tipis di atas `akhirKocokan` (akhir.ts). |
| `mainAcakDariState(state, acak)` | Melanjutkan kocokan secara acak sampai selesai. Mengembalikan `{state, akhir}`. |
| `pilihLangkahAcak(state, acak)` | Memilih satu langkah acak (`main` atau `lewat`) tanpa menjalankannya. |
| `langkahPartaiDengan(partai, kebijakan, acak)` | Satu langkah pada partai, apa pun statusnya (bagi, main, atau lanjutkan), dengan pemilih langkah `kebijakan`. |
| `langkahAcakPartai(partai, acak)` | Sama, dengan kebijakan acak. |
| `mainPartaiDengan(partai, kebijakan4, acak)` | Memainkan satu partai sampai selesai; tiap kursi punya kebijakan sendiri. |
| `mainAcakPartai(partai, acak)` | Memainkan satu partai acak sampai `selesai`. |
| `mainAcakPertandingan(format, acak)` | Memainkan satu pertandingan acak sampai ada juara. |
| `langkahAcak(state, acak)` | Satu langkah acak yang sah untuk pemain yang sedang giliran. |
| `mainAcakSampaiSelesai(tangan, pembuka, acak)` | Memainkan satu kocokan sampai selesai. Mengembalikan `{state, akhir}`. |

### `src/ai-sedang.ts`

| Fungsi | Tugas |
| --- | --- |
| `pilihLangkahSedangCepat(state, acak)` | Sama tanpa peluang pelacak; jauh lebih cepat. |
| `pilihLangkahSedang(state, acak)` | Memilih satu langkah (`main` atau `lewat`) untuk pemain yang sedang giliran. Murni, tidak mengubah state. Seri dipilih acak dengan `acak` yang dioper (jadi bisa diulang dengan benih sama). |
| `angkaTidakDimiliki(state, pemain)` | Angka yang terbukti tidak dimiliki pemain, dibaca dari riwayat lewat (angka di dua ujung meja saat ia lewat). |
| `BOBOT` | Bobot penilaian (menutup, bonus double dan triplet, titik, balak, lanjutan, tanpa lanjutan, lawan lewat, rekan lewat). Disetel di satu tempat. |

Cara menilai: tiap pasangan (kartu, sisi) yang legal diberi nilai; yang tertinggi dipilih. Yang dinilai: menutup kocokan (paling utama), membuang kartu berat dan balak lebih dulu, menyisakan ujung yang masih bisa dilanjutkan dari tangan sendiri, menjadikan ujung angka yang terbukti tidak dimiliki lawan, dan menghindari angka yang terbukti tidak dimiliki rekan. AI hanya membaca tangannya sendiri dan riwayat meja (dijaga tes: menukar tangan pemain lain tidak mengubah pilihan). Sejak 0.31.0 ada suku peluang: pelacak menghitung peluang tiap lawan tidak punya kartu untuk kedua ujung setelah langkah itu (`BOBOT.lawanHarusLewat`, 20 dikali peluang). Menambah kekuatan sekitar 13 poin persentase melawan versi tanpa suku itu. `pilihLangkahSedangCepat` adalah versi tanpa pelacak (dipakai simulasi AI Sulit supaya cepat); `nilaiSemuaLangkahSedang` memberi nilai tiap langkah. Bila jumlah kartu tidak cocok dengan kocokan utuh (keadaan buatan di tes), pelacak dilewati.

### `src/pelacak.ts`

| Fungsi | Tugas |
| --- | --- |
| `pandangan(state, pemain)` | Apa yang boleh diketahui `pemain`: tangannya sendiri, meja, riwayat, dan jumlah kartu tiap pemain. Tangan pemain lain tidak ikut. |
| `angkaTerlarang(riwayat, pemain)` | Angka yang terbukti tidak dimiliki pemain itu (angka di dua ujung meja setiap kali ia lewat). |
| `buatPelacak(pandangan)` | Membangun pelacak: `keluar`, `belumTerlihat`, `sisaPerAngka`, `terlarang(p)`, `peluangKartu(id, p)`, `peluangPunyaAngka(p, angka)`, `peluangTidakPunya(p, a, b)`, `ambilTangan(acak)` (satu dugaan tangan keempat pemain, seragam di antara semua pembagian yang cocok). Melempar `Error` bila jumlah kartu tidak cocok atau tidak ada pembagian yang sesuai riwayat. |

Peluang dihitung TEPAT, bukan ditebak: kartu yang belum terlihat dibagikan ke tiga pemain lain dengan jumlah kartu tiap pemain tetap dan larangan angka dari riwayat lewat; semua pembagian yang cocok dianggap sama mungkin; peluang = banyak pembagian cocok yang memuat kejadian itu dibagi banyak seluruh pembagian cocok (pemrograman dinamis atas (kartu, kartu di pemain 1, kartu di pemain 2)). Dicocokkan dengan perhitungan brute force di tes. Yang tidak dimodelkan: pilihan langkah pemain lain sebagai petunjuk (hanya fakta pasti, yaitu lewat, yang dipakai).

**Bantuan hitung (UI):** pengaturan `bantuan` (bawaan mati, disimpan bersama pengaturan lain). Bila hidup, meja menampilkan panel: sisa kartu per angka (di luar tangan Anda dan meja) dan tabel peluang Barat, Utara, Timur punya kartu berangka tiap ujung meja serta peluang mereka lewat. Panel dibangun hanya dari `pandangan` Anda (tes: menukar kartu lawan tidak mengubah panel).

### `src/ai-sulit.ts`

| Fungsi | Tugas |
| --- | --- |
| `pilihLangkahSulit(state, acak, opsi?)` | Memilih satu langkah (`main` atau `lewat`) untuk pemain yang sedang giliran. Murni; seri dipilih acak dengan `acak` yang dioper. `opsi.dugaan` = banyak dugaan pembagian (bawaan `DUGAAN_BAWAAN` = 60); `opsi.campuran` = bobot nilai penilaian Sedang yang ditambahkan ke hasil simulasi (bawaan `CAMPURAN_BAWAAN` = 0,3); `opsi.simulasi` = `'cepat'` (bawaan) atau `'pelacak'`. |
| `nilaiLangkahSulit(state, acak, opsi?)` | Nilai tiap langkah legal (`{kartu, sisi, nilai}`), terbaik dulu; kosong bila harus lewat. Dipakai juga untuk tombol Saran. |

Cara kerja (determinisasi + simulasi): dari `pandangan` pemain, pelacak menarik dugaan tangan tiga pemain lain (seragam, cocok dengan jumlah kartu dan riwayat lewat). Untuk tiap dugaan, tiap langkah legal dicoba lalu kocokan dimainkan sampai selesai oleh empat AI Sedang cepat; nilai langkah = rata-rata (markah tambahan lawan - markah tambahan tim sendiri), bonus dan tabrak ikut terhitung. Tidak pernah membaca tangan pemain lain (tes: menukar kartu lawan tidak mengubah nilai). Satu keputusan rata-rata beberapa milidetik, paling lama sekitar 0,2 detik. Dengan sedikit dugaan (8) AI ini berisik dan kira-kira setara Sedang; 30 dugaan sudah jelas lebih kuat; 60 dipakai sebagai bawaan. Sejak 0.31.0 nilai penilaian Sedang (dikali 0,3) ditambahkan ke hasil simulasi; diukur menaikkan Sulit dari sekitar 55% ke 60% melawan Sedang baru, sedangkan simulasi memakai Sedang dengan pelacak tidak lebih baik dan jauh lebih lambat. Yang tidak dimodelkan: pertimbangan skor partai (hanya satu kocokan yang disimulasikan) dan petunjuk dari pilihan langkah lawan.

**Mode Latihan:** pengaturan `mode` (`'pertandingan'` atau `'latihan'`). Latihan adalah pertandingan yang sama (format, AI, poin) dengan dua tambahan: Bantuan hitung selalu tampil, dan tombol Saran pada giliran Anda yang menampilkan kartu dan sisi terbaik menurut AI Sulit (`saranManusia` di controller; kartunya disorot). Saran hilang setelah Anda main.

## 7. Nomor pemain dan tim

| Pemain | Nomor | Tim |
| --- | --- | --- |
| Anda (selatan, manusia) | 0 | 0 |
| Lawan Kiri (barat) | 1 | 1 |
| Rekan (utara) | 2 | 0 |
| Lawan Kanan (timur) | 3 | 1 |

Giliran searah jarum jam: 0, 1, 2, 3. Tim = nomor pemain mod 2.

## 8. Glosarium

| Istilah | Arti |
| --- | --- |
| Kartu | Satu keping domino, misalnya 3-5. |
| Balak | Kartu dengan dua sisi sama, misalnya 4-4. |
| Tangan | Kartu yang dipegang seorang pemain. |
| Meja | Rangkaian kartu yang sudah dimainkan. |
| Ujung | Angka di kedua ujung rangkaian kartu di meja. |
| Sisi | Tempat kartu diletakkan: `awal` (kartu pertama), `kiri`, atau `kanan`. |
| Kartu legal | Kartu yang boleh dimainkan karena cocok dengan salah satu ujung. |
| Lewat | Giliran dilewati karena tidak punya kartu legal. |
| Kocokan | Satu kali bagi 28 kartu sampai ada yang habis atau tabrak. |
| Partai | Rangkaian kocokan sampai markah satu tim mencapai 100. |
| Pertandingan | Rangkaian partai (bo3 atau bo5). Pemenang partai mendapat 1 poin. |
| Markah | "Nyawa" tim dalam satu partai, mulai 0. Bila mencapai 100, tim itu kalah partai. |
| Habis | Kocokan berakhir karena seorang pemain menghabiskan kartunya. |
| Tabrak | Kocokan berakhir karena tidak ada yang bisa main. Tim dengan total titik sisa terbanyak kalah. |
| Double, triplet, quartet | Bonus saat menutup (habis): +20, +30, +50 markah lawan. |
| Status partai | `siap` (menunggu bagi), `berjalan` (kocokan main), `ringkasan` (kocokan baru selesai, hasil ditampilkan), `selesai` (ada tim mencapai 100). |
| Poin | Jumlah partai yang sudah dimenangkan tim dalam satu pertandingan. |
| Juara | Tim pertama yang poinnya mencapai target: 2 untuk bo3, 3 untuk bo5. |
| Gerbang | Syarat lulus tahap 1: ribuan kocokan acak dimainkan dan tiap kocokan diperiksa ulang oleh pemeriksa mandiri tanpa satu pelanggaran pun. |
| Pemeriksa mandiri | Kode yang menulis ulang aturan secara terpisah dari `src/` supaya kesalahan di mesin tidak ikut tersalin ke pemeriksanya. |
| Penutup | Pemain yang menghabiskan kartunya dan mengakhiri kocokan. |
| Bonus | Tambahan markah untuk lawan penutup: double +20, triplet +30, quartet +50. Hanya saat habis. |
| Tim kena | Tim yang markahnya bertambah di sebuah kocokan (lawan penutup, atau tim bertitik terbanyak saat tabrak). |
| Rencana pembukaan | Aturan siapa membuka kocokan: `poin` (kocokan pertama partai), `netral` (setelah tabrak seri), atau `balak` (kocokan berikutnya). |
| Syarat pembuka | Syarat untuk kartu pertama di meja: bebas, harus balak, atau harus kartu tertentu. |
| Hak pindah | Calon pembuka tanpa balak: hak membuka pindah ke pemain berikutnya. |
| Kocok ulang | Dua pembuka berturut-turut tanpa balak: kocokan dianggap tidak adil dan dibagi lagi. |
| Kocokan netral | Kocokan setelah tabrak seri, dibuka pemegang kartu 0-0, tanpa markah. |
| Benih (seed) | Angka awal pengacak. Benih sama menghasilkan kocokan sama. |
| Fungsi murni | Fungsi yang hasilnya hanya bergantung pada masukan dan tidak mengubah masukan. |

## 9. Catatan upgrade

- **Tahap A (lewat):** JavaScript modul tanpa alat build.
- **Tahap B (selesai, v0.18.0):** TypeScript + Vite + Vitest. Seluruh kode sudah `.ts`; bukti validasi di `docs/VALIDASI-MIGRASI.md`.
- **Tahap C (ditunda):** server dan main online. Mesin dipakai ulang di server dengan pandangan per pemain.


## 10. Papan ketik dan animasi (PC)

| Masukan | Fungsi |
| --- | --- |
| Tab, Enter | Memilih kartu yang menyala; fokus dijaga setelah tiap langkah |
| Panah kiri / kanan | Memilih sisi saat kartu bisa dipasang di dua ujung |
| Esc | Menutup dialog atau membatalkan pilihan kartu |
| P | Jeda dan lanjut |
| G | Garis bantu pengembangan: batas area, margin, dan kerangka tata letak rantai (juga `?garis=1` di alamat) |

Animasi (kartu meluncur, bagi kartu, markah, cap bonus, konfeti) hanya CSS di `style.css`; `main.ts` mengirim `terbaru` dan `bagi` ke `htmlMeja` hanya pada gambar tepat setelah kejadian. Pengaturan gerak dikurangi pada sistem mematikan semuanya.

Tambahan tahap animasi: pengaturan `animasi` (penuh, kurang, mati) dipasang sebagai `data-animasi` pada `<html>`. Zoom halus: `zoomHalus()` di `main.ts` membandingkan `data-skala` grup `.dunia` dengan gambar sebelumnya lalu menganimasikan transform. Pratinjau sisi: `src/tampilan/bayangan.ts` (`hitungBayangan`) menata rantai seandainya kartu dipasang di tiap ujung, lalu `svgRangkaian` menggambar `.bayangan` yang bisa diklik. Kartu sisa lawan terbuka lewat kelas `.lawan.terbuka` pada layar ringkasan.

Tahap dua: `hitungMarkah()` di `main.ts` menghitung naik angka markah; kartu yang mendarat diberi animasi `ketuk`; pemain yang lewat diberi balon `.lewat-cap` (opsi `lewat` pada `htmlMeja`); `jedaBerpikir()` di `controller.ts` mengatur jeda komputer menurut jumlah pilihan (hanya pada animasi Penuh).

## CI dan rilis

- `.github/workflows/ci.yml`: tiap push dan pull request menjalankan typecheck, aturan, format, tes, build, dan gerbang.
- `.github/workflows/release.yml`: dipicu tag `v*`. Tag harus sama dengan `version` di `package.json`. Hasilnya rilis GitHub berisi `gaple-vX.Y.Z.zip` (isi `dist`).
- Membuat rilis: naikkan versi, push, lalu `git tag vX.Y.Z` dan `git push origin vX.Y.Z`.
- Build memakai `base: './'` sehingga bisa ditaruh di folder mana pun pada server statis.
