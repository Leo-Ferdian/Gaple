# DEVLOG: catatan pengembangan Gaple 2vs2

Catatan proses dari awal sampai proyek selesai. Entri terbaru ada di bagian atas. Tiap entri memakai format yang sama:

- **Tujuan:** apa yang ingin dicapai.
- **Dikerjakan:** apa yang benar-benar dibuat.
- **Keputusan:** pilihan yang diambil dan alasannya.
- **Masalah:** hambatan dan cara mengatasinya.
- **Dipelajari:** konsep baru yang muncul.
- **Berikutnya:** langkah selanjutnya.

---

## 2026-11-06 | Uji aksesibilitas dengan pohon aksesibilitas dan papan ketik

- **Tujuan:** menjalankan pengujian yang tersisa dari daftar (pembaca layar dan alur rilis).
- **Yang bisa dan tidak bisa:** pembaca layar sungguhan (NVDA, VoiceOver) tidak bisa dijalankan di lingkungan ini, jadi diuji pendekatannya: pohon aksesibilitas Playwright (`ariaSnapshot`, apa yang dibaca pembaca layar) dan permainan hanya dengan papan ketik. Alur rilis butuh repositori GitHub dan tag, yang tidak bisa didorong dari sini.
- **Hasil:** menu terbaca benar (judul, grup radio bernama, tombol). Meja: judul, tombol Suara/Jeda/Menu, wilayah tiap pemain dengan jumlah kartu, rangkaian dengan ujung kiri dan kanan, kartu tangan bernama ("Kartu 0-1", yang tidak bisa dimainkan `disabled`). Pengumuman aria-live terbaca tiap langkah ("Anda memainkan 0-1. Giliran Lawan Kiri ..."). Lima langkah dimainkan hanya dengan Tab, Enter, dan panah. Temuan: saat layar berganti fokus hilang (ke badan halaman). Perbaikan: judul h1 tiap layar mendapat `tabindex="-1"` dan difokuskan saat layar berganti.
- **Tes:** tes judul diperluas; 292 tes lolos.
- **Belum:** pembaca layar sungguhan; tag rilis pertama (perlu Anda).

---

## 2026-11-06 | GitHub Pages dan perbaikan aksesibilitas

- **Tujuan:** game bisa dimainkan lewat tautan; pemeriksaan aksesibilitas otomatis.
- **Dikerjakan:** (1) `pages.yml`: push ke main atau master menjalankan `npm run cek` lalu menerbitkan `dist` ke GitHub Pages. (2) Pemeriksaan axe-core lewat Playwright pada menu (empat tema), meja (giliran Anda, dengan Saran dan Bantuan hitung), dialog jeda dan keluar, ringkasan kocokan, partai selesai, dan layar akhir: kontras aman di semua tema; dua temuan diperbaiki: layar meja, partai selesai, dan akhir tidak punya judul h1 (meja diberi h1 tersembunyi, dua layar lain h2 menjadi h1) dan sel kepala tabel peluang kosong (diberi teks tersembunyi "Pemain"). (3) Teks dialog Keluar ke menu masih berkata pertandingan akan hilang padahal sejak 0.32.0 tersimpan; diganti "Pertandingan tersimpan dan bisa dilanjutkan dari menu."
- **Keputusan:** alur Pages memakai `npm run cek` (bukan gerbang) supaya cepat; gerbang tetap di CI. Pembaca layar sungguhan belum diuji; axe hanya menangkap sebagian masalah.
- **Tes:** 1 tes baru (satu h1 per layar, teks dialog, kepala tabel); 292 tes lolos. Tata letak rantai juga diuji sekali dengan sekitar 2.500 kocokan acak per uji (tanpa perubahan kode): lolos.
- **Berikutnya:** uji dengan pembaca layar sungguhan; mendorong tag pertama untuk membuktikan alur rilis.

---

## 2026-11-05 | Simpan dan lanjutkan, statistik, ulang langkah, transisi layar

- **Tujuan:** empat item pengalaman bermain: simpan dan lanjutkan pertandingan, statistik, ulang langkah di mode Latihan, transisi layar.
- **Dikerjakan:** (1) `simpanan.ts`: pertandingan tersimpan otomatis tiap gambar ulang; menu menampilkan kartu Lanjutkan (partai, poin, markah, lawan). Data diperiksa ketat (struktur, 28 kartu unik, ujung meja, tanpa juara) dan simpanan yang tidak lolos dibuang. (2) `statistik.ts`: pertandingan, partai, kocokan (menang, kalah, seri), bonus tim Anda, menang beruntun, hasil per tingkat lawan; kunci kejadian mencegah hitung ganda saat halaman dimuat ulang; tombol Hapus statistik. (3) Ulang langkah: tombol di baris Saran (mode Latihan), mengembalikan ke sebelum langkah Anda terakhir pada kocokan yang sama. (4) Transisi layar: kelas `masuk` memberi animasi masuk pada layar baru. `bunyikan` menyelaraskan penghitung riwayat setelah Ulang langkah agar suara dan animasi langkah berikutnya tetap jalan. `Penyimpanan` mendapat `removeItem`.
- **Keputusan:** pengacak tidak disimpan (kocokan berikutnya memakai benih baru; aturan tidak terpengaruh). Main baru menghapus simpanan; teks peringatan ada di kartu Lanjutkan. Ulang langkah mengembalikan juga langkah komputer sesudahnya karena komputer tidak bisa "dibatalkan" sendiri. Statistik hanya mencatat kocokan yang selesai, jadi Ulang langkah tidak memengaruhi statistik. Hanya mode Latihan menyimpan riwayat ulang.
- **Diuji di browser (Playwright):** keluar ke menu, muat ulang halaman, lanjutkan; ulang langkah menambah kartu tangan; satu pertandingan penuh tercatat di statistik (1 pertandingan, 2 partai, 11 kocokan) dan simpanan terhapus saat ada juara; tanpa galat halaman.
- **Tes:** 14 tes baru (simpan-muat di semua status partai, penolakan data rusak, statistik, tampilan menu dan tombol Ulang); 291 tes lolos.
- **Belum:** tidak ada tombol papan ketik untuk Ulang langkah; simpanan satu slot saja.
- **Berikutnya:** transisi keluar layar bila diminta, atau fitur lain.

---

## 2026-11-03 | Nama pemain netral dan AI yang lebih cerdas

- **Tujuan:** (1) nama Utara, Barat, Timur terkesan sementara; (2) AI lebih kuat dan lebih kerja sama sebagai tim.
- **Dikerjakan:** (1) Nama tampil kini netral: Anda, Rekan (kursi 2), Lawan Kiri (1), Lawan Kanan (3). Kursi tetap bernomor dan kelas CSS tetap berarah mata angin; hanya `NAMA_PEMAIN`, denah menu, aturan singkat, dan dokumen yang berubah. (2) Sedang: suku baru peluang lawan harus lewat (pelacak). Diukur 1.200 partai kursi ditukar: bobot 10 sampai 80 semuanya 62% sampai 65% lawan Sedang lama; dipakai 20. Suku "rekan jangan lewat" dicoba dan justru melemahkan (32% sampai 50%), jadi dibuang. (3) Sulit: simulasi tetap memakai Sedang cepat (tanpa pelacak, 22 ms per langkah); memakai Sedang dengan pelacak di simulasi tidak lebih baik (53%) dan 3 kali lebih lambat. Ditambah campuran penilaian Sedang (bobot 0,3: 60%, 0,1: 58,5%, 1: 59%, tanpa campuran: 53% sampai 57%).
- **Hasil akhir:** Sedang lawan Mudah 87,5% (1.200 partai, dulu 81,5%); Sedang lawan Sedang lama 66,6% (1.200); Sulit lawan Sedang baru 62,0% dan lawan Mudah 93,0% (200 partai).
- **Keputusan:** Sedang menjadi lebih kuat, jadi jarak ke Sulit mengecil (dulu 76%, kini 62%). Nama kursi tidak diubah di kode agar riwayat dan tes tetap jelas. Tes "Sulit lebih kuat dari Sedang" diganti "Sulit lebih kuat dari Mudah" karena selisih 62% terlalu berisik untuk 40 partai; pengukuran Sulit lawan Sedang ada di `npm run demo:sulit`. Tes pelacak "tukar tangan" kini mengocok kartu lawan dengan jumlah kartu tetap (jumlah kartu memang kelihatan di meja).
- **Belum:** Sulit belum memodelkan skor partai dan petunjuk dari pilihan langkah lawan; belum diuji dimainkan manusia.
- **Tes:** 1 tes baru (Sedang lawan Sedang cepat); 278 tes lolos.
- **Berikutnya:** simpan dan lanjutkan pertandingan, statistik.

---

## 2026-11-03 | Pengembangan ponsel dibatalkan

- **Tujuan:** fokus ke desktop dulu; ponsel dibahas lagi bila ada pembaruan yang disetujui.
- **Dikerjakan:** semua pengembangan ponsel dari 0.27.0 dan 0.29.2 dihapus: blok CSS ponsel (bingkai tipis, bar tiga baris, menu satu kolom, tangan tidak menempel), aturan layar sangat pendek (`max-height: 520px`), dan area rantai tegak (`AREA_SEMPIT` kembali 600x440, ambang tes sempit kembali 0,6); tes "area ponsel tegak" dihapus. Penyebutan ponsel di README dan SKILSS dihapus.
- **Keputusan:** pengaturan tema, perbaikan layar pendek di desktop (0.29.1), dan seluruh animasi tetap. Aturan responsif sederhana yang sudah ada sebelum tahap ponsel (lawan sebaris di layar sempit, `viewport`) dibiarkan karena tidak mengganggu desktop. Entri DEVLOG lama tentang ponsel dibiarkan sebagai riwayat.
- **Tes:** 1 tes dihapus; 277 tes lolos.
- **Berikutnya:** transisi layar, atau fitur desktop lain.

---

## 2026-11-02 | Animasi tahap dua: papan skor berhitung, ketukan, balon Lewat, jeda berpikir

- **Tujuan:** menyelesaikan sisa ide animasi (papan skor berhitung, pendaratan kartu dan "lewat", jeda berpikir bervariasi) dan membuat pratinjau sisi lebih terlihat.
- **Dikerjakan:** (1) Papan skor berhitung: angka markah naik pelan (700 ms) dari nilai lama ke baru saat kocokan berakhir (`hitungMarkah` di `main.ts`). (2) Ketukan: kartu yang baru mendarat sedikit membesar lalu mengendap (`ketuk`). (3) Balon "Lewat" muncul di dekat pemain yang lewat (`lewat-cap`). (4) Jeda berpikir: `jedaBerpikir()` di `controller.ts` mengalikan jeda dasar dengan jumlah pilihan (lewat 0,55x, satu kartu 0,7x, banyak pilihan sampai 1,5x) dengan variasi kecil dari panjang riwayat, tanpa memakai pengacak permainan. Hanya pada tingkat animasi Penuh. (5) Pratinjau sisi: bayangan kini lebih terang (isi krem, garis tebal, cahaya kuning).
- **Keputusan:** transisi layar belum dikerjakan. Pada tingkat Kurang dan Mati jeda tetap; balon Lewat tanpa gerak bila animasi Mati atau sistem meminta gerak dikurangi.
- **Tes:** 2 tes baru (balon Lewat, jeda berpikir); 278 tes lolos.
- **Berikutnya:** transisi layar, atau tata letak khusus ponsel mendatar.

---

## 2026-11-02 | Pemeriksaan ponsel (emulasi sentuh)

