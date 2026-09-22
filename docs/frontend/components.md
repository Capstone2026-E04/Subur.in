# Components

Semua yang ada di `src/components` menggunakan styling Tailwind, diorganisasikan berdasarkan scope, bukan berdasarkan tier atomic-design, dengan lapisan primitive tipis bergaya shadcn/ui di bawah `components/ui/`.

## `components/ui/`

Primitive lokal bergaya shadcn/ui (bukan diinstal dari registry, dibuat manual dengan `class-variance-authority` untuk variants), digunakan berulang kali di seluruh halaman dashboard:

| Component | Tujuan |
|---|---|
| `card.tsx` | Primitive `Card` / `CardHeader` / `CardContent` / `CardFooter` / `CardTitle` dengan variant `default`/`accent`, digunakan sebagai basis untuk hampir semua panel dashboard |
| `sidebar.tsx` | Primitive sidebar desktop yang dapat di-collapse + drawer mobile slide-in (`Sidebar`, `SidebarBody`, `SidebarLink`, `useSidebar`), digunakan oleh `components/dashboard/Sidebar.tsx` |

## `components/common/`

File stub lama (`Header.tsx`, `Sidebar.tsx`, `LoadingSpinner.tsx`) peninggalan sebelum struktur `components/dashboard/` + `components/ui/` diterapkan. Ketiganya saat ini kosong dan tidak di-import di mana pun. Chrome dashboard yang sebenarnya berada di `components/dashboard/Sidebar.tsx` / `Topbar.tsx` di atas `components/ui/sidebar.tsx`. Aman untuk dihapus pada pembersihan berikutnya; tidak dihapus di sini agar dokumentasi ini tetap fokus pada dokumentasi saja.

## `components/dashboard/`

Widget khusus dashboard, sebagian besar digerakkan oleh [`navConfig.ts`](../../frontend/src/components/dashboard/navConfig.ts) atau hook sensor/device:

| Component | Tujuan |
|---|---|
| `Sidebar.tsx` / `Topbar.tsx` | Chrome navigasi dashboard, dirender dari `NAV_ITEMS` di `navConfig.ts` |
| `StatCard.tsx` | Tile stat/metrik yang dapat digunakan ulang (misalnya jumlah device, sensor aktif) |
| `SensorGaugeCard.tsx` | Tampilan gaya gauge untuk satu nilai sensor live (pH atau kelembapan) |
| `SensorHistoryChart.tsx` | Time series berbasis Recharts untuk riwayat sensor (`GET /api/sensors/:id/history`) |
| `SensorMonitorPanel.tsx` | Menggabungkan gauge + chart + status live untuk satu device |
| `LiveLocationTracker.tsx` | Indikator status yang diperbarui secara live, digerakkan oleh `useSensorRealtime`/`useDeviceStatus` |
| `EditNameForm.tsx` | Form inline untuk mengedit nama tampilan pengguna (`PATCH /api/users/me`) |

## `components/devices/`

UI manajemen device, semuanya didukung oleh [`useDevices`](../../frontend/src/hooks/useDevices.ts):

| Component | Tujuan |
|---|---|
| `DeviceCard.tsx` | Kartu ringkasan untuk satu device terdaftar |
| `ConnectDeviceModal.tsx` | Alur klaim untuk device yang baru ditemukan (`POST /api/devices`) |
| `EditDeviceModal.tsx` | Edit label/plant/polybag/interval (`PATCH /api/devices/:id`) |
| `DeleteConfirmDialog.tsx` | Dialog konfirmasi hapus generik, digunakan ulang untuk penghapusan device |

## Konvensi

- Tambahkan entri navigasi dengan mengedit `navConfig.ts`; Sidebar dan Topbar dirender dari array tersebut secara otomatis tanpa perlu wiring route per-komponen. Set `hidden: true` untuk route yang harus dapat diakses tetapi tidak ditampilkan di nav (misalnya `/dashboard/profile`).
- Komponen yang membutuhkan data backend live melakukan fetch melalui `src/services/*` (wrapper Axios/fetch), bukan pemanggilan `fetch()` inline, lihat [state-management.md](state-management.md).
- Semua komponen dashboard mengasumsikan sesi NextAuth yang sudah terautentikasi; komponen tersebut dirender di bawah layout route group `(dashboard)`, yang merupakan titik penegakan (enforcement) untuk autentikasi (lihat [routing.md](routing.md)).
