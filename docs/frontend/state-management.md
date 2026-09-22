# State Management

Tidak ada **global client-side store** (Zustand tercantum di `package.json` tetapi saat ini tidak digunakan di mana pun dalam `src/`), state berupa state lokal component/hook ditambah sesi NextAuth. Perhatikan hal ini sebelum menggunakan store: sebagian besar state baru sebaiknya mengikuti pola yang sama di bawah ini alih-alih memperkenalkan Zustand.

## Session State

`SessionProvider` dari NextAuth v5 (dipasang di `app/(dashboard)/layout.tsx`) adalah sumber kebenaran (source of truth) untuk state auth. Client component membacanya dengan `useSession()` dari `next-auth/react`, terutama untuk mendapatkan `session.user.backendToken`, JWT yang digunakan untuk memanggil API backend.

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
| `useSensorRealtime` | pH/kelembapan live melalui SSE (`EventSource` terhadap `/api/sensors/:id/stream`), dengan fallback REST (`/latest`) saat stream error dan auto-reconnect setelah 5 detik |

Ini menjaga komponen tetap sederhana (memanggil hook, merender state-nya) tanpa global store; setiap hook memiliki slice server state-nya sendiri dan melakukan fetch ulang/refresh secara independen.

## Menambahkan Server State Baru

Ikuti pola yang sudah ada: tambahkan fungsi ke file `src/services/*.ts` yang relevan (wrapper tipis di sekitar `fetch`/Axios + `API_URL`), lalu tambahkan hook di `src/hooks/` jika sebuah komponen perlu memutasi atau subscribe ke data tersebut. Hanya perkenalkan shared store (Zustand, karena sudah menjadi dependency) jika state benar-benar perlu dibagikan lintas subtree komponen yang tidak berhubungan dan tidak bisa dioper melalui props/hooks, bukan sebagai default.