- **Tujuan:** memeriksa tampilan ponsel tanpa perangkat nyata: 360x640, 390x844, dan mendatar 740x360, dengan sentuhan (Playwright, `isMobile`, `hasTouch`).
- **Dikerjakan:** hasil periksa: tidak ada geser samping dan tidak ada tombol di bawah 40 px di ketiga ukuran. Temuan: di 360x640 halaman lebih tinggi 82 px sehingga kartu tangan terpotong. Perbaikan: tinggi maksimal gambar rantai ponsel kini `min(48svh, max(200px, 100svh - 440px))` sehingga seluruh meja muat tepat satu layar. Ditambah aturan `max-height: 520px` (ponsel mendatar): kartu tangan 40 px, gambar rantai maksimal 42vh, tangan tidak menempel.
- **Keputusan:** ponsel mendatar tetap kompromi: halaman masih bisa digulir (tinggi 553 px di layar 360 px) dan rantai kecil. Tidak dibuat tata letak khusus.
- **Belum dikerjakan:** uji di perangkat nyata (bunyi, getar, gestur, bilah alamat browser).
- **Tes:** tidak ada perubahan; 276 tes lolos.
- **Berikutnya:** tata letak khusus mendatar bila diperlukan, atau sisa ide animasi.

---

## 2026-11-01 | Perbaikan layar pendek

- **Tujuan:** pada layar setinggi sekitar 760 px, tangan yang menempel di bawah menutupi tombol Kiri/Kanan.
- **Dikerjakan:** tinggi maksimal gambar rantai kini `min(52vh, max(260px, 100vh - 440px))` di `style.css`, sehingga status, tombol sisi, dan tangan muat tanpa tertutup. Pada layar tinggi tidak ada perubahan.
- **Keputusan:** hanya CSS; tidak ada perubahan tata letak rantai. Diperiksa lewat tangkapan layar 1100x760 dan 1100x900.
- **Tes:** tidak ada perubahan; 276 tes lolos.
- **Berikutnya:** uji di ponsel nyata, atau sisa ide animasi.

---

## 2026-11-01 | CI dan rilis GitHub

- **Tujuan:** pemeriksaan otomatis dan rilis yang dibuat dengan satu tag.
- **Dikerjakan:** (1) `ci.yml` sudah ada (typecheck, aturan, format, tes, build, gerbang); ditambah `concurrency` agar proses lama dibatalkan saat ada push baru. (2) `release.yml` baru: dipicu tag `v*`, memastikan tag sama dengan versi `package.json`, menjalankan `npm run cek` dan gerbang, mengemas `dist` menjadi `gaple-vX.Y.Z.zip`, lalu membuat rilis lewat `gh release create` dengan catatan otomatis (tanpa aksi pihak ketiga). (3) `vite.config.ts`: `base: './'` supaya hasil build bisa ditaruh di folder atau alamat mana pun.
- **Keputusan:** tidak ada penerbitan ke GitHub Pages; bisa ditambah bila Anda mau. Zip rilis perlu disajikan lewat server statis (modul JS tidak jalan bila dibuka langsung dari berkas).
- **Cara rilis:** naikkan versi di `package.json`, commit dan push, lalu `git tag v0.29.0` dan `git push origin v0.29.0`. Rilis muncul di tab Releases setelah workflow selesai.
- **Tes:** tidak ada perubahan; 276 tes lolos.
- **Berikutnya:** uji di ponsel nyata, atau sisa ide animasi.

---

## 2026-11-01 | Animasi: kartu sisa terbuka, zoom halus, pratinjau sisi, pengaturan animasi

- **Tujuan:** tahap animasi tingkat "Kaya" yang tidak mengubah desain meja dan kartu.
- **Dikerjakan:** (1) Di akhir kocokan, kartu sisa lawan dibalik terbuka dengan nama, jumlah kartu, dan total titik. (2) Saat skala rantai berubah, gambar di-zoom halus (WAAPI pada grup `.dunia`), bukan melompat. (3) Pratinjau sisi: kartu yang bisa dipasang di dua ujung menampilkan bayangan putus-putus di kedua ujung; bayangan bisa diklik untuk memilih sisi (`src/tampilan/bayangan.ts`, posisi dihitung dari tata letak terkunci sehingga sama persis dengan hasil nyata). (4) Pengaturan animasi Penuh, Kurang, Mati (`data-animasi` pada halaman); `prefers-reduced-motion` tetap dihormati.
- **Keputusan:** papan skor berhitung, ketukan pendaratan, jeda berpikir bervariasi, dan transisi layar tidak dikerjakan.
- **Tes:** 2 tes baru (bayangan sama dengan penempatan nyata di dua ujung, tampil di meja hanya saat ada dua sisi); 276 tes lolos.
- **Berikutnya:** uji di ponsel nyata, CI dan rilis GitHub.

---

## 2026-11-01 | Tahap ponsel dan pengaturan tema

- **Tujuan:** menggarap bagian mobile yang ditunda dan menambah pengaturan tema (dicatat untuk rilis bersama).
- **Dikerjakan:** (1) Tema: pengaturan `tema` (Hijau bawaan, Biru, Anggur, Kontras tinggi) di menu; dipasang sebagai `data-tema` pada halaman dan hanya mengubah variabel warna (kontras tinggi: hitam, putih, kuning, tanpa tekstur, bingkai putih). (2) Ponsel: area rantai kini tegak (400x560, dulu 600x440 mendatar) sehingga kartu sekitar sepertiga lebih besar di layar 360 px (kira-kira 64 px, dulu 47 px). Bingkai kayu tipis, bar tiga baris (papan skor, info, tombol berukuran ketuk), menu satu kolom dengan ubin penuh, dialog selebar layar, tangan tidak lagi menempel (tidak menutup status dan panel), tombol minimal 44-48 px.
- **Keputusan:** kerangka minimal lebar tetap 3 panjang kartu; menurunkannya ke 2 saya ukur dan hasilnya kartu justru lebih kecil. Kartu tetap mengecil pada rantai panjang di ponsel (skala rata-rata sekitar 0,6); itu kompromi yang sama dengan PC.
- **Belum dikerjakan:** pengujian di perangkat nyata dan gestur (geser, tahan lama); kartu ponsel dengan Bantuan hitung masih kecil (rantai dibatasi 40% tinggi layar).
- **Tes:** 2 tes baru; 274 tes lolos.
- **Berikutnya:** menunggu perintah Anda (mis. uji di ponsel nyata, CI dan rilis GitHub).

---

## 2026-11-01 | Segmen tengah lebih pendek dan garis bantu batas meja

- **Tujuan:** kolom tengah (antara dua belokan) tidak perlu 3 kartu; belokan boleh lebih awal supaya ruang meja terpakai optimal. Plus garis sementara untuk melihat batas meja saat pengembangan.
- **Dikerjakan:** (1) Aturan "minimal 3 kartu" diganti aturan jarak: ujung segmen tengah harus sejauh minimal satu panjang kartu + jarak bebas + setengah lebar dari sumbu baris utama. Dua kartu biasa sudah cukup (kartu balak melintang pendek di kolom, jadi kadang perlu satu lagi). Jarak ini menjamin balak melintang di baris terakhir tidak menempel pada balak baris utama, tanpa memeriksa ujung rantai lain. Akibatnya kartu kembali besar: skala rata-rata 0,79 (meja lebar) dan 0,65 (ponsel), naik dari sekitar 0,6. Kerangka minimal tinggi kembali 2,5 panjang kartu. (2) Garis bantu: `?garis=1` di alamat atau tombol G menampilkan batas area rantai (merah putus-putus), tepi dengan margin (kuning), kerangka tata letak (biru, bisa melewati area), dan sumbu tengah.
- **Keputusan:** garis bantu hanya untuk pengembangan; tidak ada tombol di tampilan biasa. Ambang tes skala dikembalikan ke 0,75 (lebar) dan 0,6 (ponsel).
- **Tes:** 1 tes baru (garis bantu); 272 tes lolos.
- **Berikutnya:** menunggu perintah Anda.

---

## 2026-11-01 | Balak melintang di segmen terakhir dan catatan tema

- **Tujuan:** balak di segmen terakhir rantai digambar sebagai kartu biasa (sejak v0.23.1), padahal balak harus melintang.
- **Dikerjakan:** pengecualian itu dicabut. Sejak segmen tengah minimal 3 kartu (v0.24.0), baris terakhir selalu cukup jauh dari baris utama sehingga balak melintang tidak lagi menempel. Satu-satunya balak yang digambar sebagai kartu biasa adalah balak yang terpaksa menjadi kartu belokan siku (bila balak sudut melintang tidak muat). Tes baru memeriksa ini pada 160 kocokan di dua ukuran area.
- **Catatan lanjutan (bersama rilis mobile):** tambahkan pengaturan tema (pilihan tampilan di menu, disimpan di pengaturan) saat tampilan ponsel dikerjakan.
- **Tes:** 1 tes baru; 271 tes lolos.
- **Berikutnya:** menunggu perintah Anda.

---

## 2026-11-01 | UX: alur main, umpan balik, menu dan onboarding (PC)

- **Tujuan:** pengalaman bermain yang jelas dan terasa hidup di PC. Bentuk meja dan kartu tidak diubah.
- **Dikerjakan:** (1) Alur main: kursi yang sedang giliran menyala (titik tiga bergerak saat komputer "berpikir"), garis lampu di atas tangan pada giliran Anda, kartu yang baru dimainkan meluncur dari kursi pemainnya, kartu dibagi satu per satu di awal kocokan. Papan ketik: Esc menutup dialog atau membatalkan pilihan kartu, panah kiri/kanan memilih sisi, P menjeda; fokus papan ketik tidak lagi hilang tiap gambar ulang. `window.confirm` diganti dialog di halaman (fokus awal pada pilihan aman), jeda juga memakai dialog. Pembaca layar mendapat pengumuman langkah lewat satu wilayah `#pengumuman` (bukan lagi seluruh meja yang diumumkan ulang). (2) Umpan balik: +markah muncul di papan kapur, cap bonus (double, triplet, quartet) di ringkasan kocokan, konfeti berupa titik kartu untuk juara, suara baru (bagi kartu, giliran Anda, bonus). (3) Menu: denah duduk (Anda, Utara mitra, Barat dan Timur lawan), ringkasan pilihan di dekat tombol Main, "Cara bermain" terbuka otomatis dan saran mode Latihan untuk pemain baru (pengaturan `pernahMain`). (4) Dengan Bantuan hitung di PC, rantai dibatasi 38% tinggi layar dan tangan tidak menempel, sehingga panel tidak tertutup.
- **Keputusan:** semua animasi hanya CSS dan mati bila pengaturan sistem meminta gerak dikurangi; `terbaru` dan `bagi` hanya dikirim pada gambar tepat setelah kejadiannya supaya animasi tidak berulang saat gambar ulang. Tidak ada alat tambahan yang dipasang (sesuai pilihan Anda); verifikasi memakai Playwright yang sudah ada.
- **Catatan lanjutan (mobile):** semua tambahan di atas belum dirapikan untuk ponsel (dialog, denah, papan kapur, animasi bagi); masuk daftar pekerjaan ponsel yang sudah dicatat pada entri sebelumnya.
- **Tes:** 9 tes baru (`test/ux.test.ts`) dan penyesuaian tes lama; 270 tes lolos.
- **Berikutnya:** menunggu penilaian Anda atas alur dan animasi.

---

## 2026-11-01 | Tema warung malam (PC), suara, dan catatan mobile

- **Tujuan:** tampilan PC yang tidak terlihat polos atau seperti templat; mobile ditunda.
- **Dikerjakan:** (1) Tema "warung malam": meja beludru hijau bertekstur di bingkai kayu, lampu di atas, papan skor kapur untuk markah (angka besar dan garis kapur putus-putus sebagai kemajuan), tombol kayu dan tombol kuning lampu untuk aksi utama, huruf slab (Rockwell, bila tidak ada Georgia) untuk judul, skor, dan status. (2) Menu: papan nama kayu dengan dua kartu balak miring, pilihan menjadi ubin (yang terpilih menyala), dua kolom. (3) Layar akhir dan ringkasan kocokan memakai papan kapur. (4) Kartu diberi bayangan; kartu legal menyala kuning. (5) Efek suara disintesis dengan WebAudio (`src/suara.ts`, tanpa berkas audio): klak kartu, klak balak, dua ketukan saat lewat, nada menang dan kalah. Pengaturan baru `suara` (bawaan menyala) di menu dan tombol di bar.
- **Keputusan:** font tanpa unduhan (tumpukan font sistem) supaya game tetap bisa dipakai luring dan tanpa dependensi. Cakupan sesuai pilihan Anda: menu, panel info dan skor, tipografi, warna, dan suara; bentuk meja dan kartu tidak diubah selain warna dan bayangan. Satu momen yang sengaja menjadi ciri: papan skor kapur.
- **Catatan pengembangan lanjutan (mobile, setelah PC selesai):** tampilan ponsel sengaja belum dipoles. Yang perlu dikerjakan: bar skor dan papan kapur untuk layar sempit (sekarang tiga kolom lama), bingkai kayu yang lebih tipis, menu satu kolom, ukuran kartu di ponsel (kerangka khusus ponsel, lihat entri tata letak rantai), tombol berukuran ketuk, dan pengujian di perangkat nyata.
- **Tes:** 3 tes suara (konteks palsu), 1 tes pengaturan suara; 270 tes lolos.
- **Berikutnya:** menunggu penilaian Anda atas tampilan, lalu bagian meja dan kartu bila diinginkan.

