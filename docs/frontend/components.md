# Components

Semua yang ada di `src/components` menggunakan styling Tailwind, diorganisasikan berdasarkan scope, bukan berdasarkan tier atomic-design, dengan lapisan primitive tipis bergaya shadcn/ui di bawah `components/ui/`.

## `components/ui/`

Primitive lokal bergaya shadcn/ui (bukan diinstal dari registry, dibuat manual dengan `class-variance-authority` untuk variants), digunakan berulang kali di seluruh halaman dashboard:

| Component | Tujuan |
|---|---|
| `card.tsx` | Primitive `Card` / `CardHeader` / `CardContent` / `CardFooter` / `CardTitle` dengan variant `default`/`accent` (sudut `rounded-3xl`, border netral), digunakan sebagai basis untuk hampir semua panel dashboard |
| `sidebar.tsx` | Primitive sidebar desktop yang dapat di-collapse + drawer mobile slide-in (`Sidebar`, `SidebarBody`, `SidebarLink`, `useSidebar`), digunakan oleh `components/dashboard/Sidebar.tsx` |

## `components/common/`

File stub lama (`Header.tsx`, `Sidebar.tsx`, `LoadingSpinner.tsx`) peninggalan sebelum struktur `components/dashboard/` + `components/ui/` diterapkan. Ketiganya saat ini kosong dan tidak di-import di mana pun. Chrome dashboard yang sebenarnya berada di `components/dashboard/Sidebar.tsx` / `Topbar.tsx` di atas `components/ui/sidebar.tsx`. Aman untuk dihapus pada pembersihan berikutnya; tidak dihapus di sini agar dokumentasi ini tetap fokus pada dokumentasi saja.

## `components/dashboard/`

Widget khusus dashboard, sebagian besar digerakkan oleh [`navConfig.ts`](../../frontend/src/components/dashboard/navConfig.ts) atau hook sensor/device:

| Component | Tujuan |
|---|---|
| `Sidebar.tsx` / `MobileNavigation.tsx` / `Topbar.tsx` | Chrome navigasi dashboard. Sidebar (desktop) dan MobileNavigation (drawer `<dialog>`, di bawah `md`) merender `visibleNavItems(role)` dari `navConfig.ts` |
| `RecommendationSummaryCard.tsx` | Kartu "Rekomendasi Hari Ini": judul aksi, teks rekomendasi, dan tile treatment (air, kapur, sulfur) yang hanya muncul bila dosisnya > 0; tile menautkan ke `ApplicationGuide`, dan waktu pembaruan terakhir; menangani status memuat dan belum ada data |
| `PhLevelCard.tsx` | Bar gradasi pH 0-14 dengan penanda nilai dan lencana klasifikasi (`classifyPh`) |
| `MoistureLevelCard.tsx` | Gauge setengah lingkaran kelembapan dengan jarum dan lencana klasifikasi (`classifyNmi`) |
| `SensorTrendCard.tsx` | Grafik garis rata-rata (pH atau kelembapan) dari riwayat sensor dengan dua dropdown: granularitas (per menit, 10 menit, jam, hari) dan jumlah data terakhir (5, 10, 20, 30; default 10), serta tooltip nilai; pembacaan realtime ikut ditambahkan oleh halaman |
| `sensorStatus.ts` | `classifyPh`, `classifyNmi`, `TONES`, `formatTimestamp`, dan rentang pH bawaan; dipakai kartu-kartu di atas |
| `SensorGaugeCard.tsx` | Gauge melingkar untuk satu nilai sensor; saat ini hanya dipakai pratinjau landing page (`HeroPreview`) |
| `SensorHistoryChart.tsx` | Time series berbasis Recharts untuk riwayat sensor (`GET /api/sensors/:id/history`) |
| `LiveLocationTracker.tsx` | Indikator status yang diperbarui secara live, digerakkan oleh `useSensorRealtime`/`useDeviceStatus` |
| `EditNameForm.tsx` | Form inline untuk mengedit nama tampilan pengguna (`PATCH /api/users/me`) |
| `CreatePasswordForm.tsx` | Dua input (password baru dan konfirmasi) untuk membuat password pada akun yang belum punya (`POST /api/users/me/password`); hanya dirender di profil bila `hasPassword` false |

