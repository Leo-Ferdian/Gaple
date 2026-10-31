// suara.ts: efek suara sederhana yang disintesis (tanpa berkas audio).
//
// Konteks audio dioper dari luar (main.ts memberi AudioContext peramban) supaya modul ini
// bisa diuji di Node dengan konteks palsu. Semua efek pendek: kartu diletakkan ("klak"),
// lewat (dua ketukan rendah), partai/pertandingan menang, dan kalah.

/** Bagian dari AudioParam yang dipakai. */
export interface ParamAudio {
  setValueAtTime(nilai: number, waktu: number): unknown;
  exponentialRampToValueAtTime(nilai: number, waktu: number): unknown;
}
/** Simpul yang bisa disambungkan; tujuan akhir juga berupa simpul. */
export interface SimpulAudio {
  connect(tujuan: object): unknown;
}
export interface OsilatorAudio extends SimpulAudio {
  type: string;
  readonly frequency: ParamAudio;
  start(waktu: number): void;
  stop(waktu: number): void;
}
export interface GainAudio extends SimpulAudio {
  readonly gain: ParamAudio;
}
/** Bagian dari AudioContext yang dipakai. */
export interface KonteksAudio {
  readonly currentTime: number;
  readonly destination: object;
  createOscillator(): OsilatorAudio;
  createGain(): GainAudio;
  resume?(): unknown;
}

export type Efek = 'letak' | 'balak' | 'lewat' | 'menang' | 'kalah';

interface Nada {
  readonly jenis: string;
  readonly frekuensi: number;
  readonly akhirFrekuensi?: number;
  readonly mulai: number; // detik sejak efek dimulai
  readonly durasi: number;
  readonly keras: number;
}

const RESEP: Readonly<Record<Efek, readonly Nada[]>> = {
  letak: [
    { jenis: 'triangle', frekuensi: 210, akhirFrekuensi: 90, mulai: 0, durasi: 0.09, keras: 0.5 },
    { jenis: 'square', frekuensi: 1500, akhirFrekuensi: 700, mulai: 0, durasi: 0.025, keras: 0.12 },
  ],
  balak: [
    { jenis: 'triangle', frekuensi: 170, akhirFrekuensi: 70, mulai: 0, durasi: 0.12, keras: 0.6 },
    { jenis: 'square', frekuensi: 1200, akhirFrekuensi: 500, mulai: 0, durasi: 0.03, keras: 0.14 },
    { jenis: 'triangle', frekuensi: 260, akhirFrekuensi: 110, mulai: 0.07, durasi: 0.08, keras: 0.3 },
  ],
  lewat: [
    { jenis: 'sine', frekuensi: 130, akhirFrekuensi: 80, mulai: 0, durasi: 0.1, keras: 0.55 },
    { jenis: 'sine', frekuensi: 130, akhirFrekuensi: 80, mulai: 0.17, durasi: 0.1, keras: 0.55 },
  ],
  menang: [
    { jenis: 'triangle', frekuensi: 392, mulai: 0, durasi: 0.2, keras: 0.35 },
    { jenis: 'triangle', frekuensi: 494, mulai: 0.12, durasi: 0.2, keras: 0.35 },
    { jenis: 'triangle', frekuensi: 587, mulai: 0.24, durasi: 0.2, keras: 0.35 },
    { jenis: 'triangle', frekuensi: 784, mulai: 0.36, durasi: 0.45, keras: 0.4 },
  ],
  kalah: [
    { jenis: 'triangle', frekuensi: 330, mulai: 0, durasi: 0.25, keras: 0.3 },
    { jenis: 'triangle', frekuensi: 262, mulai: 0.2, durasi: 0.25, keras: 0.3 },
    { jenis: 'triangle', frekuensi: 196, mulai: 0.4, durasi: 0.5, keras: 0.3 },
  ],
};

export interface PemutarSuara {
  /** Memutar efek; tidak melakukan apa-apa bila suara mati atau konteks tidak tersedia. */
  putar(efek: Efek): void;
  aktif(nilai: boolean): void;
}

/**
 * `buatKonteks` dipanggil paling lambat saat efek pertama diputar (peramban baru mengizinkan
 * audio setelah ada ketukan pemain) dan hasilnya dipakai ulang. Mengembalikan null bila audio tidak ada.
 */
export function buatSuara(buatKonteks: () => KonteksAudio | null, aktifAwal = true): PemutarSuara {
  let nyala = aktifAwal;
  let konteks: KonteksAudio | null | undefined;

  const ambilKonteks = (): KonteksAudio | null => {
    if (konteks === undefined) {
      try {
        konteks = buatKonteks();
      } catch {
        konteks = null;
      }
    }
    return konteks;
  };

  return {
    aktif(nilai) {
      nyala = nilai;
    },
    putar(efek) {
      if (!nyala) return;
      const ctx = ambilKonteks();
      if (ctx === null) return;
      try {
        ctx.resume?.();
        const awal = ctx.currentTime;
        for (const n of RESEP[efek]) {
          const osilator = ctx.createOscillator();
          const gain = ctx.createGain();
          const t0 = awal + n.mulai;
          osilator.type = n.jenis;
          osilator.frequency.setValueAtTime(n.frekuensi, t0);
          if (n.akhirFrekuensi !== undefined) osilator.frequency.exponentialRampToValueAtTime(n.akhirFrekuensi, t0 + n.durasi);
          gain.gain.setValueAtTime(n.keras * 0.5, t0);
          gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.durasi);
          osilator.connect(gain);
          gain.connect(ctx.destination);
          osilator.start(t0);
          osilator.stop(t0 + n.durasi + 0.02);
        }
      } catch {
        // Audio gagal (mis. konteks ditutup): game tetap jalan tanpa suara.
      }
    },
  };
}
