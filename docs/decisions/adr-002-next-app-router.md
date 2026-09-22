# ADR-002: Next.js App Router dengan route group

## Status
Diterima

## Konteks
Frontend membutuhkan pemisahan yang jelas antara halaman login publik dan dashboard yang membutuhkan autentikasi dengan banyak sub-halaman (devices, plants, recommendations, analytics, notifications, settings, profile), dengan autentikasi yang diterapkan secara konsisten di semua halaman dashboard tanpa mengulang pengecekan di setiap komponen halaman.

## Keputusan
Menggunakan App Router Next.js 16 dengan dua route group: `(auth)` untuk `/login`, dan `(dashboard)` untuk semua halaman `/dashboard/*`. `(dashboard)/layout.tsx` adalah async server component yang memanggil `auth()` milik NextAuth sekali dan melakukan redirect ke `/login` jika tidak ada session; setiap halaman di dalam group ini otomatis mewarisi pengecekan ini.

## Konsekuensi
- Menambahkan halaman terproteksi baru cukup dengan menambahkan `page.tsx` di bawah `(dashboard)/dashboard/`; tidak ada boilerplate auth per halaman.
- Layout juga melakukan fetch server-side terhadap profil user terbaru sebelum rendering, menghindari kedipan loading di sisi client untuk nama/avatar, dengan biaya satu round trip tambahan ke backend setiap navigasi dashboard yang melewati batas layout.
- Route group berarti struktur URL (`/dashboard/...`) tidak mencerminkan pengelompokan folder (`(dashboard)/dashboard/...`): nesting yang sedikit redundan (`(dashboard)/dashboard/`) tetapi menjaga nama group dan segmen path pertama yang sebenarnya tetap berbeda dan disengaja.
