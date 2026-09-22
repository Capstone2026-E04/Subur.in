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
| `--font-sans` | `"Stack Sans Text", sans-serif` (dimuat melalui import Google Fonts, weight 200-700) |
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
