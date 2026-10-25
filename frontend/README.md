# Subur.in Frontend

Aplikasi frontend client (web monitoring) untuk proyek **Subur.in** (Platform Monitoring & Rekomendasi Tanaman Pintar).

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack) + TypeScript
- **UI & Styling:** Tailwind CSS v4, Lucide dan React Icons, Framer Motion dan GSAP untuk animasi
- **Autentikasi:** NextAuth.js v5 (Google OAuth2 dan sinkronisasi sesi JWT backend)
- **State Management:** Zustand
- **Visualisasi Data:** Recharts
- **HTTP Client:** Axios

## Fitur utama

- **Dashboard responsif:** monitoring sensor real-time (pH, kelembapan sebagai % CC dengan VWC pendamping, suhu) lewat SSE, serta grafik tren dengan rentang 3, 7, 14, dan 30 hari.
- **Rekomendasi perawatan:** hasil fuzzy logic dari backend (dosis air, kapur, sulfur), panduan aplikasi, dan panel koreksi pH.
- **Manajemen perangkat dan tanaman:** hubungkan, ubah, dan hapus perangkat; pilih perangkat aktif di seluruh dashboard.
- **Notifikasi dan Telegram:** daftar notifikasi serta penghubungan akun ke bot Telegram dari halaman pengaturan.
- **Panel superadmin dan dev mode:** halaman khusus role tertentu, disaring lewat `visibleNavItems(role)`.
- **Autentikasi:** login/registrasi email dan password, serta Google Sign-In.
- **Desain organik:** palet bertema alam (hijau botani, krem `#FBF5DD`, font *Stack Sans Text*) yang dikonfigurasi lewat Tailwind CSS v4 `@theme` di `globals.css`.

## Cara menjalankan

1. Install dependensi:
   ```bash
   npm install
   ```
2. Salin `.env.example` menjadi `.env.local` dan isi nilainya (lihat [`../docs/setup/environment.md`](../docs/setup/environment.md)).
3. Jalankan server pengembangan:
   ```bash
   npm run dev
   ```
   Port mengikuti `PORT` di `.env.local`. Backend diharapkan berjalan di URL `NEXT_PUBLIC_API_URL_DEV`.

### Script

| Perintah               | Fungsi                              |
| ---------------------- | ----------------------------------- |
| `npm run dev`          | Server pengembangan                 |
| `npm run build`        | Build produksi                      |
| `npm start`            | Menjalankan hasil build             |
| `npm run lint`         | Pemeriksaan kode (ESLint)           |
| `npm run format`       | Format kode dengan Prettier         |
| `npm run format:check` | Cek format tanpa mengubah berkas    |

## Struktur proyek

| Folder                    | Isi                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------- |
| `src/app/(auth)/`         | Halaman `login` dan `register`                                                        |
| `src/app/(dashboard)/dashboard/` | `page` (ringkasan), `analytics`, `devices`, `plants`, `recommendations`, `notifications`, `profile`, `settings`, `dev-mode`, `superadmin` |
| `src/app/api/nextauth/`   | Route handler NextAuth                                                                |
| `src/components/`         | Komponen per fitur: `dashboard`, `devices`, `recommendations`, `superadmin`, `auth`, `landing`, `ui` |
| `src/hooks/`              | `useDevices`, `usePlants`, `useSensorRealtime`                                        |
| `src/services/`           | Client Axios per resource (`api.ts` sebagai instance dasar)                           |
| `src/stores/`             | Store Zustand (perangkat terpilih)                                                    |
| `src/lib/`                | Konfigurasi NextAuth, helper profil backend, guard superadmin, util                   |

Menu baru cukup ditambahkan di **`src/components/dashboard/navConfig.ts`**; `Sidebar.tsx` (desktop) dan `MobileNavigation.tsx` (mobile) akan menampilkannya otomatis sesuai role.

## Docker

`Dockerfile` membangun image produksi yang meng-expose port `3000`. Konfigurasi deploy ada di [`../docker-compose.yml`](../docker-compose.yml).

## Dokumentasi lengkap

Design system, struktur routing, komponen, dan pola state management ada di [`../docs/frontend/`](../docs/frontend); untuk kontrak API backend lihat [`../docs/api/`](../docs/api).

## Author

Capstone2026-E04
