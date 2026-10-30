// rangkaian-svg.ts: menggambar seluruh rantai di meja sebagai SATU gambar SVG,
// mengikuti hasil tata-rantai.ts. Murni: data masuk, teks keluar.
//
// Gambar memakai viewBox seukuran area meja, jadi browser yang mengecilkan atau
// membesarkannya sesuai lebar tempatnya; yang diatur tata-rantai hanya posisinya.

import { isiKartu, ARAH_DATAR, PANJANG_KARTU, LEBAR_KARTU } from './kartu-svg.ts';
import type { Meja } from '../meja.ts';
import type { HasilTata } from './tata-rantai.ts';

/** `meja` dipakai untuk label aksesibilitas (angka ujung kiri dan kanan). */
export function svgRangkaian(tata: HasilTata, meja: Pick<Meja, 'ujungKiri' | 'ujungKanan'>): string {
  const { area, skala, kartu } = tata;
  const grup = kartu
    .map((k) => {
      const kelas = k.ujung ? 'letak ujung' : 'letak';
      const transform = `translate(${k.x.toFixed(2)} ${k.y.toFixed(2)}) rotate(${k.rotasi}) scale(${skala.toFixed(4)}) translate(${-PANJANG_KARTU / 2} ${-LEBAR_KARTU / 2})`;
      return `<g class="${kelas}"><g class="kartu" transform="${transform}">${isiKartu(k.awal, k.akhir, ARAH_DATAR)}</g></g>`;
    })
    .join('');
  return (
    `<svg class="rangkaian-svg" viewBox="0 0 ${area.lebar} ${area.tinggi}" role="img" ` +
    `aria-label="Rangkaian di meja, ujung kiri ${meja.ujungKiri}, ujung kanan ${meja.ujungKanan}">${grup}</svg>`
  );
}
