# ADR-001: Menggunakan Axios untuk HTTP request

## Status
Diterima

## Konteks
Frontend perlu memanggil backend REST API dari client dan server component, menyertakan Bearer token dan menangani error JSON secara konsisten di banyak service module (`src/services/*`).

## Keputusan
Menggunakan `axios` sebagai HTTP client untuk pemanggilan backend API dari `src/services/*`, alih-alih native `fetch` di setiap call site (native `fetch` tetap digunakan langsung untuk request fallback SSE dan di dalam callback NextAuth, di mana tidak ada manfaat interceptor/config yang berlaku).

## Konsekuensi
- Penanganan request/response yang konsisten (parsing JSON, bentuk error) di seluruh file service tanpa mengulang boilerplate.
- Satu lagi dependensi runtime yang perlu dijaga tetap up to date.
- Ada dua gaya pemanggilan HTTP dalam codebase (`axios` di service, `fetch` mentah di `lib/auth.ts` dan `useSensorRealtime`): ini disengaja di tempat `fetch` memang sudah dibutuhkan (callback NextAuth server-side, fallback yang berdekatan dengan `EventSource`), bukan penyimpangan yang perlu disatukan, tetapi service module baru sebaiknya default menggunakan `axios` demi konsistensi.
