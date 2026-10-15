# Routing

Next.js 16 App Router dengan dua route group yang memisahkan area publik dan area terproteksi.

## Route Groups

| Group | Prefix Path | Auth Layout |
|---|---|---|
| `(auth)` | `/login`, `/register` | Publik; `layout.tsx` mengarahkan user yang sudah login ke `/dashboard` |
| `(dashboard)` | `/dashboard/*` | Ditegakkan di sisi server dalam `layout.tsx` |

```mermaid
flowchart TD
    Root["/"] --> Login["/login, /register (auth) group"]
    Root --> Dashboard["/dashboard (dashboard) group"]
    Dashboard --> Overview["/dashboard"]
    Dashboard --> Devices["/dashboard/devices"]
    Dashboard --> Plants["/dashboard/plants"]
    Dashboard --> Recommendations["/dashboard/recommendations"]
    Dashboard --> Analytics["/dashboard/analytics"]
    Dashboard --> Notifications["/dashboard/notifications"]
    Dashboard --> Settings["/dashboard/settings"]
    Dashboard --> DevMode["/dashboard/dev-mode"]
    Dashboard --> Superadmin["/dashboard/superadmin (SUPERADMIN only)"]
    Dashboard --> Profile["/dashboard/profile (hidden from nav)"]
```

## Halaman

| Route | File | Catatan |
|---|---|---|
| `/login` | `app/(auth)/login/page.tsx` | Form email + password (`signIn("credentials", { redirect: false })`) dan tombol Google (`signIn("google")`); pesan galat dipetakan dari `result.code` (`invalid_credentials`, `too_many_attempts`, `service_unavailable`) |
| `/register` | `app/(auth)/register/page.tsx` | Form nama, email, password, konfirmasi; memanggil `POST /api/auth/register` lalu masuk otomatis lewat Credentials provider |
| `/dashboard` | `app/(dashboard)/dashboard/page.tsx` | Overview |
| `/dashboard/devices` | `.../devices/page.tsx` | Daftar/klaim/kelola device |
| `/dashboard/plants` | `.../plants/page.tsx` | Penelusuran referensi tanaman |
| `/dashboard/recommendations` | `.../recommendations/page.tsx` | Riwayat rekomendasi/simulasi |
| `/dashboard/analytics` | `.../analytics/page.tsx` | Chart atas riwayat sensor |
| `/dashboard/notifications` | `.../notifications/page.tsx` | Kotak masuk notifikasi |
| `/dashboard/settings` | `.../settings/page.tsx` | Pengaturan aplikasi/akun |
| `/dashboard/profile` | `.../profile/page.tsx` | Edit profil dan, bila `hasPassword` false, form buat password; dapat diakses tetapi disembunyikan dari nav (`hidden: true` di `navConfig.ts`) |
| `/dashboard/dev-mode` | `.../dev-mode/page.tsx` | Menyalakan simulasi telemetri |
| `/dashboard/superadmin` | `.../superadmin/page.tsx` | Grafik sensor semua perangkat dan tabel seluruh data; hanya `SUPERADMIN` (lihat di bawah) |
| `/api/nextauth/[...nextauth]` | `app/api/nextauth/[...nextauth]/route.ts` | Handler catch-all NextAuth v5 |

## Penegakan Autentikasi

`app/(dashboard)/layout.tsx` adalah **async server component** yang memanggil `auth()` (NextAuth) pada setiap request ke route `/dashboard/*` dan melakukan `redirect("/login")` jika tidak ada sesi, dan menjadi satu-satunya titik penegakan (enforcement); halaman dashboard individual tidak perlu memiliki pemeriksaan auth sendiri. Layout ini juga secara aktif mengambil profil pengguna terbaru dari backend (`GET /api/users/me`) untuk menghindari tampilnya nama/avatar yang usang dari JWT.

## Akses Superadmin

Menu "Superadmin" (`superadminOnly: true` di `navConfig.ts`) hanya dirender `Sidebar` bila `role === "SUPERADMIN"`; `role` datang dari `GET /api/users/me` yang diambil layout (`lib/backendProfile.ts`), bukan dari sesi. Halaman `/dashboard/superadmin` memanggil `requireSuperadmin()` ([`lib/requireSuperadmin.ts`](../../frontend/src/lib/requireSuperadmin.ts)) di server pada setiap render halaman: tanpa sesi diarahkan ke `/login`, bukan `SUPERADMIN` (atau profil gagal dimuat) ke `/dashboard`. Pemeriksaan ditaruh di halaman, bukan di layout, karena layout tidak dirender ulang pada setiap navigasi klien. Data tetap dilindungi API (`403`), jadi melewati UI tidak memberi akses ([ADR-010](../decisions/adr-010-superadmin-role.md)).

Menambahkan halaman dashboard baru: buat `app/(dashboard)/dashboard/<route>/page.tsx` dan tambahkan entri ke [`navConfig.ts`](../../frontend/src/components/dashboard/navConfig.ts); pemeriksaan auth pada layout otomatis berlaku karena halaman tersebut berada di dalam group `(dashboard)`.
