# ADR-006: Telegram sebagai channel push eksternal, disentralisasi melalui satu dispatch service

## Status
Diterima

## Konteks
Notifikasi (data sensor tidak valid, tanah kering/basah, pH di luar rentang) dibuat dengan memanggil `prisma.notification.create` dan `broadcastToDevice` (SSE) sebagai pasangan manual di setiap call site: subscriber MQTT saja memiliki lima salinan pola ini yang hampir identik. Duplikasi ini membuat call site baru mudah lupa salah satu bagian dari pasangan tersebut, dan tidak ada cara untuk menjangkau user yang tidak sedang aktif melihat dashboard: satu-satunya channel pengiriman adalah stream SSE ke tab browser yang terbuka ditambah daftar notifikasi in-app, yang keduanya mengharuskan user sudah berada di situs.

Opsi push desktop (API `Notification` browser) ada sebagai alternatif parsial, dibatasi di balik prompt izin per-viewer dan preferensi `localStorage`, tetapi hanya berfungsi selama browser terbuka di device tersebut dan mengharuskan pemberian izin ulang per browser/device.

## Keputusan
- Menambahkan Telegram sebagai channel push eksternal: user menautkan akun Telegram mereka dari halaman settings melalui kode 6 karakter sekali pakai (`POST /api/users/me/telegram/link-code`, dikonsumsi oleh perintah `/link <code>` milik bot melalui webhook di `POST /api/telegram/webhook`), menyimpan chat ID yang dihasilkan pada `User.telegramChatId`.
- Mensentralisasi semua pembuatan notifikasi di balik satu fungsi `notifyDevice(deviceId, { title, message, type })` di `src/services/notification.service.js`. Fungsi ini selalu menulis ke Postgres dan melakukan broadcast melalui SSE, dan tambahan mengirim pesan Telegram ketika pemilik device telah menautkan akunnya. Setiap call site yang ada (subscriber MQTT, endpoint test notifikasi) dimigrasikan untuk memanggil ini alih-alih pasangan create+broadcast manual.
- Menghapus sepenuhnya opsi push browser desktop (`Notification.requestPermission()` / `new Notification(...)` dan toggle settings-nya): Telegram mencakup kebutuhan "menjangkau user saat mereka tidak sedang melihat dashboard" tanpa friksi izin per-browser, sehingga mempertahankan keduanya menjadi redundan.
- `telegramService.sendMessage` tidak pernah melempar error; pemanggilan API Telegram yang gagal dicatat dan ditelan sehingga user yang belum menautkan Telegram (atau yang pemanggilan bot-nya gagal) tetap mendapatkan notifikasi database + SSE persis seperti sebelumnya.

## Konsekuensi
- Menambahkan jenis notifikasi baru di mana pun di backend sekarang hanya satu pemanggilan `notifyDevice(...)` alih-alih harus mengingat untuk memasangkan penulisan Prisma dengan broadcast SSE, dan otomatis mendapatkan pengiriman Telegram.
- Aplikasi bergantung pada Telegram Bot API yang dapat dijangkau untuk channel tersebut; karena `sendMessage` bersifat fire-and-forget terhadap sisa alur, gangguan Telegram akan terdegradasi menjadi "database + SSE saja," bukan pipeline notifikasi yang rusak.
- User tanpa akun Telegram yang tertaut tidak mendapat push sama sekali di luar dashboard. Belum ada channel out-of-band lain (email, push mobile native). Tinjau ulang jika celah ini penting bagi target pengguna.
- Endpoint webhook sengaja dibiarkan tanpa autentikasi (Telegram sendiri tidak memiliki cara untuk mengirim bearer token) dan selalu mengembalikan `200`; kebenaran di sana ditegakkan dengan memvalidasi lookup `telegramLinkCode`, bukan dengan autentikasi request.
