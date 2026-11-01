// rangkaian-svg.ts: menggambar seluruh rantai di meja sebagai SATU gambar SVG,
// mengikuti hasil tata-rantai.ts. Murni: data masuk, teks keluar.
//
// Gambar memakai viewBox seukuran area meja, jadi browser yang mengecilkan atau
// membesarkannya sesuai lebar tempatnya; yang diatur tata-rantai hanya posisinya.

import { isiKartu, ARAH_DATAR, PANJANG_KARTU, LEBAR_KARTU } from './kartu-svg.ts';
import type { Meja } from '../meja.ts';
import { kerangkaUntuk, MARGIN } from './tata-rantai.ts';
import type { HasilTata } from './tata-rantai.ts';

/** `meja` dipakai untuk label aksesibilitas (angka ujung kiri dan kanan). */
export interface KartuBaru {
  readonly id: string;
  /** Arah datangnya kartu: kursi pemain yang memainkannya. */
  readonly dari: 'selatan' | 'barat' | 'utara' | 'timur';
}

/** `terbaru`: kartu yang baru saja dimainkan; digambar dengan penanda untuk animasi meluncur. */
export function svgRangkaian(
  tata: HasilTata,
  meja: Pick<Meja, 'ujungKiri' | 'ujungKanan'>,
  terbaru: KartuBaru | null = null,
  garis = false,
): string {
  const { area, skala, kartu } = tata;
  const grup = kartu
    .map((k) => {
      const kelas = k.ujung ? 'letak ujung' : 'letak';
      const transform = `translate(${k.x.toFixed(2)} ${k.y.toFixed(2)}) rotate(${k.rotasi}) scale(${skala.toFixed(4)}) translate(${-PANJANG_KARTU / 2} ${-LEBAR_KARTU / 2})`;
      const baru = terbaru !== null && terbaru.id === k.id ? ` data-baru="1" data-dari="${terbaru.dari}"` : '';
      return `<g class="${kelas}"${baru}><g class="kartu" transform="${transform}">${isiKartu(k.awal, k.akhir, ARAH_DATAR)}</g></g>`;
    })
    .join('');
  // Garis bantu pengembangan: batas area (merah), tepi dengan margin (kuning putus-putus),
  // kerangka maya tempat kartu ditata (biru, bisa melewati area), dan sumbu tengah.
  let bantu = '';
  if (garis) {
    const k = kerangkaUntuk(area);
    const tengah = { x: area.lebar / 2, y: area.tinggi / 2 };
    const kx = k.setengahLebar * skala;
    const ky = k.setengahTinggi * skala;
    bantu =
      `<g class="garis-bantu" aria-hidden="true">` +
      `<rect class="gb-area" x="0.5" y="0.5" width="${area.lebar - 1}" height="${area.tinggi - 1}"/>` +
      `<rect class="gb-margin" x="${MARGIN}" y="${MARGIN}" width="${area.lebar - 2 * MARGIN}" height="${area.tinggi - 2 * MARGIN}"/>` +
      `<rect class="gb-kerangka" x="${(tengah.x - kx).toFixed(1)}" y="${(tengah.y - ky).toFixed(1)}" width="${(2 * kx).toFixed(1)}" height="${(2 * ky).toFixed(1)}"/>` +
      `<line class="gb-sumbu" x1="${tengah.x}" y1="0" x2="${tengah.x}" y2="${area.tinggi}"/><line class="gb-sumbu" x1="0" y1="${tengah.y}" x2="${area.lebar}" y2="${tengah.y}"/>` +
      `</g>`;
  }
  return (
    `<svg class="rangkaian-svg${garis ? ' dengan-garis' : ''}" viewBox="0 0 ${area.lebar} ${area.tinggi}" role="img" ` +
    `aria-label="Rangkaian di meja, ujung kiri ${meja.ujungKiri}, ujung kanan ${meja.ujungKanan}">${bantu}${grup}</svg>`
  );
}
