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

## Halaman publik (landing dan login)

Halaman `/` dan `/login` mengikuti panduan taste-skill untuk landing page; dashboard sengaja tidak (di luar cakupan panduan tersebut).

- Hero asimetris dengan visual berupa komponen asli (`SensorGaugeCard`, `PhCorrectionStatus`) berisi contoh data dari dokumen C501, bukan gambar tiruan.
- Satu label CTA ("Mulai pantau") untuk satu maksud, tombol minimal 48 px, label tidak boleh membungkus.
- Gerak memakai **GSAP** (`gsap`, `@gsap/react`, plugin ScrollTrigger) lewat satu komponen klien `components/landing/LandingMotion.tsx` yang membungkus `<main>`. Elemen ditandai atribut `data-*`:
  - `data-hero="title|body|actions|preview"`: timeline masuk hero (urutan menegaskan hierarki).
  - `data-reveal`: muncul bertahap saat masuk viewport (`ScrollTrigger.batch`, sekali jalan).
  - `data-steps` / `data-steps-line` / `data-step`: garis progres dan sorotan langkah pada "Cara kerja" mengikuti scroll (`scrub`).
  - `data-count`: angka dihitung naik sekali saat terlihat (konten server tetap berisi angka akhir untuk no-JS).
  - Seluruh animasi berada di `gsap.matchMedia("(prefers-reduced-motion: no-preference)")`; dengan reduced motion, konten statis dan langsung terlihat. Pembersihan otomatis lewat `useGSAP` (scope `<main>`).
- Gunakan GSAP hanya di halaman publik. Dashboard memakai `framer-motion`; jangan mencampur keduanya dalam satu pohon komponen baru.
- Skala radius: tombol `rounded-xl`, kartu `rounded-2xl`. Satu aksen (hijau brand), tanpa tanda pisah em-dash.
- Tema terang saja, mengikuti seluruh aplikasi. Dark mode butuh refaktor token di seluruh dashboard dan belum dikerjakan.
