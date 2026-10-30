# Setup GitHub Project — Gaple 2vs2

Panduan langkah demi langkah untuk menyiapkan repositori GitHub proyek ini. Semua perintah dijalankan dari folder proyek (folder yang berisi `package.json`).

## 1. Inisialisasi repositori Git lokal

```powershell
git init
git branch -M main
git add .
git commit -m "chore: inisialisasi proyek gaple 2vs2"
```

Catatan: `node_modules/`, `dist/`, `*.log`, `.vite/`, `coverage/` sudah diabaikan oleh `.gitignore`.

## 2. Buat repositori di GitHub

Pilih salah satu:

- **Lewat CLI (GitHub CLI):**
  ```powershell
  gh repo create gaple --private --source=. --remote=origin --push
  ```
- **Lewat web:** buat repositori baru di GitHub (tanpa README/license/.gitignore agar tidak bentrok), lalu:
  ```powershell
  git remote add origin https://github.com/<username>/gaple.git
  git push -u origin main
  ```

## 3. Berkas `.github` (siap disalin)

### 3.1 `.github/ISSUE_TEMPLATE/bug_report.md`

```markdown
---
name: Laporan Bug
about: Laporkan masalah atau perilaku yang tidak sesuai
title: "[Bug] "
labels: bug
assignees: ""
---

## Ringkasan
Deskripsi singkat masalah.

## Langkah mereproduksi
1.
2.
3.

## Yang diharapkan
...

## Yang terjadi
...

## Lingkungan
- OS:
- Browser / Node.js:
- Versi proyek (package.json):
```

### 3.2 `.github/ISSUE_TEMPLATE/feature_request.md`

```markdown
---
name: Usulan Fitur
about: Saran fitur atau perbaikan
title: "[Fitur] "
labels: enhancement
assignees: ""
---

## Latar belakang
Mengapa fitur ini dibutuhkan.

## Usulan
Deskripsi fitur yang diinginkan.

## Alternatif
Pertimbangan lain (jika ada).
```

### 3.3 `.github/PULL_REQUEST_TEMPLATE.md`

```markdown
## Ringkasan
Apa yang diubah dan mengapa.

## Perubahan
- [ ] Kode
- [ ] Tes
- [ ] Dokumen (README / GUIDE / DEVLOG)

## Pemeriksaan
- [ ] `npm run cek` lulus
- [ ] Tidak ada `any`, `as` (kecuali `as const`), `!` penegas

## Catatan tambahan
...
```

### 3.4 `.github/CODEOWNERS` (opsional, untuk proyek tim)

```text
* @<username>
/src/ @<username>
/test/ @<username>
```

### 3.5 `.github/workflows/ci.yml` (sudah ada)

Workflow CI sudah tersedia di proyek: menjalankan `npm ci`, typecheck, aturan, format, tes, build, dan gerbang pada Node 22 di setiap push dan pull request.

## 4. Perlindungan branch `main`

GitHub → Settings → Branches → Add branch protection rule untuk `main`:

- [x] Require a pull request before merging
- [x] Require status checks to pass before merging (pilih job `cek` dari CI)
- [x] Require branches to be up to date before merging
- [x] Do not allow bypassing the above settings (opsional, untuk tim)
- [x] Restrict deletions
- [x] Block force pushes

## 5. Label yang disarankan

| Label | Warna | Keterangan |
| --- | --- | --- |
| `bug` | `#d73a4a` | Kesalahan |
| `enhancement` | `#a2eeef` | Fitur baru / perbaikan |
| `documentation` | `#0075ca` | Dokumentasi |
| `good first issue` | `#7057ff` | Cocok untuk pemula |
| `help wanted` | `#008672` | Butuh bantuan |
| `question` | `#d876e3` | Pertanyaan |
| `wontfix` | `#ffffff` | Tidak akan diperbaiki |
| `duplicate` | `#cfd3d7` | Duplikat |
| `ai` | `#fbca04` | Terkait AI (Mudah/Sedang/Sulit) |
| `tampilan` | `#1d76db` | Tampilan / UI |

## 6. Milestone dan Project board

Milestone disarankan (sesuai tahap pengerjaan README):

- Tahap 6 — AI Sulit dan mode latihan
- Tahap 7 — (berikutnya)

Project board (GitHub Projects) kolom: `Backlog`, `To do`, `In progress`, `Review`, `Done`.

## 7. Aturan commit (opsional)

Gunakan awalan konvensional: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`. Contoh: `feat: tambah AI Sulit`.

## 8. Cek akhir

```powershell
npm run cek
git status
```

Pastikan tidak ada artefak build (`dist/`, `node_modules/`) yang ikut ter-commit.

## 9. Rilis (opsional)

```powershell
git tag -a v0.22.0 -m "rilis 0.22.0"
git push origin v0.22.0
```

Selesai. Repositori siap dipakai dengan CI otomatis di setiap push dan pull request.
