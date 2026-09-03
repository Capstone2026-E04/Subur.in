# Subur.in Frontend

Aplikasi frontend client (web monitoring) untuk proyek **Subur.in** (Platform Monitoring & Rekomendasi Tanaman Pintar).

## Tech Stack

- **Framework:** Next.js (App Router, Turbopack)
- **UI & Styling:** Tailwind CSS v4 & React Icons
- **Autentikasi:** NextAuth.js v5 (Google OAuth2 & Backend Session Sync)
- **State Management:** Zustand
- **Visualisasi Data:** Recharts
- **HTTP Client:** Axios

## Fitur Utama

- **Dashboard Elegan & Responsif:** Monitoring data tanaman secara real-time dengan widget statistik yang reusable (StatCard, Sidebar, Topbar).
- **Desain Organik Modern:** Menggunakan palet warna premium bertema alam (hijau botani, krem lembut `#FBF5DD`, dan font *Stack Sans Text*) dikonfigurasi langsung via Tailwind CSS v4 `@theme`.
- **Integrasi Google Sign-In & Backend Session:** Sesi autentikasi aman yang sinkron secara langsung dengan JWT token dari backend.
- **Port Pengembangan Dinamis:** Server pengembangan otomatis berjalan menyesuaikan nilai `PORT` di berkas `.env.local`.

## Cara Menjalankan

### 1. Instalasi Dependensi

```bash
npm install
```

### 2. Menjalankan Server Pengembangan

```bash
npm run dev
```

*Server otomatis mendeteksi konfigurasi `PORT` dari `.env.local` (default berjalan di port `5000`).*

### 3. Menjalankan Pemeriksaan Kode (Linting)

```bash
npm run lint
```

## Struktur Proyek & Reusability

Komponen halaman dashboard dibuat modular dan fleksibel:
- **`src/components/dashboard/navConfig.ts`**: Cukup edit konfigurasi array di berkas ini untuk menambah menu/halaman baru pada Sidebar dan Topbar secara otomatis.
- **`src/components/dashboard/Sidebar.tsx`**: Navigasi sidebar dinamis yang mendeteksi rute aktif.
- **`src/components/dashboard/StatCard.tsx`**: Widget kartu indikator (kelembaban, suhu, jumlah tanaman) yang reusable.

## Dokumentasi Lengkap

Design system, struktur routing, dan pola state management ada di [`../docs/frontend/`](../docs/frontend); untuk kontrak API backend lihat [`../docs/api/`](../docs/api).

## Author

Capstone2026-E04
