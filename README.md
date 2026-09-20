# KasHar

Aplikasi pengelola keuangan pribadi berbasis **PWA** (Progressive Web App). 100% berjalan di browser — tanpa server, tanpa backend, tanpa database eksternal. Seluruh data tersimpan aman di perangkat Anda melalui **IndexedDB**.

![Tech](https://img.shields.io/badge/stack-HTML%20%C2%B7%20CSS%20%C2%B7%20Vanilla%20JS%20%C2%B7%20IndexedDB%20%C2%B7%20PWA-0d9488)

## Features

- **Dashboard** — saldo total, pemasukan & pengeluaran bulan ini, grafik 6 bulan terakhir, quick action
- **Pemasukan** — dengan kategori (Gaji, Bonus, Bisnis, Freelance, Hadiah, dll)
- **Pengeluaran** — 10+ kategori bawaan, kategori bisa ditambah/diedit/dihapus
- **Transfer** — antar dompet, tidak dihitung sebagai pemasukan/pengeluaran
- **Wallet** — banyak sumber dana (Cash, DANA, GoPay, rekening bank, dll), saldo otomatis
- **Budget** — anggaran per kategori per bulan dengan progress bar & indikator hampir habis
- **Target tabungan** — target finansial dengan deadline, progress, dan tambah dana
- **Utang/piutang** — catat saya berutang & orang berutang, tandai lunas
- **Laporan** — filter hari/minggu/bulan/tahun/custom, grafik, per kategori, transaksi terbesar
- **Riwayat transaksi** — search, filter kategori/tipe/dompet/tanggal, sort, edit, hapus
- **Dark mode** — tersimpan otomatis
- **Backup & restore** — export/import seluruh data ke file JSON
- **Offline support** — Service Worker + cache, tetap jalan tanpa internet
- **PWA** — bisa di-*Add to Home Screen* (iPhone & Android), splash screen, icon mandiri
- **Privasi** — data tidak pernah meninggalkan perangkat, tanpa analytics pihak ketiga

## Tech Stack

| Komponen | Teknologi |
|---|---|
| UI | HTML5, CSS3 (CSS variables, dark mode) |
| Logika | JavaScript Vanilla (tanpa framework) |
| Database | IndexedDB (`KasHarDB`) |
| PWA | Web App Manifest + Service Worker |
| Hosting | GitHub Pages (static) |

## Struktur Folder

```
kashar/
├── index.html
├── manifest.json
├── sw.js
├── README.md
├── assets/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── app.js
│   │   ├── db.js
│   │   ├── transactions.js
│   │   ├── wallets.js
│   │   ├── budgets.js
│   │   ├── goals.js
│   │   ├── debts.js
│   │   ├── reports.js
│   │   └── utils.js
│   └── icons/
└── .nojekyll
```

> Catatan: aplikasi ini adalah SPA (Single Page Application) dengan hash routing, sehingga semua halaman (Home, Transaksi, Laporan, Target, Utang, Akun) dilayani oleh `index.html` — lebih aman dan cepat untuk GitHub Pages. File `.nojekyll` disertakan agar GitHub tidak memproses folder lewat Jekyll.

## Deployment (GitHub Pages)

1. Buat repository baru di GitHub, misalnya `kashar`
2. Upload seluruh isi folder project ke repository (via web upload atau `git push`)
3. Buka tab **Settings** → **Pages**
4. Pada **Source**, pilih branch `main` dan folder `/(root)`
5. Klik **Save**
6. Tunggu 1–2 menit hingga GitHub Pages aktif

Aplikasi akan tersedia di:

```
https://USERNAME.github.io/kashar/
```

> Semua path di aplikasi bersifat **relatif** (`./`), jadi aplikasi tetap berjalan benar meskipun tidak berada di root domain.

## Instalasi di iPhone (Add to Home Screen)

1. Buka URL KasHar di Safari
2. Tekan tombol **Share** (kotak dengan panah ke atas)
3. Pilih **Add to Home Screen**
4. Tekan **Add** — KasHar kini tampil seperti aplikasi native dengan splash screen sendiri

## Backup & Restore

- **Export Data**: menu Akun → *Export Data* → file `kashar-backup-YYYY-MM-DD.json` terunduh
- **Import Data**: menu Akun → *Import Data* → pilih file backup JSON → seluruh data dipulihkan
- **Reset Semua Data**: menu Akun → *Reset Data* → konfirmasi dua kali

## Keamanan & Privasi

- Tidak ada data yang dikirim ke server mana pun
- Tidak ada API eksternal untuk data transaksi
- Tidak ada API key / tracking / analytics
- Data hanya tersimpan di IndexedDB perangkat Anda

## Lisensi

MIT — bebas digunakan dan dikembangkan.
