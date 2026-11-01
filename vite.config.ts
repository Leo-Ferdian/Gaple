// vite.config.ts: pengaturan Vite (dev server dan build) dan Vitest (tes).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Alamat relatif: hasil build bisa ditaruh di folder mana pun (zip rilis, GitHub Pages, dll).
  base: './',
  server: { port: 8080 },
  build: { target: 'es2022', outDir: 'dist' },
  test: {
    include: ['test/**/*.test.{js,ts}'],
    // Beberapa tes memainkan ribuan kocokan; beri waktu cukup.
    testTimeout: 60_000,
  },
});