---

## 2026-10-31 | README baru

- **Tujuan:** README yang ringkas dan menarik untuk halaman GitHub.
- **Dikerjakan:** ditulis ulang: fitur, aturan singkat, mulai cepat, tabel perintah utama, kekuatan AI, arsitektur singkat, tautan dokumen. Pohon berkas panjang (yang sudah tertinggal dari berkas tes sebenarnya) dipindahkan ke rujukan `docs/GUIDE.md`.
- **Keputusan:** daftar tahap dan potongan tidak dimasukkan lagi (sudah ada di DEVLOG). Tanpa bagian lisensi karena proyek belum punya berkas lisensi.
- **Berikutnya:** menunggu pilihan Anda.

---

## 2026-10-31 | README baru

- **Tujuan:** README yang lebih rapi sebagai pintu masuk proyek.
- **Dikerjakan:** README ditulis ulang: judul dan lencana, ringkasan, fitur, aturan singkat, mulai cepat, parameter alamat, perintah, kekuatan AI (angka dari pengukuran di DEVLOG), arsitektur, dan tabel dokumen.
- **Keputusan:** lencana tes (257) dan versi ditulis tangan, jadi harus diperbarui bersama versi di `package.json`.
- **Berikutnya:** menunggu pilihan Anda.

---

## 2026-10-31 | Berkas tertunda

- **Tujuan:** melengkapi berkas dokumentasi yang ditunda.
- **Dikerjakan:** `CLAUDE.md` (petunjuk kerja dan aturan), `TECHSTACK.md` (teknologi), `SKILSS.md` (kemampuan dan rujukan), `SECURITY.md` (kebijakan dan cara melapor). Struktur di `docs/GUIDE.md` dan README diperbarui.
- **Keputusan:** isi diambil dari kondisi proyek yang ada (tanpa dependensi runtime, `localStorage` saja); tidak ada kode yang berubah. Cara membuat rilis GitHub saya berikan di chat, bukan di berkas.
- **Berikutnya:** menunggu pilihan Anda.

---

## 2026-10-31 | Perbaikan: balak di sudut dan segmen tengah

- **Tujuan:** balak di sudut harus tetap tampil sebagai balak, dan belokan tidak terlalu rapat.
- **Dikerjakan:** (1) Balak yang tidak muat lurus kini berdiri melintang di tengah sumbu baris (setengahnya menjorok ke sisi belokan, setengahnya ke sisi lain), lalu rantai tersambung dari ujung atas atau bawahnya searah belokan. Bila ruangnya tidak cukup, kembali ke belokan siku biasa dengan kartu digambar biasa. (2) Segmen tengah (antara belokan pertama dan kedua) minimal 3 kartu sebelum boleh berbelok lagi; kerangka minimal tinggi naik dari 3 ke 3,5 panjang kartu. (3) Balak di segmen terakhir digambar sebagai kartu biasa agar tidak menempel pada balak di baris utama.
- **Keputusan:** pencarian web untuk proyek domino sejenis tidak menemukan acuan tata letak rantai yang berguna (hanya pustaka logika permainan), jadi aturan disusun dari permintaan Anda dan permainan fisik. Dampaknya: segmen tengah lebih panjang sehingga kartu lebih sering mengecil (skala rata-rata minimal tes turun 0,75 ke 0,6 untuk meja lebar, 0,6 ke 0,5 untuk ponsel).
- **Tes:** tes belokan sesudah balak diganti (kartu sesudah balak sudut harus tepat di tengah ujungnya), tes balak sudut melintang diganti, batas skala disesuaikan.
- **Berikutnya:** menunggu pilihan Anda.

---

## 2026-10-31 | Tahap 6: AI Sulit dan mode Latihan

- **Tujuan:** AI Sulit yang memakai pelacak, dan mode latihan.
- **Dikerjakan:** (1) `pelacak.ts` mendapat `ambilTangan(acak)`: dugaan tangan tiga pemain lain yang SERAGAM di antara semua pembagian cocok (penarikan kartu demi kartu dengan bobot dari tabel pemrograman dinamis). (2) `src/ai-sulit.ts`: untuk tiap dugaan, tiap langkah legal dicoba lalu kocokan dimainkan sampai selesai oleh empat AI Sedang; langkah dengan rata-rata (markah tambahan lawan - tim sendiri) terbaik dipilih. Bawaan 60 dugaan. (3) Tingkat AI `sulit` aktif di menu. (4) Mode Latihan: pengaturan `mode`; Latihan = pertandingan yang sama dengan Bantuan hitung selalu tampil dan tombol Saran (`saranManusia`: langkah terbaik AI Sulit, kartunya disorot, teks "Saran: kartu 2-4 di sisi kanan (ujung 4)"). (5) `demo/ai-sulit.ts` (`npm run demo:sulit`).
- **Keputusan yang saya ambil (peta jalan hanya menulis "mode latihan"):** Latihan saya wujudkan sebagai pertandingan biasa ditambah Saran dan Bantuan hitung, bukan mode terpisah dengan aturan lain. Alasannya paling kecil risikonya dan memakai seluruh alur yang sudah teruji; mudah diganti bila Anda menginginkan bentuk lain (mis. kocokan tunggal tanpa target, atau ulang kocokan).
- **Kekuatan (`npm run demo:sulit`, 200 partai, 60 dugaan, kursi ditukar):** Sulit lawan Sedang menang 152/200 (76,0%); Sulit lawan Mudah 180/200 (90,0%); cermin Sulit lawan Sulit 100/200 (50,0%). Pada pengukuran awal dengan 30 dugaan: 71%. Temuan penting: dengan 8 dugaan AI ini kira-kira setara Sedang (46% dari 100 partai), jadi banyak dugaan memang menentukan.
- **Tes:** 12 tes baru (sampler: selalu cocok dan seragam terhadap brute force; Sulit: legal dan selesai di empat kursi, hanya memakai pandangan, deterministik, lebih kuat dari Sedang pada benih tetap; saran legal; tampilan Latihan dan Saran) dan gerbang 600 kocokan dengan AI Sulit lolos pemeriksa mandiri. Total 256 tes (sekitar 40 detik).
- **Perbaikan yang ikut:** panel Bantuan hitung di zip sebelumnya mengubah tata letak ponsel (lawan jadi kolom samping yang menjepit rantai) karena aturan grid `.dengan-bantuan` menimpa aturan layar sempit; sudah diperbaiki dengan aturan layar sempit sendiri, dicek di 390 piksel.
- **Belum:** Sulit hanya menyimulasikan satu kocokan (tidak mempertimbangkan skor partai, mis. sudah dekat 100); tidak memakai petunjuk dari pilihan langkah lawan; belum diuji dimainkan manusia sungguhan; di layar tinggi pendek, panel bantuan dan saran bisa tertutup tangan sampai halaman digulir.
- **Berikutnya:** semua tahap peta jalan sudah selesai. Kandidat: pertimbangan skor partai di AI Sulit, bentuk lain mode Latihan, berkas yang ditunda (`CLAUDE.md`, `TECHSTACK.md`, `SKILSS.md`, `SECURITY.md`), uji di ponsel sungguhan.

---

## 2026-10-30 | Tahap 5: pelacak kartu dan peluang, Bantuan hitung

- **Tujuan:** pelacak kartu dan peluang kartu lawan, sebagai saklar Bantuan hitung untuk pemain dan fondasi AI Sulit (tahap 6).
- **Dikerjakan:** `src/pelacak.ts`: `pandangan` (apa yang boleh dilihat satu pemain; satu-satunya jalan state penuh dibaca untuk AI/pelacak) dan `buatPelacak` (kartu keluar, belum terlihat, sisa per angka, peluang tepat). Pengaturan baru `bantuan` (controller, penyimpanan, menu dengan kotak centang); panel di meja (`htmlBantuan`) berisi sisa kartu per angka dan tabel peluang punya angka tiap ujung serta peluang lewat untuk Barat, Utara, Timur. AI Sedang kini menilai langkah lewat `pandangan` (perilaku sama, dijaga tes lama).
- **Keputusan:** peluang dihitung TEPAT dengan pemrograman dinamis, bukan simulasi acak: hasilnya deterministik dan bisa dibuktikan. Satu-satunya informasi yang dipakai adalah fakta pasti (jumlah kartu tiap pemain, riwayat lewat); pilihan langkah lawan tidak dipakai sebagai petunjuk (tidak pasti). Panel dibuat sebagai baris grid sendiri supaya tidak menimpa kartu tangan.
- **Tes:** 9 tes baru (7 pelacak, 2 tampilan) dan beberapa tes lama disesuaikan. Peluang dicocokkan dengan brute force pada 60 keadaan akhir kocokan (termasuk larangan dari riwayat lewat); sifat umum di lebih dari 200 keadaan acak (jumlah peluang tiap kartu = 1, harapan jumlah kartu tiap pemain = jumlah sebenarnya, kartu yang sungguh ada di pemain tidak pernah berpeluang 0); pemain yang lewat berpeluang 0 untuk angka terlarang dan kenyataannya memang tidak punya; panel tidak membocorkan tangan lawan; pengaturan bantuan dirapikan dari sampah. Total 244 tes.
- **Hasil:** `npm run cek` lulus, gerbang 10.002 kocokan tanpa pelanggaran, dicek visual 1280 dan 390 piksel, satu pertandingan bo3 penuh dengan AI Sedang dan bantuan hidup tanpa galat.
- **Belum:** pelacak belum dipakai AI (AI Sulit di tahap 6 yang akan memakainya); belum diuji dimainkan manusia sungguhan; peluang belum memakai petunjuk dari gaya main lawan.
- **Berikutnya:** tahap 6, AI Sulit dan mode latihan.

---

## 2026-10-30 | Tahap 4: AI Sedang

- **Temuan awal:** setelah zip sebelumnya, folder proyek sudah berisi `src/ai-sedang.ts`, `test/ai-sedang.test.ts`, `demo/ai-sedang.ts`, pemilihan tingkat AI di `controller.ts`/`main.ts`, dan `mainPartaiDengan` di `simulasi.ts`, tetapi tanpa dokumentasi (dikerjakan oleh proses lain di folder yang sama). Semuanya saya periksa dan dipertahankan, tidak ada yang dibuang, lalu dilengkapi.
- **Cara kerja AI Sedang:** tiap langkah legal dinilai, yang tertinggi dipilih (seri diacak dengan benih). Nilai: menutup kocokan, membuang kartu berat dan balak lebih dulu, menyisakan ujung yang masih bisa dilanjutkan dari tangan sendiri, memakai petunjuk pemain yang lewat (angka yang terbukti tidak dimiliki lawan dijadikan ujung, yang tidak dimiliki rekan dihindari). Bobot di `BOBOT`.
- **Dikerjakan olehku:** (1) `langkahPartaiDengan` di `simulasi.ts` (langkahAcakPartai kini memanggilnya); (2) gerbang `jalankanGerbang` menerima `kebijakan`, dan tes baru menjalankan 1.500 kocokan dengan AI Sedang di keempat kursi lewat pemeriksa mandiri: tanpa pelanggaran; (3) tes baru: AI hanya memakai tangan sendiri dan riwayat (menukar tangan pemain lain tidak mengubah pilihan, lebih dari 1.000 keadaan); (4) dokumentasi README, GUIDE (bagian `ai-sedang.ts`, tabel `simulasi.ts`), DEVLOG.
- **Ukuran kekuatan (`npm run demo:ai`, 400 partai, kursi ditukar bergantian):** Sedang lawan Mudah menang 326/400 (81,5%), rata-rata markah akhir 48,3 lawan 104,0. Cermin Mudah lawan Mudah 53,0% dan Sedang lawan Sedang 52,8% (alat ukur tidak condong).
- **Belum:** menghitung kartu yang sudah keluar dan peluang kartu lawan (tahap 5); AI Sulit (tahap 6); belum dicoba dimainkan manusia sungguhan untuk menilai rasa kesulitannya.
- **Berikutnya:** tahap 5, pelacak kartu dan peluang.

