# Alur API

## Request REST terautentikasi

Sebagian besar endpoint memerlukan JWT yang diterbitkan oleh `POST /api/auth/login`, `POST /api/auth/register`, atau `POST /api/auth/google`, dikirim sebagai `Authorization: Bearer <token>` dan diverifikasi oleh [`auth.middleware.js`](../../backend/src/middlewares/auth.middleware.js).

```mermaid
sequenceDiagram
    participant Client
    participant Route
    participant AuthMiddleware
    participant Controller
    participant Prisma
    participant DB

    Client->>Route: GET /api/devices (Authorization: Bearer <jwt>)
    Route->>AuthMiddleware: verify JWT
    alt token missing/invalid
        AuthMiddleware-->>Client: 401 Unauthorized
    else token valid
        AuthMiddleware->>Controller: next() with req.user
        Controller->>Prisma: device.findMany({ where: { userId } })
        Prisma->>DB: SQL query
        DB-->>Prisma: rows
        Prisma-->>Controller: devices
        Controller-->>Client: 200 { success, data: { devices } }
    end
```

## Google Sign-In

```mermaid
sequenceDiagram
    participant Browser
    participant NextAuth as Frontend NextAuth
    participant Backend
    participant Google
    participant DB

    Browser->>NextAuth: Sign in with Google
    NextAuth->>Google: OAuth consent + id_token
    Google-->>NextAuth: id_token
    NextAuth->>Backend: POST /api/auth/google { idToken }
    Backend->>Google: verifyIdToken(idToken)
    Google-->>Backend: payload (sub, email, name, picture)
    Backend->>DB: find/create User by googleId
    DB-->>Backend: user
    Backend-->>NextAuth: { token (JWT, 7d), user }
    NextAuth-->>Browser: session with backendToken
```

## Registrasi dan login email + password

```mermaid
sequenceDiagram
    participant Browser
    participant NextAuth as Frontend NextAuth
    participant Backend
    participant DB

    Browser->>Backend: POST /api/auth/register { name, email, password }
    Backend->>DB: cari email, buat User (passwordHash scrypt, tanpa avatar)
    Backend-->>Browser: 201 { token, user }
    Browser->>NextAuth: signIn("credentials", { email, password })
    NextAuth->>Backend: POST /api/auth/login
    Backend->>DB: cari user, verifikasi hash
    alt gagal
        Backend-->>NextAuth: 401 atau 429
        NextAuth-->>Browser: error code (invalid_credentials / too_many_attempts)
    else berhasil
        Backend-->>NextAuth: { token (JWT, 7d), user }
        NextAuth-->>Browser: cookie sesi httpOnly berisi backendToken
    end
```

Jika user yang mendaftar dengan email + password kemudian memakai Google dengan email yang sama, `POST /api/auth/google` menautkan `googleId` ke akun itu, mengisi avatar dari Google bila kosong, dan menghapus password lama ([ADR-009](../decisions/adr-009-email-password-auth.md)).

## Request Superadmin

```mermaid
sequenceDiagram
    participant Client
    participant AuthMiddleware
    participant SuperadminMiddleware
    participant Controller
    participant DB

    Client->>AuthMiddleware: GET /api/superadmin/users (Bearer jwt)
    AuthMiddleware->>SuperadminMiddleware: next() dengan req.user
    SuperadminMiddleware->>DB: select role where id = req.user.id
    alt bukan SUPERADMIN
        SuperadminMiddleware-->>Client: 403
    else SUPERADMIN
        SuperadminMiddleware->>Controller: next()
        Controller->>DB: findMany + count (where, orderBy dari daftar putih)
        Controller-->>Client: 200 { data: { items }, meta }
    end
```

## Telemetri perangkat (MQTT -> DB/Cache -> SSE)

