# Kasir Warung — PWA Offline-First

Aplikasi kasir digital untuk warung, dibangun dengan React + Vite + Dexie.js.  
Trilingual: Bahasa Indonesia · English · 中文

## Fitur
- Kasir / POS dengan cart, stok otomatis, multi-metode bayar
- Cetak struk thermal via Bluetooth (ESC/POS)
- Laporan harian dengan grafik Recharts
- Manajemen produk (CRUD)
- 100% offline-first via IndexedDB (Dexie.js)
- PWA: bisa diinstall di Android/iOS/Desktop

## Cara Menjalankan

### Prasyarat
- Node.js 18+ dan npm

### Instalasi

```bash
# 1. Masuk ke folder project
cd kasir-warung

# 2. Install dependencies
npm install

# 3. Jalankan development server
npm run dev
```

Buka browser: http://localhost:5173

### Build untuk produksi

```bash
npm run build
npm run preview
```

## Struktur Project

```
kasir-warung/
├── src/
│   ├── db.js                  # Dexie schema + seed data
│   ├── App.jsx                # Root layout + navigation
│   ├── main.jsx               # React entry point
│   ├── index.css              # Global styles
│   ├── i18n/
│   │   └── index.js           # Terjemahan ID / EN / ZH
│   ├── hooks/
│   │   └── useStore.js        # Zustand stores (lang, cart, page)
│   ├── services/
│   │   ├── index.js           # Dexie operations (CRUD, laporan)
│   │   └── printer.js         # Bluetooth ESC/POS printer
│   └── pages/
│       ├── POS.jsx            # Halaman kasir utama
│       ├── Report.jsx         # Laporan harian + grafik
│       └── Products.jsx       # Manajemen produk
├── index.html
├── vite.config.js             # Vite + PWA config
└── package.json
```

## Cetak Struk Bluetooth

1. Pastikan menggunakan **Google Chrome** (Web Bluetooth hanya support Chrome/Edge)
2. Nyalakan printer thermal Bluetooth (GOOJPRT, Xprinter, Epson, dll)
3. Setelah transaksi selesai, klik tombol **Cetak Struk**
4. Pilih printer dari dialog browser
5. Struk tercetak otomatis

> **Catatan:** Web Bluetooth hanya bekerja di HTTPS atau localhost.  
> Untuk deploy, gunakan Vercel / Netlify (otomatis HTTPS).

## Tambah Produk

Buka tab **Produk** → klik **+ Tambah Produk** → isi form → Simpan.  
Perubahan langsung tampil di kasir tanpa reload (berkat `useLiveQuery` Dexie).

## Menambah Bahasa Baru

Edit `src/i18n/index.js` — tambah key bahasa baru di object `LANGS` dan `CATEGORIES`.

## Deploy ke Vercel

```bash
npm run build
npx vercel --prod
```

## Lisensi
MIT — bebas digunakan untuk proyek komersial maupun portofolio.