---

## 2026-10-29 | Posisi kartu terkunci: rantai tidak lagi berubah bentuk

- **Masalah:** tata letak dihitung ulang dari nol (dengan pencarian skala dan geseran anchor) setiap ada kartu baru, sehingga titik belokan dan ukuran kartu lama ikut berubah saat meja penuh.
- **Dikerjakan:** `tataRantai` ditulis ulang. Tiap ujung rantai ditata dalam kerangka maya dengan anchor di (0, 0), kartu demi kartu, tanpa melihat ke depan dan tanpa melihat ujung lain. Jadi posisi sebuah kartu hanya bergantung pada kartu sebelumnya di ujung itu, dan tidak pernah berubah ketika kartu baru ditambahkan (terkunci oleh konstruksi, tanpa menyimpan state tambahan; tetap fungsi murni dari urutan kartu, jadi simpan/muat game tidak berubah). Skala awal 0,8 (`SKALA_AWAL`). Satu-satunya yang boleh berubah adalah zoom seragam (kamera) bila segmen terakhir (panjangnya tidak dibatasi) melewati area.
- **Aturan baru tanpa melihat ke depan:** (1) kartu lurus hanya diterima bila masih menyisakan ruang satu panjang kartu di depannya, supaya kartu belokan selalu muat; (2) double hanya dipasang lurus bila sesudahnya masih muat satu kartu biasa, jika tidak double itu menjadi kartu belokan, sehingga belokan tidak pernah langsung sesudah double; (3) kerangka minimal 3 panjang kartu lebar dan 3 tinggi (setengah), supaya segmen tegak muat dua kartu dan dua baris tidak saling menyentuh; area yang lebih kecil ditangani kamera.
- **Tes:** tes stabilitas baru (kartu yang sudah ada tidak berpindah atau berputar saat kartu ditambahkan, 60 kocokan di dua area; algoritma lama gagal), tes tumpang tindih, jarak, belokan siku, dan bukan-setelah-double tetap lulus; tes lama yang mengandaikan skala 1 disesuaikan.
- **Konsekuensi (jujur):** stabilitas dibayar dengan ukuran kartu. Rata-rata skala area luas 0,79 (0% di bawah 0,6), area sempit 0,66 (30% di bawah 0,6), dibanding 0,998 dan 0,90 pada versi yang menata ulang tiap kali. Anchor tidak lagi bergeser, jadi satu sisi yang kosong tidak dipakai. Bisa diperbaiki nanti dengan kerangka khusus ponsel.
- **Hasil:** 224 tes lulus, gerbang 10.002 kocokan tanpa pelanggaran, dicek visual 1280x800 dan 390x800.
- **Berikutnya:** tahap 4 (AI Sedang).

---

## 2026-10-28 | Belokan tidak boleh langsung sesudah double

- **Masalah (screenshot pengguna):** bila kartu sebelum belokan adalah double (melintang), kartu belokan menempel sejajar di sisi panjang double, jadi dua kartu tegak berdampingan dan tampak bertumpuk. Tes belokan sebelumnya tidak menangkapnya karena kedua kartu hanya bersentuhan di tepi.
- **Dikerjakan:** `tataSatuSisi` ditulis ulang sebagai pencarian dengan mundur: tiap kartu dicoba lurus dulu; bila tidak muat (atau kartu sesudahnya akhirnya tidak muat) dicoba belokan siku di kartu itu. Belokan dilarang langsung sesudah double, jadi belokan pindah ke kartu sebelum double dan double itu sendiri menjadi kartu belokan. Tes baru: kartu sebelum setiap belokan bukan double (tanpa perbaikan, 4 tes gagal).
- **Efek samping baik:** karena belokan boleh dipilih lebih awal, kartu lebih jarang mengecil: rata-rata skala area luas 0,998 dan sempit 0,901 (sebelumnya 0,945 dan 0,84). Batas tes dinaikkan menjadi 0,95 dan 0,85.
- **Hasil:** 223 tes lulus, gerbang 10.002 kocokan tanpa pelanggaran, dicek visual 1280x800 dan 390x800.
- **Berikutnya:** tahap 4 (AI Sedang).

---

## 2026-10-28 | Tata letak rantai: anchor boleh bergeser, kartu tidak cepat mengecil

- **Tujuan:** menyesuaikan dokumen saran eksternal `solusi-tata-letak-rantai-gaple.md` dengan kode proyek ini.
- **Pencocokan dokumen:** (3.1 jarak baris dari tinggi balak) sudah tercakup: tata letak memakai kotak pembatas tiap kartu plus JARAK_BEBAS, jadi double (balak) otomatis dihitung. (3.4 deteksi tabrakan) sudah ada di `tata-rantai.test.ts` untuk setiap keadaan 150 kocokan acak di tiga area. (3.5 skala otomatis) sudah ada; yang dihitung adalah geometri, bukan CSS transform. (3.2/3.3 aturan belokan dan sumbu baru) diganti oleh belokan siku di entri sebelumnya. Tidak diambil: skala minimum 0,6 dengan geser (pan), karena aturan proyek ini rantai tidak pernah terpotong; sebagai gantinya skala dijaga lewat langkah di bawah. Dokumen itu sendiri mengaku dibuat tanpa melihat kode.
- **Temuan dari pengukuran:** sesudah belokan siku, kartu sering terlalu kecil: area luas rata-rata skala 0,82 dan 16% keadaan di bawah 0,6; area sempit rata-rata 0,65 dan 46% di bawah 0,6. Penyebabnya anchor selalu di tengah, jadi tiap sisi hanya mendapat separuh lebar meski sisi lain kosong. Jarak bebas bukan penyebabnya (diuji 0,2 dan 0).
- **Dikerjakan:** `tataRantai` mencoba anchor di tengah dulu, lalu menggesernya mendatar (`FRAKSI_ANCHOR`, 0,2 sampai 0,8 lebar area) sebelum memperkecil skala. Tes baru menjaga rata-rata skala (luas 0,9; sempit 0,78).
- **Hasil:** area luas rata-rata 0,945 (di bawah 0,6: 0%); sempit 0,84 (5,5%). 223 tes lulus, gerbang 10.002 kocokan tanpa pelanggaran. Efek samping: bila rantai tumbuh ke satu sisi, seluruh rantai dapat bergeser sedikit ke samping saat ada kartu baru.
- **Dicoba dan ditolak:** menambah belokan menjadi 4 per ujung (hanya naik sedikit, merusak aturan sentuhan).
- **Berikutnya:** tahap 4 (AI Sedang).

---

## 2026-10-28 | Perbaikan belokan rantai: siku, bukan bertumpuk

- **Masalah:** perbaikan jarak sebelumnya salah sasaran. Akar masalah ada di aturan belokan: kartu belokan diletakkan di SAMPING kartu terakhir (sejajar, menempel sepanjang sisi panjang), sehingga dua kartu tampak bertumpuk di tiap belokan. Aturan jarak tidak berlaku untuk kartu bertetangga, dan tes lama hanya memeriksa kartu bukan tetangga, jadi masalah lolos.
- **Dikerjakan:** `tataSatuSisi` kini membuat belokan siku: kartu belokan diletakkan di ujung kartu terakhir (sisi pendeknya menempel pada sisi ujung kartu terakhir, rata dengan tepi yang menjauhi arah belok), lalu rantai lanjut tegak lurus. Tes baru: pada setiap belokan, kartu belokan tidak boleh tumpang tindih searah dengan kartu sebelumnya (tidak sejajar berdampingan). Sabotase ke aturan lama membuat 6 tes gagal.
- **Keputusan:** belokan siku memakai ruang lebih banyak, jadi rantai panjang mengecil sedikit lebih awal. Aturan jarak JARAK_BEBAS dipertahankan.
- **Hasil:** `npm run cek` lulus, gerbang 10.002 kocokan tanpa pelanggaran; dicek visual di 1280x800 dan 390x800.

---

## 2026-10-28 | Perbaikan tata letak rantai: kartu tidak lagi menempel

- **Tujuan:** pada rantai panjang, kartu di segmen yang berbelok tampak bertumpuk dengan baris utama (laporan pengguna dengan tangkapan layar).
- **Dikerjakan:** `tata-rantai.ts` kini mewajibkan jarak bebas minimal 0,4 lebar kartu antara dua kartu yang bukan tetangga di rantai (tetangga: dua kartu terakhir di sisi yang sama, plus anchor untuk kartu pertama sisi itu). Jika tidak muat, aturan lama berlaku: belok, lalu perkecil skala. Tes `tata-rantai.test.ts` menambah pemeriksaan jarak untuk semua pasangan berjarak 3 atau lebih di rantai.
- **Keputusan:** rantai yang sangat panjang kini mengecil sedikit lebih cepat (rata-rata skala area luas 0,987 menjadi 0,965; area sempit 0,857 menjadi 0,833). Dipilih karena keterbacaan lebih penting daripada ukuran kartu.
- **Hasil:** `npm run cek` lulus (222 tes), gerbang 10.002 kocokan tanpa pelanggaran. Sabotase (jarak 0) membuat 3 tes gagal, jadi tes memang menangkap masalahnya.
- **Berikutnya:** tahap 4 (AI Sedang).

---

## 2026-10-28 | Potongan 18: validasi akhir, migrasi TypeScript selesai

- **Dikerjakan:** validasi menyeluruh dengan perintah yang benar-benar dijalankan; hasilnya di `docs/VALIDASI-MIGRASI.md` (tabel syarat, perintah, hasil, status). `allowJs` dan `checkJs` dihapus dari `tsconfig.json` (tidak lagi diperlukan; typecheck tetap bersih). Tiga komentar lama yang masih menyebut `main.js`/`akhir.js` dibetulkan. GUIDE bagian 2d (panduan pengembang: menambah modul bertipe, tes bertipe, `@ts-expect-error`, alur satu potongan) dan catatan upgrade tahap B ditandai selesai. `docs/HASIL-SIMULASI.md` dibuat ulang dengan versi 0.18.0 (10.002 kocokan, hasil statistik sama).
- **Hasil validasi:** tidak ada berkas `.js` proyek; typecheck, aturan penulisan, format, 222 tes, build, dan gerbang (10.002 kocokan, 0 pelanggaran) lulus; semua demo jalan tanpa peringatan; uji browser Chromium di server dev dan hasil build, viewport 360x740 dan 1280x800, bo3 (61 ketukan) dan bo5 (86 ketukan), tanpa galat konsol dan tanpa scroll horizontal; arsitektur berlapis tidak punya impor ke atas; pemeriksa mandiri tidak mengimpor apa pun.
- **Keputusan:** migrasi dinyatakan SELESAI: tidak ada modul utama yang bergantung pada implementasi `.js`.
- **Belum dilakukan:** CI belum pernah berjalan di GitHub (folder bukan repo git; urutan perintahnya sudah diuji lokal); belum diuji di ponsel sungguhan; ESLint menunggu dukungan TypeScript 7.
- **Berikutnya:** kembali ke peta jalan produk: tahap 4 (AI Sedang), lalu pelacak kartu, AI Sulit, mode latihan. Berkas `CLAUDE.md`, `TECHSTACK.md`, `SKILSS.md`, `SECURITY.md` masih ditunda sampai diminta.