```mermaid
sequenceDiagram
    participant Device
    participant Broker as MQTT Broker
    participant Subscriber as sensor_subscriber.js
    participant Redis
    participant Postgres
    participant SSE as sse_manager
    participant Dashboard

    Device->>Broker: publish suburin/devices/{id}/telemetry { ph, moisture }
    Broker->>Subscriber: message
    Subscriber->>Subscriber: validate ph (0-14), moisture (0-100)
    alt invalid payload
        Subscriber->>Postgres: create Notification (throttled 1h via Redis lock)
    else valid payload
        Subscriber->>Redis: pushSensorExport (buffer ekspor CSV, tanpa throttle)
        Subscriber->>Redis: setLatestSensorData(deviceId, {ph, moisture})
        Subscriber->>Postgres: saveRawSensorLog (throttled by SENSOR_THROTTLE_SECONDS)
        Subscriber->>Postgres: updateDeviceLastSeen
        Subscriber->>SSE: broadcastToDevice(deviceId, reading)
        SSE-->>Dashboard: text/event-stream update
    end
```

### Antrean offline ESP32 (record bernomor + ACK)

Pesan yang membawa `record_id` (bilangan bulat) mengikuti jalur berbeda. Pesan tanpa `record_id` (firmware lama, Dev Mode) tetap memakai alur di atas.

```mermaid
sequenceDiagram
    participant Device as ESP32 (antrean)
    participant Broker as MQTT Broker
    participant Subscriber as sensor_subscriber.js
    participant Postgres
    participant Redis

    Device->>Broker: telemetry { record_id, measured_at, ph, moisture }
    Broker->>Subscriber: message
    Subscriber->>Postgres: createMany skipDuplicates UNIQUE(device_id, record_id, timestamp)
    Subscriber->>Postgres: updateDeviceLastSeen
    Subscriber->>Broker: publish suburin/devices/{id}/ack "record_id" (QoS 1, retain=false)
    Broker->>Device: ack, record dihapus dari antrean
    alt record baru dan lebih muda dari 2 x sensorInterval
        Subscriber->>Redis: pushSensorExport + setLatestSensorData
        Subscriber->>Subscriber: rekomendasi, notifikasi, SSE (seperti alur live)
    else duplikat atau data lama
        Subscriber-->>Subscriber: selesai (tidak ada pemrosesan live)
    end
```

Tanpa ACK, ESP32 mengirim ulang record tertua tiap 30 detik. `measured_at = null` berarti jam belum sinkron NTP (`time_synced=false`). Detail keputusan: [ADR-011](../decisions/adr-011-offline-queue-ack-and-export-buffer.md).

### Ekspor CSV

`GET /api/sensors/:deviceId/export.csv` otorisasi lewat `EXPORT_API_KEY` atau JWT pemilik, memetakan `deviceId` ke `deviceCode` di Postgres, lalu membaca list Redis `sensor:export:<deviceCode>` (bukan tabel `raw_sensor_logs`), menyaring `from`/`to`, mengurutkan menurut waktu, dan membalas `text/csv`.

## Pembuatan rekomendasi

```mermaid
sequenceDiagram
    participant Client
    participant Controller as device.controller.js
    participant Redis
    participant Postgres
    participant Engine as ai/services/recommendation.service.js

    Client->>Controller: GET /api/devices/:id/recommendation
    Controller->>Redis: getLatestSensorData(id)
    alt cache miss
        Controller->>Postgres: getLatestSensorLog(id)
    end
    alt umur data > 2 x sensorInterval
        Controller-->>Client: 200 { data: null }
    end
    Controller->>Engine: generateRecommendation({ph, moisture, plantId, deviceId})
    Engine->>Postgres: load Plant + koreksi terakhir (CorrectionLog)
    Engine->>Engine: runInference (fuzzify -> rules -> MIN-MAX -> aksi)
    Engine->>Engine: calculate water/lime/sulfur dosage
    Engine-->>Controller: recommendation
    Controller-->>Client: 200 { data: recommendation }
```

Endpoint ini read-only: tidak menulis ke database. `recommendation_logs` hanya ditulis oleh subscriber MQTT (`mqtt/subscribers/sensor_subscriber.js`) untuk setiap pesan sensor yang valid.

Lihat [error-response.md](../api/error-response.md) untuk format error bersama dan [authentication.md](../api/authentication.md) untuk detail token.
