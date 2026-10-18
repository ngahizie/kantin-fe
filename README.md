# Kantin Cashless - Frontend (kantin-fe)

Aplikasi antarmuka web untuk sistem transaksi non-tunai kantin sekolah berbasis kartu RFID. Aplikasi ini berkomunikasi dengan backend pencatatan transaksi (`kantin-be`) dan layanan otentikasi identitas staf (`admin-be`).

---

## Modul Antarmuka

Aplikasi menggunakan arsitektur antarmuka ganda berbasis TanStack Router:

1. **Terminal Kasir POS (`/kasir`)**
   - Layar penuh (*kiosk mode*) yang dioptimalkan untuk kecepatan pelayanan antrean transaksi tap kartu RFID siswa.
   - Terintegrasi dengan pemindai RFID hardware USB, indikator audio beeper transaksi, pencegahan mutasi ganda (*idempotency key*), pembatalan (*void*), dan rekapitulasi sesi kasir.

2. **Backoffice Pengelola (`/`)**
   - Panel manajemen terpusat dengan navigasi berbasis peran pengguna (*Role-Based Access Control*).
   - Mencakup dashboard analitik penjualan, manajemen menu dan kategori, pemantauan stok fisik dan kartu stok, kontrol batasan belanja siswa, refund saldo, rekapitulasi laporan keuangan (ekspor Excel), dan pengaturan titik kasir.

---

## Stack Teknologi

| Komponen | Teknologi | Keterangan |
|---|---|---|
| Runtime & Bahasa | React 19, TypeScript 6.0 | Antarmuka komponen reaktif dengan pengetikan statis |
| Bundler & Tooling | Vite 8, PNPM | Server pengembangan lokal dan pembungkus bundel produksi |
| Styling | Tailwind CSS v4 | Utilitas tata letak dan tema |
| Routing | @tanstack/react-router | Router berbasis berkas bertipe ketat (*type-safe*) |
| State Management | Zustand | Manajemen state global (keranjang kasir, auth, pengaturan) |
| Server State & Caching | @tanstack/react-query | Pengambilan data asynchronous dan sinkronisasi cache server |
| Komponen UI | Radix UI, shadcn/ui, Lucide Icons | Primitif antarmuka aksesibel dan ikon standar |
| Visualisasi Data | Recharts | Komponen grafik statistik dan tren penjualan |
| Form & Validasi | React Hook Form, Zod | Pengelolaan formulir dan validasi skema data |
| HTTP Client | Axios | Klien HTTP terpusat dengan interceptor JWT token |
| Ekspor Data | xlsx | Generator berkas laporan spreadsheet Excel |
| Testing & Kualitas | Vitest, Playwright, ESLint, Knip | Pengujian unit/integrasi browser headless dan audit kode |

---

## Struktur Direktori

```text
kantin-fe/
├── public/                 # Aset statis publik (logo.png)
├── src/
│   ├── components/         # Komponen UI bersama (shadcn/ui, layout shell, dialog)
│   ├── config/             # Konfigurasi tema dan navigasi
│   ├── context/            # Penyedia konteks React (tema, layout)
│   ├── features/           # Modul fitur (kasir, dashboard, katalog, stok, laporan, dll.)
│   ├── hooks/              # Custom hooks (RFID scanner, audio beep, online status)
│   ├── layouts/            # Shell tata letak aplikasi (KasirLayout)
│   ├── lib/                # Klien API Axios terpusat, format data, ekspor Excel
│   ├── mocks/              # Mock data dan adapter untuk pengujian lokal mandiri
│   ├── routes/             # Definisi rute berbasis berkas TanStack Router
│   ├── stores/             # State global Zustand (cart, auth, rbac, pengaturan)
│   ├── styles/             # Berkas CSS global Tailwind v4
│   ├── test-utils/         # Utilitas pendukung lingkungan pengujian
│   ├── main.tsx            # Titik masuk utama aplikasi React
│   └── routeTree.gen.ts    # Pohon rute terkompilasi otomatis
├── .env.example            # Template variabel lingkungan
├── components.json         # Konfigurasi resmi shadcn/ui CLI
├── eslint.config.js        # Konfigurasi linter kode ESLint
├── index.html              # Titik masuk utama dokumen HTML
├── knip.config.ts          # Konfigurasi audit kode mati (Knip)
├── package.json            # Manifest pustaka dan skrip perintah proyek
├── pnpm-lock.yaml          # Berkas pengunci versi eksak dependensi
├── pnpm-workspace.yaml     # Kebijakan izin kompilasi dependensi pnpm
├── tsconfig.json           # Konfigurasi induk TypeScript
└── vite.config.ts          # Konfigurasi bundler Vite dan Vitest
```

---

## Prasyarat Sistem

- Node.js versi 20.x LTS atau lebih baru
- Package manager pnpm versi 9.x atau 10.x

---

## Instalasi dan Menjalankan Proyek

1. Kloning repositori dan buka direktori proyek:
   ```bash
   git clone https://github.com/ngahizie/kantin-fe.git
   cd kantin-fe
   ```

2. Pasang dependensi:
   ```bash
   pnpm install
   ```

3. Siapkan berkas variabel lingkungan:
   ```bash
   cp .env.example .env
   ```

4. Jalankan server pengembangan lokal:
   ```bash
   pnpm run dev
   ```
   Aplikasi dapat diakses melalui `http://localhost:5173`.

---

## Konfigurasi Variabel Lingkungan

Konfigurasi lingkungan didefinisikan pada berkas `.env`:

| Variabel | Tipe | Wajib | Nilai Standar | Keterangan |
|---|---|---|---|---|
| `VITE_API_URL` | String | Ya | `http://localhost:8082` | Endpoint API server backend transaksi kantin-be |
| `VITE_ADMIN_BE_URL` | String | Ya | `http://localhost:8081` | Endpoint API autentikasi staf admin-be |
| `VITE_USE_MOCK` | Boolean | Ya | `false` | Status aktivasi mock layer API lokal |
| `VITE_APP_NAME` | String | Tidak | `Kantin Cashless` | Nama aplikasi pada judul antarmuka |

---

## Perintah Pengembangan

| Perintah | Deskripsi |
|---|---|
| `pnpm run dev` | Menjalankan server pengembangan lokal dengan Hot Module Replacement |
| `pnpm run build` | Menjalankan validasi tipe TypeScript (`tsc -b`) dan kompilasi produksi ke folder `dist` |
| `pnpm run preview` | Menjalankan preview lokal dari hasil kompilasi produksi di folder `dist` |
| `pnpm test` | Menjalankan seluruh pengujian unit dan integrasi dengan Vitest (Chromium headless) |
| `pnpm run lint` | Menjalankan ESLint untuk memeriksa kualitas kode dan standar arsitektur |
| `pnpm run knip` | Menjalankan audit untuk mendeteksi berkas, ekspor, dan dependensi yang tidak terpakai |