## `components/devices/`

UI manajemen device, semuanya didukung oleh [`useDevices`](../../frontend/src/hooks/useDevices.ts):

| Component | Tujuan |
|---|---|
| `DeviceCard.tsx` | Satu baris tabel "Daftar Perangkat": nama, status, tanaman, terakhir aktif, tombol Edit dan Hapus |
| `ConnectDeviceModal.tsx` | Alur klaim untuk device yang baru ditemukan (`POST /api/devices`) |
| `EditDeviceModal.tsx` | Edit label/plant/interval (`PATCH /api/devices/:id`); opsi interval sama dengan modal tambah (1 menit-12 jam) |
| `DeleteConfirmDialog.tsx` | Dialog konfirmasi hapus generik, digunakan ulang untuk penghapusan device |

## `components/auth/`

| Component | Tujuan |
|---|---|
| `AuthShell.tsx` | Tata letak dua kolom untuk `/login` dan `/register`: panel merek hijau (pesan utama dan tiga manfaat) di kiri, form di kanan; panel kiri disembunyikan di bawah `lg` dan diganti logo ringkas. Animasi masuk GSAP (`useGSAP` + `matchMedia`, hormat reduced-motion) lewat atribut `data-auth-brand` dan anak langsung `data-auth-form` |
| `AuthInput.tsx` | Input berlabel (label di atas, tinggi minimal 44 px, ring fokus) untuk form autentikasi dan form password |

## `components/superadmin/`

| Component | Tujuan |
|---|---|
| `SuperadminPanel.tsx` | Halaman Superadmin: tab per tabel dengan jumlah baris, pencarian (debounce 400 ms), filter per tab, filter perangkat, rentang tanggal, tombol Reset, header kolom yang dapat diurutkan (naik, turun, bawaan), dan paginasi. Sort, filter, dan pencarian dijalankan di server ([api/superadmin.md](../api/superadmin.md)) |
| `SuperadminSensorCharts.tsx` | Pemilih perangkat (semua user) dan dua grafik pH dan kelembapan dari 100 pembacaan terakhir |
| `superadminTabs.ts` | Konfigurasi tab: kolom, format sel, kolom yang dapat diurutkan, dan filter per resource |

### `src/components/recommendations/`

| Component | Tujuan |
|---|---|
| `PhCorrectionStatus.tsx` | Banner status safety gate koreksi pH (`READY`, `DEFERRED`, `NEEDS_CONFIRMATION`) beserta alasannya; tidak dirender bila `NONE` |
| `ApplicationGuide.tsx` | Panduan penerapan air (`#panduan-air`) dan koreksi pH (`#panduan-ph`) berdasarkan rekomendasi aktif; kartu ringkasan di dashboard menautkan ke anchor ini dan halaman men-scroll ke sana |
| `CorrectionPanel.tsx` | Form pencatatan koreksi dolomit/sulfur (`POST /api/devices/:id/corrections`), status periode tunggu 14 hari, dan riwayat koreksi (`GET`) |

## Konvensi

- Tambahkan entri navigasi dengan mengedit `navConfig.ts`; Sidebar dan Topbar dirender dari array tersebut secara otomatis tanpa perlu wiring route per-komponen. Set `hidden: true` untuk route yang harus dapat diakses tetapi tidak ditampilkan di nav (misalnya `/dashboard/profile`), dan `superadminOnly: true` untuk item yang hanya boleh muncul bagi `SUPERADMIN` (disaring oleh `visibleNavItems(role)` di `navConfig.ts`, dipakai Sidebar dan MobileNavigation, berdasarkan `role` dari backend; ini hanya kenyamanan UI, penegakan ada di server dan API).
- Komponen yang membutuhkan data backend live melakukan fetch melalui `src/services/*` (wrapper Axios/fetch), bukan pemanggilan `fetch()` inline, lihat [state-management.md](state-management.md).
- Semua komponen dashboard mengasumsikan sesi NextAuth yang sudah terautentikasi; komponen tersebut dirender di bawah layout route group `(dashboard)`, yang merupakan titik penegakan (enforcement) untuk autentikasi (lihat [routing.md](routing.md)).