---

## 2026-10-28 | Potongan 17: pembersihan, tes integrasi, format, aturan penulisan, CI

- **Dikerjakan:** `bantu/server.js` dan `npm run tampil` dihapus (diganti `npm run dev`). Tes integrasi `test/integrasi.test.ts`: satu kocokan penuh (lolos pemeriksa mandiri), satu partai penuh (markah = jumlah hasil tiap kocokan), bo3 dan bo5 penuh (deterministik untuk benih sama), alur manusia + komputer dari menu sampai layar akhir dengan setiap layar dirender dan diperiksa dari `undefined`/`NaN`. Prettier (`.prettierrc.json`, `npm run format`, `format:cek`) dan seluruh berkas sudah dirapikan. `bantu/aturan.ts` + `periksa-aturan.ts` (`npm run aturan`) menjaga aturan penulisan; 8 tes di `test/aturan.test.ts`. `npm run cek` menjalankan semuanya. `.github/workflows/ci.yml`, `.editorconfig`. GUIDE bagian 2c: lapisan arsitektur, batas modul, kompatibilitas browser.
- **Keputusan:** tidak memasang ESLint karena `typescript-eslint` menolak TypeScript 7 (peer dependency `<6.1.0`) dan memaksa pemasangan berarti dependensi rusak. Sebagai gantinya pemeriksa aturan buatan sendiri untuk empat aturan yang memang penting bagi proyek ini; bisa dipindah ke ESLint bila sudah didukung. `structuredClone` dan `Object.hasOwn` ternyata tidak dipakai di `src/` (hanya tes), `Array.prototype.at` dipakai dua kali dan aman untuk target ES2022.
- **Hasil:** `npm run cek` lulus (222 tes), gerbang 10.002 kocokan tanpa pelanggaran, uji browser (Chromium 360x740) di server dev dan hasil build: satu pertandingan bo3 penuh lewat 61 ketukan, tanpa galat konsol.
- **Berikutnya:** potongan 18: validasi akhir dan penutupan migrasi.

---

## 2026-10-28 | Potongan 16: bantu/ dan demo/ menjadi TypeScript

- **Dikerjakan:** `bantu/pemeriksa.ts`, `bantu/gerbang.ts`, `demo/potongan-2` sampai `6` (`.ts`), `demo/bersama.ts` (pembantu `namaPemain`, `wajib`), dan `test/gerbang.test.ts`. Tipe baru: `Statistik`, `OpsiGerbang`, serta bentuk masukan pemeriksa (`MasukanPeriksa`, `KocokanPeriksa`, `LangkahPeriksa`, `RencanaPeriksa`). Skrip `npm run demo/gerbang` kini menjalankan `.ts` langsung lewat Node 22.18+ tanpa peringatan; `demo/potongan-5.ts` menolak format selain bo3/bo5 dengan pesan jelas.
- **Keputusan:** pemeriksa tetap MANDIRI. Ia tidak mengimpor apa pun dari `src/`, termasuk tipe; bentuk masukannya dideklarasikan sendiri secara struktural, sehingga state dari mesin tetap cocok tetapi pemeriksa tidak ikut berubah bila tipe mesin berubah. Tes gerbang membuat salinan masukan yang bisa diubah lewat penyalinan eksplisit (bukan cast), lalu merusaknya dengan sengaja; 16 sabotase tetap semuanya tertangkap.
- **Masalah:** skrip migrasi saya menghapus `bantu/gerbang.js` walau penulisan `gerbang.ts` gagal (kesalahan yang sama seperti potongan 15). Dipulihkan dari zip potongan 14, lalu penghapusan dipisah dengan `&&` setelah penulisan sukses.
- **Hasil:** typecheck bersih, 208 tes lulus, gerbang 10.002 kocokan tanpa pelanggaran (`npm run gerbang`), demo 2-5 jalan. Satu-satunya `.js` yang tersisa: `bantu/server.js`.
- **Berikutnya:** potongan 17: hapus `bantu/server.js` dan `npm run tampil`, tes integrasi tambahan, lint/format, CI.

---

## 2026-10-28 | Potongan 15: tampilan dan main menjadi TypeScript

- **Dikerjakan:** `kartu-svg.ts`, `rangkaian-svg.ts`, `tata-rantai.ts`, `meja-html.ts`, `layar-html.ts`, dan `main.ts`. Seluruh `src/` kini TypeScript; tidak ada lagi `.js` di dalamnya. Tipe baru: `ArahKartu`, `Area`, `UkuranKartu`, `KartuTata`, `HasilTata`, `OpsiTata`, `OpsiMeja`. `adalahSisi` (meja.ts) dan `adalahAi` (controller.ts) menjadi penjaga tipe untuk data dari halaman. `main.ts` memakai `instanceof` untuk elemen DOM (tanpa cast), dan `muatPengaturan`/`simpanPengaturan` menerima `Penyimpanan | null`. `index.html` memuat `src/main.ts`. Tes tata-rantai dan tampilan menjadi `.test.ts`.
- **Masalah:** skrip migrasi saya menghapus `tata-rantai.js`, `rangkaian-svg.js`, `kartu-svg.js` sebelum `.ts`-nya tertulis (perintah `rm` berjalan walau skrip Python gagal). `tata-rantai.ts` saya tulis ulang dari sumber yang sudah saya baca; dibuktikan sama oleh 14 tes tata-rantai (150 kocokan x 3 area) dan 4 sabotase (belokan 0, putaran double hilang, angka awal/akhir ditukar, margin negatif), semuanya tertangkap. Pelajaran: pisahkan penulisan dan penghapusan dengan `&&`.
- **Hasil:** typecheck bersih, 208 tes lulus, gerbang 10.002 kocokan tanpa pelanggaran, `vite build` jalan. Uji browser (Chromium 360x740): server dev dan hasil build sama-sama memainkan satu pertandingan bo3 penuh lewat 61 ketukan tanpa galat konsol.
- **Berikutnya:** potongan 16: `bantu/` dan `demo/`.

---

## 2026-10-28 | Potongan 14: controller dan penyimpanan menjadi TypeScript

- **Dikerjakan:** `controller.ts` dan `penyimpanan.ts` dengan tipe penuh (tanpa `any`/`as`). Tipe baru: `Pengaturan`, `TingkatAi`, `Aplikasi`, `Layar`, `PilihanManusia`, `Penyimpanan` (bagian `localStorage` yang dipakai). `rapikanPengaturan(mentah: unknown)` memakai penjaga tipe (`adalahFormat`, `adalahAi`) sehingga data tak tepercaya tetap aman. `langkahOtomatis` dan `mainkanManusia` kini mengembalikan `PartaiBerjalan | PartaiRingkasan`. Tes controller, alur, penyimpanan menjadi `.test.ts`; ditambah tes untuk `nomorPartai`/`ubahPartaiAktif` di menu dan untuk `rapikanPengaturan` dengan masukan sampah.
- **Keputusan:** fungsi yang dulu gagal dengan TypeError saat `pertandingan` null (`nomorPartai`, `ubahPartaiAktif`, `layarAktif` tanpa partai) kini melempar Error berbahasa jelas. Perilaku di jalur normal tidak berubah.
- **Hasil:** typecheck bersih, 208 tes lulus, gerbang 10.002 kocokan tanpa pelanggaran, `vite build` jalan.
- **Berikutnya:** potongan 15: modul tampilan dan `main`.

---

## 2026-10-28 | Potongan 13: kocokan, partai, pertandingan (dan simulasi) menjadi TypeScript

- **Dikerjakan:** `kocokan.ts`, `partai.ts`, `pertandingan.ts` sudah ada sebagai TypeScript di folder (diubah pukul 19:30 oleh proses lain sesudah zip potongan 12, sumbernya saya periksa: tanpa `any`/`as`, `Partai` berupa gabungan per status, `Pertandingan` bertipe). Bagian saya: `simulasi.ts` (menggantikan `simulasi.js` dan tipe sementara `simulasi.d.ts`), `LangkahAcak` dan `HasilSimulasi` bertipe, serta merapikan tipe ±95 titik di tes kocokan, kocokan-pembuka, partai, pertandingan (`empat()`, `nomor()`, `ada()`, `@ts-expect-error` untuk masukan yang sengaja salah, pelindung tipe `punyaStatus` agar `majuSampai` mengembalikan status yang tepat).
- **Keputusan:** tidak ada cast; `as const` hanya untuk daftar nomor pemain. Perilaku tidak berubah.
- **Masalah:** dua proses menulis ke folder yang sama, jadi sebagian berkas berubah tanpa sepengetahuan satu sama lain. Jalankan satu agen saja per folder.
- **Hasil:** typecheck bersih, 206 tes lulus, gerbang 10.002 kocokan tanpa pelanggaran, demo 2-5 jalan, `vite build` jalan.
- **Berikutnya:** potongan 14: `controller`, `penyimpanan`.

---

## 2026-10-27 | Potongan 12: pembuka, akhir, markah menjadi TypeScript

- **Dikerjakan:** `pembuka.ts`, `akhir.ts`, `markah.ts` dengan tipe penuh (tanpa `any` dan tanpa `as`). Tipe baru: `Syarat`, `RencanaPembukaan`, `KeputusanPembuka`, `AkhirKocokan`, `JenisBonus`, `HasilKocokan` (gabungan `HasilHabis` | `HasilTabrak`), `Markah`. `src/tipe-kocokan.ts` (hanya tipe) memuat `StateKocokan` dan `Kejadian` agar akhir/markah tidak butuh `kocokan.js`. `engine.ts` mengekspor `adalahAngka` dan `adalahNomorPemain`. `bantu/skenario` jadi `.ts`, ditambah `bantu/bantuan-tes.ts`. Tes pembuka/akhir/markah menjadi `.test.ts`, ditambah `test/tipe-kocokan.test.ts`. Semua impor ke `pembuka`, `akhir`, `markah` memakai `.ts`.
- **Keputusan:** `HasilKocokan` dibuat gabungan terdiskriminasi: `penutup` pasti ada saat habis dan `undefined` saat tabrak. `kocokan.d.ts` dan `simulasi.d.ts` adalah tipe SEMENTARA agar tes bisa dicek ketat selama dua modul itu masih JS; keduanya dihapus saat modulnya dimigrasi.
- **Masalah:** tes lama mengirim masukan salah dengan sengaja (mis. `[0]`, `'00'`). Diberi `@ts-expect-error` per baris, bukan cast. Perilaku tidak berubah: 206 tes lulus, gerbang 10.002 kocokan tanpa pelanggaran, `vite build` jalan.
- **Dipelajari:** `switch` yang habis (exhaustive) membuat cabang `default` bertipe `never`; pesan galat memakai `JSON.stringify` agar tetap aman.
- **Berikutnya:** potongan 13: `kocokan`, `partai`, `pertandingan`.

---

## 2026-10-27 | Potongan 11: TypeScript, Vite, Vitest (fondasi + rng, engine, meja)

**Tujuan:** memasang alat TypeScript dan mulai memigrasikan modul satu per satu, tanpa mengubah perilaku game.

**Dikerjakan:**
- Alat: TypeScript 7, Vite 8, Vitest 5 (`npm install`). Berkas baru: `tsconfig.json` (ketat), `vite.config.ts`, `.gitignore`. Skrip baru: `dev`, `build`, `preview`, `typecheck`, `test`, `test:watch`. Node minimal 22.18.
- Semua 202 tes lama dipindah dari `node:test` ke Vitest hanya dengan mengganti satu baris impor; jumlah dan hasilnya sama.
- `rng`, `engine`, `meja` dimigrasikan ke `.ts` dengan tipe lengkap (`Angka`, `Kartu`, `NomorPemain`, `NomorTim`, `Meja`, `Letak`, `Sisi`, `FungsiAcak`). Tes ketiganya menjadi `.test.ts`. `tipe-domain.test.ts` menambah pemeriksaan tipe. Total 203 tes.
- Semua pengimpor (src, test, bantu, demo) langsung memakai `./engine.ts`, `./meja.ts`, `./rng.ts`; tidak ada pembungkus `.js`.

