# State Management

Hampir seluruh state berupa state lokal component/hook ditambah sesi NextAuth. Satu-satunya **global client-side store** adalah Zustand `useSelectedDeviceStore` ([`stores/selectedDeviceStore.ts`](../../frontend/src/stores/selectedDeviceStore.ts)), yang menyimpan perangkat yang dipilih agar dropdown di topbar dan halaman dashboard memakai pilihan yang sama. Sebagian besar state baru sebaiknya tetap mengikuti pola hook di bawah ini.

## Session State

`SessionProvider` dari NextAuth v5 (dipasang di `app/(dashboard)/layout.tsx`) adalah sumber kebenaran (source of truth) untuk state auth. Client component membacanya dengan `useSession()` dari `next-auth/react`, terutama untuk mendapatkan `session.user.backendToken`, JWT yang digunakan untuk memanggil API backend.

Sesi memakai strategi JWT NextAuth: disimpan di cookie terenkripsi (`httpOnly`, `sameSite=lax`, `secure` pada HTTPS) dengan masa berlaku 7 hari (`SESSION_MAX_AGE_SECONDS` di [`lib/auth.ts`](../../frontend/src/lib/auth.ts)), sama dengan JWT backend. Dua provider menghasilkan sesi yang sama: Google (pertukaran `id_token` di callback `signIn`) dan Credentials (`authorize` memanggil `POST /api/auth/login`). Kegagalan Credentials dilempar sebagai subclass `CredentialsSignin` dengan `code` (`invalid_credentials`, `too_many_attempts`, `service_unavailable`) yang dibaca halaman login.

`role` dan `hasPassword` **tidak** disimpan di sesi; keduanya diambil dari `GET /api/users/me` (`lib/backendProfile.ts`) agar selalu segar.

## Hook Data-Fetching

Setiap resource backend yang membutuhkan interaktivitas sisi client mendapatkan hook kecil di `src/hooks/` yang:
1. Membaca `backendToken` melalui `useSession()`.
2. Membungkus fungsi `src/services/*` dengan `useState`/`useCallback`.
3. Mengekspos `{ data, isLoading, error, ...actions }` ke komponen.

| Hook | Mendukung |
|---|---|
| `useDevices` | List/klaim/update/hapus device ([`services/deviceService.ts`](../../frontend/src/services/deviceService.ts)) |
| `useDeviceStatus` | Status online/offline per-device |
| `usePlants` | Daftar referensi tanaman |
| `useSelectedDeviceStore` | Perangkat yang dipilih di topbar, dibagi ke semua halaman dashboard (store Zustand, bukan hook data) |
| `useSensorRealtime` | pH/kelembapan live melalui SSE (`EventSource` terhadap `/api/sensors/:id/stream`), dengan fallback REST (`/latest`) saat stream error dan auto-reconnect setelah 5 detik |

Ini menjaga komponen tetap sederhana (memanggil hook, merender state-nya) tanpa global store; setiap hook memiliki slice server state-nya sendiri dan melakukan fetch ulang/refresh secara independen.

## Menambahkan Server State Baru

Ikuti pola yang sudah ada: tambahkan fungsi ke file `src/services/*.ts` yang relevan (wrapper tipis di sekitar `fetch`/Axios + `API_URL`), lalu tambahkan hook di `src/hooks/` jika sebuah komponen perlu memutasi atau subscribe ke data tersebut. Hanya perkenalkan shared store (Zustand, karena sudah menjadi dependency) jika state benar-benar perlu dibagikan lintas subtree komponen yang tidak berhubungan dan tidak bisa dioper melalui props/hooks, bukan sebagai default.
