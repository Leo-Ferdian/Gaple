// bantu/aturan.ts: pemeriksa aturan penulisan kode proyek.
//
// Mengapa buatan sendiri? Alat lint standar untuk TypeScript (typescript-eslint)
// belum mendukung TypeScript 7 yang dipakai proyek ini. Aturan yang paling
// penting bagi proyek ini cukup sederhana, jadi diperiksa di sini:
//
//   1. Tidak ada tipe `any`.
//   2. Tidak ada penegasan tipe (`x as Tipe`), kecuali `as const`.
//   3. Tidak ada tanda `!` untuk menegaskan "bukan null/undefined".
//   4. Tidak ada `@ts-ignore` dan `@ts-nocheck`.
//   5. `@ts-expect-error` hanya boleh di folder test/ (untuk masukan yang sengaja salah).
//
// Komentar dan isi teks diabaikan. `import x as y` dan `export { a as b }` boleh.

export interface Pelanggaran {
  readonly berkas: string;
  readonly baris: number;
  readonly aturan: string;
  readonly teks: string;
}

interface HasilPindai {
  /** Kode dengan komentar dan isi teks diganti spasi (nomor baris tetap sama). */
  readonly kode: string;
  readonly komentar: { readonly baris: number; readonly teks: string }[];
}

/** Apakah garis miring berikutnya membuka regex literal (bukan pembagian)? */
function awalRegex(kodeSebelumnya: string): boolean {
  const akhir = kodeSebelumnya.trimEnd();
  const huruf = akhir.slice(-1);
  return akhir === '' || '(,=:?[{;!&|~<>+-*%^'.includes(huruf) || /\b(return|typeof|case|in|of)$/.test(akhir);
}

/** Memisahkan kode dari komentar dan isi teks. */
export function pindai(teks: string): HasilPindai {
  let kode = '';
  const komentar: { baris: number; teks: string }[] = [];
  let baris = 1;
  let i = 0;

  const salinSpasi = (potongan: string): void => {
    for (const huruf of potongan) kode += huruf === '\n' ? '\n' : ' ';
    baris += potongan.split('\n').length - 1;
  };

  while (i < teks.length) {
    const huruf = teks.charAt(i);
    const berikut = teks.charAt(i + 1);

    if (huruf === '/' && berikut === '/') {
      let akhir = teks.indexOf('\n', i);
      if (akhir === -1) akhir = teks.length;
      komentar.push({ baris, teks: teks.slice(i, akhir) });
      salinSpasi(teks.slice(i, akhir));
      i = akhir;
    } else if (huruf === '/' && berikut === '*') {
      let akhir = teks.indexOf('*/', i + 2);
      akhir = akhir === -1 ? teks.length : akhir + 2;
      komentar.push({ baris, teks: teks.slice(i, akhir) });
      salinSpasi(teks.slice(i, akhir));
      i = akhir;
    } else if (huruf === '/' && awalRegex(kode)) {
      let j = i + 1;
      let dalamKelas = false;
      while (j < teks.length && teks.charAt(j) !== '\n' && (dalamKelas || teks.charAt(j) !== '/')) {
        const c = teks.charAt(j);
        if (c === '\\') j++;
        else if (c === '[') dalamKelas = true;
        else if (c === ']') dalamKelas = false;
        j++;
      }
      kode += '/';
      salinSpasi(teks.slice(i + 1, j));
      kode += '/';
      i = j + 1;
    } else if (huruf === "'" || huruf === '"') {
      let j = i + 1;
      while (j < teks.length && teks.charAt(j) !== huruf && teks.charAt(j) !== '\n') j += teks.charAt(j) === '\\' ? 2 : 1;
      kode += huruf;
      salinSpasi(teks.slice(i + 1, j));
      kode += teks.charAt(j) === huruf ? huruf : '';
      i = j + 1;
    } else if (huruf === '`') {
      let j = i + 1;
      while (j < teks.length && teks.charAt(j) !== '`') j += teks.charAt(j) === '\\' ? 2 : 1;
      kode += '`';
      salinSpasi(teks.slice(i + 1, j));
      kode += '`';
      i = j + 1;
    } else {
      if (huruf === '\n') baris++;
      kode += huruf;
      i++;
    }
  }
  return { kode, komentar };
}

/** Memeriksa satu berkas. `berkas` dipakai untuk pesan dan untuk aturan folder test/. */
export function periksaTeks(teks: string, berkas: string): Pelanggaran[] {
  const hasil: Pelanggaran[] = [];
  const { kode, komentar } = pindai(teks);
  const baris = teks.split('\n');
  const dalamTes = berkas.replaceAll('\\', '/').split('/').includes('test');
  const tambah = (nomor: number, aturan: string): void => {
    hasil.push({ berkas, baris: nomor, aturan, teks: (baris[nomor - 1] ?? '').trim() });
  };

  for (const k of komentar) {
    // Hanya direktif sungguhan (di awal komentar), bukan komentar yang menyebut namanya.
    if (/^(\/\/|\/\*+)\s*@ts-(ignore|nocheck)\b/.test(k.teks)) tambah(k.baris, 'dilarang memakai @ts-ignore atau @ts-nocheck');
    if (/^(\/\/|\/\*+)\s*@ts-expect-error\b/.test(k.teks) && !dalamTes) tambah(k.baris, '@ts-expect-error hanya boleh di folder test/');
  }

  let dalamImpor = false;
  kode.split('\n').forEach((garis, indeks) => {
    const nomor = indeks + 1;
    const mulaiImpor = /^\s*(import|export)\b(?!\s+(const|function|class|interface|type\s+\w+\s*=|default|enum|async)\b)/.test(garis);
    if (mulaiImpor) dalamImpor = true;

    if (/\bany\b/.test(garis)) tambah(nomor, 'dilarang memakai tipe any');
    if (!dalamImpor) {
      for (const _ of garis.matchAll(/\bas\s+(?!const\b)\w/g)) tambah(nomor, 'dilarang memakai penegasan tipe (as), kecuali as const');
    }
    if (/[\w\])]!(?!=)/.test(garis)) tambah(nomor, 'dilarang memakai tanda ! untuk menegaskan bukan-null');

    if (dalamImpor && (/\bfrom\s+['"`]/.test(garis) || /;\s*$/.test(garis))) dalamImpor = false;
  });

  return hasil;
}