**Verifikasi:** `tsc --noEmit` bersih (dan terbukti menolak kode salah); 203 tes lulus; gerbang tahap 1 memberi hasil sama (10.002 kocokan, nol pelanggaran); dev server dan hasil build produksi sama-sama dipakai memainkan satu pertandingan bo3 penuh lewat ketukan di browser uji, tanpa galat.

**Keputusan:**
- **Tanpa pembungkus `.js`.** Impor memakai ekstensi `.ts` langsung dan Node 22.18+ menjalankan `.ts` secara bawaan, jadi demo dan gerbang tetap jalan tanpa langkah build. Setiap modul yang pindah cukup mengubah pengimpornya.
- **`erasableSyntaxOnly`:** hanya sintaks TypeScript yang bisa dihapus tanpa mengubah perilaku (tanpa enum), supaya Node bisa menjalankannya dan hasil build sama dengan yang diuji.
- **Nomor pemain bertipe `0|1|2|3`, dihitung dari tabel** (bukan `% 4`), sehingga tidak butuh `as`. Konsekuensi: `giliranBerikutnya(4)` kini menghasilkan `undefined` bukan 1; tidak ada kode yang memanggilnya begitu, dan tipe melarangnya.
- **`noUncheckedIndexedAccess` dinyalakan.** Akibatnya satu tempat di `kocok` memeriksa `undefined` (tidak terjangkau dalam praktik).
- **Vitest dipakai untuk semua tes sekaligus** (bukan hanya modul yang bermigrasi): mengganti runner di tengah jalan akan menjalankan dua runner berdampingan.

**Masalah:** `@ts-expect-error` yang awalnya ikut dijalankan benar-benar memanggil fungsi dan gagal saat dites; dipindah ke fungsi yang tidak pernah dipanggil.

**Berikutnya:** potongan 12: `pembuka`, `akhir`, `markah` (tipe `RencanaPembukaan`, `HasilKocokan`, `Markah`).

---

## 2026-10-26 | Potongan 10: tata letak rantai di meja

**Tujuan:** rantai kartu di meja tidak lagi dibungkus seperti teks, tetapi tumbuh dari kartu pertama ke dua arah, membelok di tepi meja, dan selalu terlihat seluruhnya.

**Dikerjakan:**
- `src/tampilan/tata-rantai.js`: fungsi murni `tataRantai(rangkaian, {area, indeksAnchor})` yang menghasilkan posisi, putaran, dan angka yang menghadap anchor untuk tiap kartu; `indeksAnchor(kocokan)`.
- `src/tampilan/rangkaian-svg.js`: seluruh rantai digambar sebagai satu SVG (browser menskalakan ke lebar tempatnya). `kartu-svg.js` dipecah menjadi `isiKartu` (isi) dan `svgKartu` (pembungkus).
- `meja-html.js` memakai keduanya; `main.js` memilih area luas atau sempit sesuai lebar layar dan menggambar ulang saat layar berpindah.
- `test/tata-rantai.test.js`: 14 tes. Total 202 tes, semua lulus.

**Aturan yang dipakai:** kartu pertama di tengah; kartu biasa searah rantai; double melintang di sumbu rantai; ujung kiri membelok ke atas lalu ke kanan, ujung kanan ke bawah lalu ke kiri (maksimal dua belokan per ujung); bila tetap tidak muat, skala mengecil bertahap. Angka yang bersentuhan selalu sama karena yang berubah hanya putaran kartu.

**Cara menguji:** bukan hanya contoh. Tiap hasil diperiksa untuk 150 kocokan acak, di setiap langkahnya, pada tiga ukuran meja (luas, sempit, sangat sempit): tidak ada kartu bertumpuk, semuanya dalam meja, kartu bertetangga menempel sepanjang sisi penuh, angka yang bersentuhan sama, dan separuh `awal` menghadap anchor. Tes juga diuji dengan sabotase (tanda belokan dibalik, double dianggap biasa, awal dan akhir tertukar, urutan belokan salah); semuanya tertangkap. Satu sabotase sempat lolos karena tes "menempel" menerima sentuhan di satu titik sudut; tesnya diperketat menjadi sepanjang sisi penuh.

**Keputusan:**
- **Belokan "ke dalam":** kartu belokan menempel di sisi samping kartu terakhir, rata dengan ujungnya, sehingga belokan tidak butuh ruang melewati ujung rantai. Percobaan pertama (belok "ke luar") membuat kartu belokan melewati tepi dan memaksa pengecilan skala berlebihan pada rantai pendek.
- **Skala mengecil hanya bila dua belokan pun tidak cukup.** Kartu tidak pernah dipotong.
- **Satuan area = satuan viewBox kartu**, jadi tata letak tidak tahu piksel; ukuran tampil diatur browser.
- **Screenshot referensi tidak tersedia** saat potongan ini dikerjakan. Aturan diambil dari deskripsi pemilik; bila screenshot menunjukkan bentuk belokan lain (mis. jumlah kartu per sisi sebelum belok, atau belokan "ke luar"), cukup ubah rumus belokan di `tataSatuSisi` dan jalankan tes.

**Masalah:** lihat di atas (tes yang terlalu longgar dan belokan ke luar).

**Berikutnya:** pemilik mencoba di HP/desktop; bandingkan dengan screenshot referensi dan laporkan perbedaan bentuk belokan.

---

## 2026-10-26 | Tahap 3, potongan 9: menu, alur pertandingan, hasil akhir

**Tujuan:** bermain satu pertandingan utuh (bo3 atau bo5) dari menu sampai juara tanpa memuat ulang halaman.

**Dikerjakan:**
- `controller.js`: state aplikasi `{pengaturan, pertandingan}` dan fungsi alurnya (`mulaiPermainan`, `lanjutkan`, `kembaliKeMenu`, `ubahPengaturan`, `layarAktif`).
- `src/penyimpanan.js`: simpan dan muat pengaturan di `localStorage`, tahan terhadap data rusak dan penyimpanan yang ditolak.
- `src/tampilan/layar-html.js`: menu (format, lawan, aturan singkat), layar antar partai, layar hasil akhir.
- `main.js` ditulis ulang sebagai pengatur layar; tombol Menu di bar atas (dengan konfirmasi saat bermain).
- Tes baru: `alur.test.js` (19) dan `penyimpanan.test.js` (6). Total 188 tes, semua lulus.

**Hasil uji browser (layar 360 px):** dari menu memilih format, pengaturan bo5 tetap terpilih setelah muat ulang, lalu satu pertandingan bo3 dimainkan sampai layar hasil dan kembali ke menu, tanpa galat dan tanpa geser samping.

**Keputusan:**
- **Layar diturunkan dari state, tidak disimpan terpisah.** `layarAktif` membaca pertandingan (ada juara? partai selesai?). Dua penanda yang bisa berselisih tidak ada.
- **Data dari browser dianggap tidak dipercaya.** `rapikanPengaturan` membuang kunci asing dan mengganti nilai tak dikenal; tes mencakup JSON rusak dan kunci seperti `__proto__`.
- **`storage` dioper sebagai argumen.** Cara ini membuat penyimpanan bisa diuji di Node dengan penyimpanan palsu.
- **Aturan singkat memakai angka yang sama dengan mesin** (tes membandingkan bonus 20/30/50 dan batas 100).
- **Sedang dan Sulit tampil tetapi dinonaktifkan** ("segera"), agar pemain tahu rencananya.
- **Saklar Bantuan hitung belum ada**; ia masuk bersama pelacak di tahap 5.

**Masalah:** tidak ada yang berarti; pemisahan antara state, tampilan, dan penjadwalan di potongan 8 membuat tahap ini hampir seluruhnya tambahan.

**Dipelajari:** `localStorage`, elemen `<fieldset>` dan radio, `<details>`, mengapa data dari luar harus dirapikan.

**Berikutnya:** tahap 3 hampir selesai; sisa yang belum: penyempurnaan visual dan uji di HP asli. Lalu tahap 4 (naik ke TypeScript + Vite, kemudian AI Sedang).

---

## 2026-10-26 | Tahap 2, potongan 8: bisa dimainkan dengan ketukan

**Tujuan:** memainkan satu partai penuh lawan tiga komputer (AI Mudah, acak) hanya dengan mengetuk.

**Dikerjakan:**
- `src/controller.js`: fungsi murni untuk alur manusia dan komputer (`menungguManusia`, `adaLangkahOtomatis`, `langkahOtomatis`, `pilihanKartu`, `mainkanManusia`).
- `src/main.js`: menyimpan state, menggambar ulang, menangani ketukan, dan menjadwalkan langkah komputer dengan jeda (`?jeda=700`).
- `meja-html.js`: tombol Kiri/Kanan/Batal saat dua sisi mungkin, tulisan langkah terakhir ("Timur memainkan 2-3"), ringkasan kocokan dengan tombol lanjut, label Jeda/Lanjut.
- `style.css`: layar sempit menaruh tiga lawan sebaris di atas supaya rangkaian memakai seluruh lebar, dan tangan Anda menempel di bawah layar.
- `test/controller.test.js`: 11 tes. Total 169 tes, semua lulus.

**Hasil uji browser:** browser uji (layar 360 px) memainkan satu partai penuh lewat ketukan: 7 kocokan, 37 ketukan, tanpa galat dan tanpa geser samping. Belum dicoba di HP asli.

**Keputusan:**
- **Alur dipisah dari jam.** Controller tidak tahu `setTimeout`; hanya main.js yang tahu waktu. Karena itu seluruh alur diuji di Node tanpa menunggu.
- **Sisi tidak ditanyakan bila tidak ada bedanya.** Bila kedua ujung meja sama angkanya, kartu langsung ditaruh di kanan.
- **Manusia tanpa kartu cocok lewat otomatis** setelah jeda, dengan tulisan "Anda lewat", tanpa tombol Lewat. Lewat memang bukan pilihan di gaple.
- **Aturan tetap hanya di mesin.** Tampilan hanya mengaktifkan tombol kartu legal; bila ada yang menyiasati tombol, mesin tetap melempar Error.
- **Tangan menempel di bawah layar (sticky)** supaya tidak tergeser keluar layar oleh rangkaian yang panjang.

**Masalah:** pada layar sempit rangkaian dan kolom lawan berebut tempat sehingga rangkaian hanya 3 kartu per baris dan tangan tergeser keluar layar. Diselesaikan dengan menaruh lawan sebaris di atas dan tangan sticky.

**Dipelajari:** delegasi peristiwa (satu pendengar klik untuk semua tombol), `data-` atribut, media query, `position: sticky`.

**Berikutnya:** tahap 3: menu awal (pilih bo3/bo5), alur pertandingan penuh (poin antar partai), layar akhir, dan penyimpanan pengaturan.

---

## 2026-10-26 | Tahap 2, potongan 7: kartu SVG dan meja statis

**Tujuan:** melihat state mesin aturan sebagai gambar meja di browser, tanpa interaksi dulu.

**Dikerjakan:**
- `src/tampilan/kartu-svg.js`: kartu domino sebagai string SVG (titik di kisi 3x3, tegak dan datar) dan punggung kartu.
- `src/tampilan/meja-html.js`: `htmlMeja(partai)` menyusun bar markah, tiga lawan, rangkaian, status giliran, dan tangan Anda.
- `index.html`, `style.css`, `src/main.js`: halaman yang membagi satu kocokan, memainkan langkah acak sampai giliran Anda, lalu menggambar meja. Parameter `?benih=7&langkah=14`.
- `bantu/server.js` dan `npm run tampil`: server berkas lokal.
- `test/tampilan.test.js`: 11 tes. Total 158 tes, semua lulus.

