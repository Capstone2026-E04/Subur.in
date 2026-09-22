# ADR-005: Server-Sent Events untuk update sensor live

## Status
Diterima

## Konteks
Dashboard membutuhkan update pH/kelembapan secara live dan push notifikasi per device segera setelah pesan telemetri MQTT baru tiba, tanpa frontend melakukan polling ke REST API dengan timer. Alur data bersifat satu arah (server -> browser saja); frontend tidak pernah perlu mengirim pesan kembali melalui channel yang sama.

## Keputusan
Menggunakan Server-Sent Events (SSE) alih-alih WebSocket. Backend menyimpan daftar object `res` yang terbuka per device di memori ([`sse/sse_manager.js`](../../backend/src/sse/sse_manager.js)) dan menulis chunk `data: ...\n\n` ke semuanya saat subscriber MQTT menerima pembacaan baru atau sebuah notifikasi dibuat. Frontend mengonsumsi ini dengan API native browser `EventSource` di [`useSensorRealtime`](../../frontend/src/hooks/useSensorRealtime.ts), dengan fallback REST (`GET /api/sensors/:id/latest`) saat terjadi error stream dan reconnect otomatis setelah 5 detik.

## Konsekuensi
- Tidak perlu dependensi tambahan atau penanganan upgrade protokol: `EventSource` adalah API native browser dan sisi server hanyalah HTTP biasa dengan header yang tepat (`text/event-stream`, `Cache-Control: no-cache`, `X-Accel-Buffering: no` untuk mengalahkan buffering proxy), yang lebih sederhana untuk dinalar dan di-deploy di belakang reverse proxy standar dibandingkan WebSocket.
- Hanya satu arah: ini tidak masalah untuk use case saat ini (push sensor + push notifikasi), tetapi jika frontend suatu saat perlu mengirim pesan real-time kembali ke server (bukan sekadar request REST), SSE perlu diganti atau dipasangkan dengan channel terpisah.
- Registry client di `sse_manager.js` adalah memori in-process: ini tidak bertahan saat backend restart/redeploy (client melakukan reconnect otomatis melalui retry bawaan `EventSource`, jadi ini hanya jeda singkat, bukan kehilangan data) dan tidak dapat diskalakan lintas beberapa instance backend tanpa layer pub/sub bersama (misalnya Redis pub/sub) jika backend suatu saat diskalakan secara horizontal.
