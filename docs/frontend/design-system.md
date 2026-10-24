# Design System

Didefinisikan melalui directive `@theme` Tailwind CSS v4 di [`src/app/globals.css`](../../frontend/src/app/globals.css). Tidak ada file design-token terpisah atau objek config, Tailwind v4 membaca theme langsung dari CSS.

## Palet Warna

| Token | Nilai | Penggunaan |
|---|---|---|
| `--color-primary` | `#0D530E` | Hijau brand utama: tombol, nav aktif, heading |
| `--color-primary-light` | `#306D29` | Hijau sekunder/hover |
| `--color-background` | `#FBF5DD` | Background aplikasi (krem lembut) |
| Teks body | `#1c2d1b` | Diset langsung pada `body`, bukan theme token |

Digunakan sebagai utility Tailwind: `bg-primary`, `text-primary-light`, `bg-background`, dsb.

## Tipografi

| Token | Nilai |
|---|---|
| `--font-sans` | `var(--font-stack-sans), sans-serif` (Stack Sans Text dimuat lewat `next/font/google` di `layout.tsx`, bukan lagi `@import` CSS) |
| `--font-size-xs` | `0.85rem` |
| `--font-size-sm` | `0.95rem` |
| `--font-size-base` | `1.05rem` |

Ukuran font dasar sengaja dinaikkan sedikit di atas default Tailwind `1rem` demi keterbacaan pada tampilan data dashboard.

## Utility

- `.scrollbar-hide`: menyembunyikan scrollbar lintas-browser (digunakan pada baris widget yang dapat di-scroll secara horizontal) sambil tetap mempertahankan fungsi scroll.

## Konvensi

- Sebagian besar UI dibuat manual dengan utility class Tailwind langsung di file `.tsx`. Sekumpulan kecil primitive bergaya shadcn/ui berada di [`src/components/ui/`](../../frontend/src/components/ui/) (`card.tsx`, `sidebar.tsx`), dibangun dengan `class-variance-authority` untuk variants (bukan diambil dari package), dan halaman-halaman menggabungkan komponen tersebut alih-alih membuat markup card/sidebar secara manual. Lihat [components.md](components.md#componentsui).
- Ikon berasal dari `react-icons` (terutama set `md`, Material Design), bukan icon set kustom.
- Simpan warna/font baru sebagai `@theme` token di `globals.css` alih-alih hardcode nilai hex di komponen, agar palet tetap dapat diedit secara terpusat.

## Dashboard

Mengikuti desain Figma untuk halaman Ringkasan dan Perangkat; halaman lain memakai bahasa visual yang sama lewat komponen bersama.

- Latar `bg-neutral-100` (dipasang di `(dashboard)/layout.tsx`), kartu putih `rounded-3xl` dengan border `neutral-200`, judul `neutral-900`. Palet krem `--color-background` hanya untuk halaman publik.
- Sidebar desktop (`md` ke atas) hijau `primary` selebar 256 px; item aktif `bg-white/15`, ikon dan teks putih, tombol keluar `bg-white/5`. Di bawah `md` navigasi berupa drawer `MobileNavigation` (elemen `<dialog>`) yang dibuka dari tombol menu di Topbar.
- Warna: abu-abu memakai skala `neutral-*` (bukan `gray`/`slate`), hijau hanya lewat token `primary`/`primary-light` (tanpa `emerald`/`violet` atau hex hardcode). Warna `sky`, `orange`, `amber`, dan `rose` dipertahankan hanya untuk makna status (air/basa, kering, peringatan, galat).
- Topbar `h-18` dengan breadcrumb, dropdown perangkat (state bersama lewat Zustand), lonceng, dan nama user.
- Aksesibilitas: ikon sidebar punya `aria-label` dan `title` (nama tampil di tooltip saat menciut), nav berlabel "Menu utama", dropdown perangkat dan lonceng minimal 44 px, ring fokus global (`:focus-visible`), semua gerak mati pada `prefers-reduced-motion`.
- Gerak: `DashboardMotion.tsx` (GSAP) memunculkan elemen `data-reveal` secara bertahap dan mengamati elemen yang ditambahkan belakangan; sidebar dan beberapa kartu memakai `framer-motion`.

## Halaman autentikasi (`/login`, `/register`)

Dibangun dengan `components/auth/AuthShell` (lihat [components.md](components.md#componentsauth)): panel merek hijau di kiri, form di kanan dengan latar `neutral-100`, tombol utama hijau `primary`, tombol Google putih berborder. Satu aksen, input dan tombol `rounded-xl`, label di atas input, galat inline dengan `role="alert"`. Animasi masuk GSAP bertahap, mati pada reduced motion. Tidak ada foto di panel merek; slot gambar belum diisi.

## Halaman publik (landing)

Halaman `/` mengikuti panduan taste-skill untuk landing page; dashboard sengaja tidak (di luar cakupan panduan tersebut).

- Hero asimetris dengan visual berupa komponen asli (`SensorGaugeCard`, `PhCorrectionStatus`) berisi contoh data dari dokumen C501, bukan gambar tiruan.
- Satu label CTA ("Mulai pantau") untuk satu maksud, tombol minimal 48 px, label tidak boleh membungkus.
- Gerak memakai **GSAP** (`gsap`, `@gsap/react`, plugin ScrollTrigger) lewat satu komponen klien `components/landing/LandingMotion.tsx` yang membungkus `<main>`. Elemen ditandai atribut `data-*`:
  - `data-hero="title|body|actions|preview"`: timeline masuk hero (urutan menegaskan hierarki).
  - `data-reveal`: muncul bertahap saat masuk viewport (`ScrollTrigger.batch`, sekali jalan).
  - `data-steps` / `data-steps-line` / `data-step`: garis progres dan sorotan langkah pada "Cara kerja" mengikuti scroll (`scrub`).
  - `data-count`: angka dihitung naik sekali saat terlihat (konten server tetap berisi angka akhir untuk no-JS).
  - Seluruh animasi berada di `gsap.matchMedia("(prefers-reduced-motion: no-preference)")`; dengan reduced motion, konten statis dan langsung terlihat. Pembersihan otomatis lewat `useGSAP` (scope `<main>`).
- GSAP dipakai di landing, `AuthShell`, dan `DashboardMotion`. `framer-motion` dipakai di sidebar dan beberapa kartu dashboard. Jangan mencampur keduanya dalam satu komponen yang sama.
- Skala radius landing: tombol `rounded-xl`, kartu `rounded-2xl`. Dashboard dan autentikasi: tombol dan input `rounded-xl`, kartu `rounded-3xl`. Satu aksen (hijau brand), tanpa tanda pisah em-dash.
- Tema terang saja, mengikuti seluruh aplikasi. Dark mode butuh refaktor token di seluruh dashboard dan belum dikerjakan.