**Keputusan:**
- **Penggambar berupa fungsi murni (data masuk, teks keluar).** Bisa diuji di Node tanpa browser, dan aturan permainan tidak bercampur dengan urusan tampilan.
- **Kartu tangan memakai `<button>`.** Tombol sudah bisa difokus dan ditekan dengan keyboard, dan `disabled` otomatis dibaca pembaca layar. Potongan 8 tinggal memasang aksi ketuk.
- **Warna dan ukuran hanya di `style.css`.** SVG hanya memberi nama kelas.
- **Lebar kartu tangan minimal 44 px** (target ketuk di brief), sehingga 7 kartu muat di layar 360 px.
- **Server lokal diperlukan** karena browser menolak `import` dari `file://`.

**Masalah:** rangkaian yang panjang dibungkus ke baris berikutnya sehingga urutannya terbaca seperti teks, bukan seperti ular di meja. Cukup untuk sekarang; penataan melengkung ditunda ke penyempurnaan tampilan (catatan di brief bagian 18 bisa ditambah).

**Dipelajari:** HTML (kerangka halaman), CSS grid (susunan meja), SVG (gambar dari teks), `import` modul di browser, dan alasan butuh server lokal.

**Berikutnya:** potongan 8: mengetuk kartu legal untuk memainkannya, memilih sisi kiri atau kanan, lalu giliran komputer (AI Mudah) berjalan dengan jeda.

---

## 2026-10-26 | Keputusan: nomor kocokan setelah tabrak seri

**Tujuan:** menyelaraskan brief dengan kode soal penomoran kocokan netral.

**Keputusan:** kocokan netral (setelah tabrak seri) memakai nomor kocokan baru, sesuai kode. Brief bagian 13 (asumsi 1) sudah disesuaikan. Kocok ulang karena dua pembuka tanpa balak tetap tidak mengubah nomor.

**Catatan pengembangan berikutnya:** untuk pengalaman bermain yang lebih realistis, nomor bisa dibuat tidak naik setelah seri (seri dianggap kocokan batal). Perubahannya ada di `src/partai.js` dan `test/partai.test.js`, lalu jalankan `npm run gerbang` agar pemeriksa mandiri ikut diperbarui. Markah dan hasil pertandingan tidak terpengaruh. Dikerjakan nanti, bukan di tahap saat ini.

---

## 2026-10-25 | Tahap 1, potongan 6: gerbang 10.000 kocokan (tahap 1 selesai)

**Tujuan:** membuktikan mesin aturan tidak pernah melanggar aturan, dengan memainkan ribuan kocokan acak dan memeriksa tiap kocokan dengan cara yang tidak bergantung pada mesin itu sendiri.

**Dikerjakan:**
- `bantu/pemeriksa.js`: pemeriksa mandiri. Merekonstruksi tangan awal dari sisa kartu dan riwayat, memutar ulang tiap langkah, lalu membandingkan keadaan akhir, pembuka, markah, bonus, dan rencana berikutnya dengan hasil mesin. Tidak mengimpor apa pun dari `src/`.
- `bantu/gerbang.ts` dan `demo/potongan-6.js`: pelari gerbang (`npm run gerbang`) yang memainkan pertandingan bo3 dan bo5 bergantian, memeriksa tiap kocokan, mengumpulkan statistik, dan mencetak laporan Markdown.
- `docs/HASIL-SIMULASI.md`: laporan gerbang resmi (10.002 kocokan) ditambah tiga putaran besar.
- `test/gerbang.test.js`: 20 tes, termasuk 15 tes yang merusak data dengan sengaja untuk memastikan pemeriksa benar-benar menolaknya. Total 147 tes, semua lulus.

**Hasil:** 10.002 kocokan (1.738 partai, 518 pertandingan) tanpa satu pelanggaran dalam kurang dari satu detik. Tiga putaran besar menambah 300.038 kocokan, juga tanpa pelanggaran.

**Keputusan:**
- **Pemeriksa ditulis terpisah dan ditempatkan di `bantu/`, bukan `src/`.** Ia alat uji, bukan bagian game, dan tidak boleh dibawa ke tahap berikutnya sebagai ketergantungan. Pemeriksa yang meminjam fungsi mesin hanya akan mengulangi kesalahan mesin.
- **Pemeriksa harus diuji dengan data rusak.** Pemeriksa yang lolos untuk data benar belum terbukti apa-apa; ia baru berguna bila terbukti menolak data salah.
- **Gerbang berhenti di akhir pertandingan, bukan tepat di 10.000.** Karena itu jumlahnya 10.002.
- **Pelanggaran menyebut format dan benih.** Benih yang sama selalu menghasilkan pertandingan yang sama, sehingga masalah bisa diulang persis.

**Masalah:**
- **Giliran sebelumnya terputus oleh batas sesi** saat potongan 6 baru separuh jalan. Ia meninggalkan draf pemeriksa (`src/audit.js`, `src/gerbang.js`, `test/audit.test.js`) yang belum selesai: 10 tesnya gagal karena kesalahan pola pesan di tes. Saat melanjutkan, saya sempat tidak mengenali file itu dan menelusurinya lewat riwayat sesi. Dua pemeriksaan yang hanya ada di draf lama (kecocokan `ujungSebelum` di riwayat dan kesinambungan rangkaian di meja) dipindahkan ke `bantu/pemeriksa.js` beserta tes data rusaknya, lalu draf lama dihapus supaya hanya ada satu gerbang.
- **Tim 1 menang lebih sering di gerbang resmi** (914 lawan 824). Karena pemain acak seharusnya seimbang, saya cek dengan tiga putaran 100.000 kocokan. Arahnya berubah-ubah dan besarnya wajar untuk kebetulan. Aturan juga simetris antar tim, jadi tidak ada dugaan bias.

**Fakta dari gerbang resmi** (pemain acak): habis 77,2% dan tabrak 22,8% (seri 1,6%). Di antara yang habis: double 16,1%, triplet 13,9%, quartet 2,6%. Hak membuka pindah 9,5% dan kocok ulang 0,2% dari pembagian, sesuai hitungan teori (sekitar 9,8% dan 0,3%). Satu kocokan rata-rata 25,8 langkah dan satu partai rata-rata 5,75 kocokan.

**Dipelajari:**
- Kenapa penguji harus independen dari yang diuji, dan kenapa penguji sendiri perlu diuji.
- Membaca angka statistik dengan curiga: selisih yang tampak besar belum tentu ada artinya sebelum dicek dengan sampel lebih besar.
- Menelusuri riwayat kerja sendiri (log sesi) saat menemukan file yang tidak dikenali.

**Tahap 1 selesai.** Mesin aturan lengkap: kartu, dek, meja, kocokan, pembuka, markah, bonus, partai, pertandingan.

**Berikutnya:** sebelum tahap 2 (tampilan), lengkapi brief dengan unsur PRD yang kurang (metrik keberhasilan, risiko, glosarium, sketsa tampilan) dan sesuaikan bagian 9 brief dengan struktur modul sebenarnya. Setelah itu tahap 2: tampilan dasar.

---

## 2026-10-25 | Tahap 1, potongan 5: partai dan pertandingan

**Tujuan:** menyusun alur partai (rangkaian kocokan sampai markah 100) dan pertandingan (bo3 atau bo5 sampai ada juara) di atas mesin kocokan yang sudah ada.

**Dikerjakan:**
- `src/partai.js` (baru): `mulaiPartai`, `bagiKocokan`, `mainkanPartai`, `lewatPartai`, `lanjutkanPartai`, dengan empat status (`siap`, `berjalan`, `ringkasan`, `selesai`).
- `src/pertandingan.js` (baru): `mulaiPertandingan`, `mulaiPartaiBerikutnya`, `ubahPartai`, `catatPartai`, `TARGET_POIN`.
- `src/simulasi.ts`: `pilihLangkahAcak`, `langkahAcakPartai`, `mainAcakPartai`, `mainAcakPertandingan`.
- 25 pengujian baru (`test/partai.test.js`, `test/pertandingan.test.js`). Total 127, semua lulus.
- `demo/potongan-5.js`: satu pertandingan penuh. `npm run demo` kini menjalankannya; demo lama jadi `demo:4`, `demo:3`, `demo:2`.

**Keputusan:**
- **Status `ringkasan` dipisah dari status `siap`.** Markah sudah bertambah begitu kocokan berakhir, tetapi kocokan terakhir tetap disimpan sampai pemanggil memanggil `lanjutkanPartai`. Dengan begitu tampilan nanti punya waktu untuk menampilkan ringkasan kocokan (sesuai state `ringkasanKocokan` di brief) tanpa data hilang.
- **Pembagian kartu memakai fungsi acak yang diberikan pemanggil**, sama seperti `kocok`. Benih yang sama menghasilkan seluruh pertandingan yang sama, jadi pertandingan bisa diulang persis untuk mencari bug.
- **Kocok ulang ditangani di dalam `bagiKocokan`.** Pemanggil tidak perlu tahu soal kocokan yang tidak adil. Jumlah pengulangan dicatat (`jumlahKocokUlang`) dan dipakai demo.
- **Partai di dalam pertandingan diubah lewat `ubahPartai`.** Ini menjaga semua fungsi partai tetap murni dan tidak tahu soal pertandingan, sehingga partai bisa diuji sendiri.
- **`catatPartai` dipisah dari akhir partai.** Poin baru bertambah saat dicatat, dan `mulaiPartaiBerikutnya` menolak bila partai lama belum dicatat. Ini mencegah partai baru dimulai dengan poin yang belum diperbarui.
- **Riwayat disimpan per kocokan dan per partai** (`riwayatHasil`, `riwayatPartai`) supaya statistik, ringkasan, dan tinjauan setelah pertandingan nanti tidak perlu dihitung ulang.

**Masalah:**
- Dua pengujian pertandingan gagal karena indeks pemenang dan yang kalah tertukar di tes saya sendiri (pemenang punya markah di bawah 100, yang kalah 100 atau lebih). Kodenya benar, tesnya diperbaiki.
- Satu tes sempat memakai `Math.random`, yang membuat hasilnya tidak bisa diulang. Diganti benih tetap. Aturan: tes tidak boleh bergantung pada angka acak yang tidak berbenih.

**Fakta dari 300 pertandingan acak per format** (pemain bermain acak): bo3 rata-rata 2,5 partai dan 14,6 kocokan (2 sampai 3 partai); bo5 rata-rata 4,1 partai dan 24,0 kocokan (3 sampai 5 partai). Dengan benih yang sama, urutan pemenang partai di bo5 selalu diawali urutan di bo3, karena aliran acaknya sama.

**Dipelajari:**
- Mesin status (state machine): tiap status hanya boleh dilalui fungsi tertentu, dan fungsi lain menolak dengan `Error`.
- Menyusun lapisan demi lapisan (kocokan, partai, pertandingan) yang masing-masing bisa diuji sendiri.
- Menulis tes yang memeriksa aturan di setiap titik riwayat, bukan hanya hasil akhir.

**Berikutnya:** potongan 6, gerbang akhir tahap 1: simulasi 10.000 kocokan untuk memastikan mesin aturan tidak pernah melanggar aturan, ditambah statistik (laju habis, tabrak, bonus, kocok ulang) yang dicatat di dokumen.

---

## 2026-10-25 | Tahap 1, potongan 4: akhir kocokan, markah, bonus

**Tujuan:** mengganti pendeteksi akhir sementara dengan aturan sebenarnya (habis dan tabrak), lalu menghitung markah, bonus, dan pemenang partai.

**Dikerjakan:**
- `src/akhir.js` (baru): `akhirKocokan` (habis atau tabrak) dan `jenisBonus` (double, triplet, quartet).
- `src/markah.js` (baru): `hitungHasil`, `terapkanHasil`, `pemenangPartai`, konstanta `BATAS_MARKAH` dan `BONUS`.
- `src/kocokan.js`: `mainkan` dan `lewat` menolak langkah apa pun setelah kocokan berakhir.
- `src/simulasi.ts`: `akhirSementara` kini hanya bungkus tipis di atas `akhirKocokan`.
- `bantu/skenario.js`: kocokan buatan sendiri untuk pengujian (habis biasa, double, triplet, quartet, tabrak).
- 26 pengujian baru (`test/akhir.test.js`, `test/markah.test.js`). Total 102, semua lulus.
- `demo/potongan-4.js`: satu partai penuh secara acak. `npm run demo` kini menjalankannya; demo lama jadi `demo:3` dan `demo:2`.

**Keputusan:**
- **Aturan markah mengikuti brief bagian 3.** Habis: lawan penutup menerima total sisa titik kedua pemainnya (rekan penutup tidak dihitung) ditambah bonus. Tabrak: tim bertitik lebih banyak menerima totalnya sendiri, tanpa bonus. Contoh quartet di brief (22 + 50 = 72) dijadikan tes.
- **Bonus dibaca dari state akhir**: double dari kedua ujung meja, triplet dari kartu terakhir penutup (balak), quartet bila keduanya. Tidak ada penghitung terpisah yang bisa tidak sinkron.
- **`akhir.js` dan `markah.js` dipisah dari `kocokan.js`.** Brief meminta logika markah dan bonus terpisah dari logika giliran supaya mudah diubah. Nilai bonus hanya ada di `BONUS`.
- **Hasil kocokan membawa `rencanaBerikutnya`.** Pemanggil (nanti pengelola partai) tinggal meneruskannya ke `mulaiDariRencana`, tanpa perlu menghitung ulang siapa pembuka berikutnya.
- **Kocokan yang sudah berakhir menolak langkah.** Ini mencegah AI atau tampilan nanti memainkan kartu setelah kocokan selesai.
- **File pembantu tes ada di `bantu/`, bukan `test/`.** Node menjalankan semua file `.js` di dalam folder `test/` sebagai tes.

**Masalah:**
- Dua tes lama gagal karena aturan baru. Tangan buatannya memberi Utara satu kartu saja, jadi di skenario itu Utara sebenarnya sudah habis. Aturannya benar, datanya yang diperbaiki (Utara diberi 6-6).
- Awalnya fungsi pembantu tes diekspor dari `akhir.test.js` dan diimpor tes lain. Itu membuat tes terhitung dua kali, jadi dipindah ke `bantu/skenario.js`.
- Di komputer pengguna `npm test` sempat menunjukkan 122 tes, bukan 76. Penyebabnya folder `test` lama di luar folder `gaple` (sisa ekstrak zip potongan 2 ke folder yang salah). Setelah folder luar dibersihkan jumlahnya 76.

**Fakta dari 3000 kocokan acak:** berakhir habis sekitar 76%, tabrak 24% (seri 1,6%). Di antara yang habis: double sekitar 12%, triplet 12%, quartet 2%. Satu partai (pemain acak) rata-rata sekitar 6 kocokan, paling pendek 2 dan paling panjang 11 dalam 300 partai.

**Dipelajari:**
- Memisahkan "apa yang terjadi" (akhir.js) dari "apa akibatnya" (markah.js).
- Uji sifat yang menghitung ulang jawaban dengan cara lain, lalu membandingkannya dengan hasil fungsi.
- Cara kerja pencarian file tes `node --test`, dan kenapa file pembantu tidak boleh ada di folder `test/`.

**Berikutnya:** potongan 5 (partai dan pertandingan: poin, bo3 atau bo5, pembuka kocokan pertama tiap partai dari poin, juara).

---

## 2026-10-25 | Tahap 1, potongan 3: aturan pembuka

**Tujuan:** menentukan siapa yang membuka tiap kocokan dan dengan kartu apa, sesuai aturan partai.

**Dikerjakan:**
- `src/pembuka.js` (baru): tiga jenis rencana pembukaan (`poin`, `netral`, `balak`), `rencanaKocokanPertama`, `rencanaKocokanBerikutnya`, `tentukanPembuka`, dan syarat kartu pertama (`SYARAT_BEBAS`, `SYARAT_BALAK`, `syaratKartu`).
- `src/kocokan.js`: `mulaiKocokan` menerima syarat, `mulaiDariRencana` baru, `kartuLegalPemain` baru. State kini menyimpan `syaratPembuka`; `mainkan` dan `lewat` menghormatinya.
- `src/simulasi.ts`: ikut menghormati syarat pembuka, ditambah `mainAcakDariState`.
- `src/engine.js`: kini memuat `NAMA_PEMAIN`, `giliranBerikutnya`, `timPemain`.
- 30 pengujian baru (`test/pembuka.test.js`, `test/kocokan-pembuka.test.js`). Total 76, semua lulus.
- `demo/potongan-3.js`: rantai kocokan dalam satu partai. `npm run demo` kini menjalankannya; demo lama jadi `npm run demo:2`.

**Keputusan:**
- **Pembuka dibuat sebagai "rencana" lalu diputuskan setelah kartu dibagi.** Siapa calon pembuka sudah diketahui dari hasil kocokan sebelumnya, tetapi apakah ia punya balak baru diketahui setelah bagi. Dua langkah ini dipisah supaya masing-masing mudah diuji.
- **Hasil `ulang` mengembalikan calon yang sama.** Pemanggil cukup mengocok lagi dan memakai rencana yang sama.
- **`NAMA_PEMAIN`, `giliranBerikutnya`, `timPemain` pindah ke `engine.js`** untuk menghindari impor melingkar (`pembuka.js` butuh `engine.js`, `kocokan.js` butuh `pembuka.js`). `kocokan.js` meneruskannya lagi, jadi impor lama tidak rusak.
- **Syarat pembuka disimpan di state**, bukan dicek di luar, supaya AI, simulasi, dan tampilan nanti otomatis tidak bisa melanggarnya.

**Masalah:** satu pengujian gagal karena salah di tesnya sendiri (saya menyangka Barat tanpa balak padahal ia memegang 2-2). Tesnya diperbaiki, kodenya tidak berubah.

**Fakta peluang** (dari uji 2000 pembagian acak): calon tanpa balak sekitar 10% (hak pindah), dua pembuka berurutan tanpa balak sekitar 0,3% (kocok ulang).

**Dipelajari:**
- Memecah keputusan menjadi data (rencana) dan fungsi yang menafsirkannya.
- Impor melingkar dan cara menghindarinya.
- Menguji aturan berantai: 200 benih x 10 kocokan, tiap kocokan memakai hasil kocokan sebelumnya.

**Berikutnya:** potongan 4 (deteksi habis dan tabrak yang sebenarnya, markah, bonus double, triplet, quartet).

---

## 2026-10-24 | Tahap 1, potongan 2: meja, kartu legal, main dan lewat

**Tujuan:** membuat meja yang bisa disambung, menentukan kartu mana yang boleh dimainkan, dan menjalankan langkah main dan lewat tanpa pernah melanggar aturan.

**Dikerjakan:**
- `src/meja.js`: `buatMejaKosong`, `sisiLegal`, `kartuLegal`, `adaKartuLegal`, `letakkan`, `teksMeja`.
- `src/kocokan.js`: `mulaiKocokan`, `mainkan`, `lewat`, `giliranBerikutnya`, `timPemain`, `NAMA_PEMAIN`.
- `src/simulasi.ts`: memainkan kocokan acak sampai selesai (untuk pengujian dan demo).
- `demo/potongan-2.js` dan perintah `npm run demo` untuk melihat satu kocokan di terminal.
- 26 pengujian baru, termasuk uji sapu bersih 300 kocokan acak. Total 46 pengujian, semua lulus.

**Keputusan:**
- **Kartu di meja menyimpan arah hadap** (`{kartu, kiri, kanan}`). Kartu 5-2 di sisi kiri tampil sebagai `[5|2]`, bukan `[2|5]`. Dengan ini ujung meja dan kecocokan tiap sambungan bisa diperiksa langsung.
- **Kode dipecah per tugas:** `engine.js` (kartu dan dek), `meja.js` (meja), `kocokan.js` (jalannya kocokan). Di brief hanya ada `engine.js`, tapi satu file akan membengkak seiring markah, bonus, dan pembuka. Struktur di GUIDE sudah menyesuaikan.
- **`mainkan` dan `lewat` melempar `Error` untuk langkah ilegal.** Kesalahan langsung ketahuan di pengujian, bukan diam-diam menghasilkan state yang rusak. Nanti tampilan hanya menampilkan kartu legal, jadi error ini menjadi jaring pengaman.
- **`lewat` ditolak bila masih ada kartu legal**, termasuk di meja kosong (semua kartu legal di sana).
- **Deteksi habis dan tabrak hanya sementara** (`akhirSementara` di `simulasi.ts`). Versi yang sebenarnya ditulis di potongan 4 bersama markah.
- **Pembuka di potongan ini bebas.** Aturan pembuka (kartu sesuai poin, wajib balak) ditulis di potongan 3.

**Masalah:** tidak ada. Satu hal yang saya cek khusus: kartu seperti 5-3 yang disambung ke ujung 3 di kanan harus menghasilkan ujung baru 5. Ada pengujian khusus untuk itu.

**Dipelajari:**
- Fungsi murni yang mengembalikan state baru (tidak mengubah yang lama) dan cara mengujinya dengan `structuredClone`.
- Uji sifat (property test): bukan memeriksa satu contoh, tapi memeriksa hal yang harus selalu benar (jumlah kartu tetap 28, kartu bersebelahan selalu nyambung) pada ratusan kocokan acak.
- Menjalankan skrip lewat `npm run`.

**Berikutnya:** potongan 3 (aturan pembuka: kartu sesuai poin di kocokan pertama partai, wajib balak di kocokan berikutnya, geser ke pemain berikutnya bila tanpa balak, dan kocok ulang bila dua pembuka tanpa balak).

---

## 2026-10-24 | Tahap 1, potongan 1: kerangka proyek, kartu, dek, pengacak

**Tujuan:** menyiapkan dasar mesin aturan: kartu, dek 28 kartu, pengocokan yang bisa diulang, dan pembagian ke 4 pemain.

**Dikerjakan:**
- Kerangka proyek: `package.json`, `.gitignore`, `README.md`, folder `src`, `test`, `docs`.
- `src/rng.js`: pembangkit angka acak berbenih (`buatAcak`, `buatBenihBaru`).
- `src/engine.js`: `buatKartu`, `nilaiKartu`, `adalahBalak`, `buatDek`, `kocok`, `bagi`, serta konstanta permainan.
- 20 pengujian otomatis (`test/rng.test.js`, `test/engine.test.js`). Semua lulus.

**Keputusan:**
- **Pengacak dipisah ke `rng.js`.** Di brief hanya ada `engine.js`, tapi pengacak berdiri sendiri dan dipakai juga oleh AI dan simulasi nanti, jadi dipisah. Struktur di GUIDE sudah menyesuaikan.
- **Kartu disimpan terurut (`a <= b`).** Kartu 3-1 dan 1-3 adalah kartu yang sama, jadi disimpan satu bentuk saja (`1-3`) agar perbandingan dan pencarian tidak keliru.
- **`kocok` mengembalikan salinan.** Dek asli tidak diubah, sesuai aturan fungsi murni.
- **`bagi` menolak dek yang bukan 28 kartu.** Kesalahan ketahuan di awal, bukan menghasilkan tangan yang diam-diam salah.
- **`"type": "module"` di `package.json`** supaya Node membaca file `.js` sebagai ES modules, sama seperti yang akan dipakai browser.

**Masalah:** `npm test` gagal dengan `ENOENT ... package.json` karena folder yang dibuka adalah folder luar hasil ekstrak zip, bukan folder `gaple` di dalamnya. Solusi: `cd gaple` atau buka folder `gaple` yang di dalam lewat File > Open Folder.

**Dipelajari:**
- ES modules (`import` dan `export`).
- Penguji bawaan Node (`node --test`, `node:test`, `node:assert/strict`).
- Fungsi murni dan kenapa benih (seed) membuat acak bisa diulang.
- Algoritma Fisher-Yates untuk mengocok.

**Berikutnya:** potongan 2 (meja, kartu legal, main dan lewat). Sebelum tahap 2 (tampilan), tambahkan unsur brief yang masih kurang: risiko, metrik keberhasilan, glosarium, dan sketsa tampilan.

**Ditunda atas permintaan:** `CLAUDE.md`, `TECHSTACK.md`, `SKILSS.md` (nama file perlu dikonfirmasi), dan `SECURITY.md`. Dibuat saat diminta.
