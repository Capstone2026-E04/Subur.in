# Subur.in Backend

Backend service untuk proyek **Subur.in**.

## Tech Stack

- Node.js
- Express.js
- Supabase (Database)

## Cara menjalankan

1. Install dependencies:
   ```bash
   npm install
   ```
2. Jalankan server:
   ```bash
   npm run dev
   ```

## API Endpoints

Daftar endpoint API yang sudah dibuat dan aktif sejauh ini:

### 1. Health check
* **Endpoint:** `GET /api/health`
* **Deskripsi:** Memeriksa status kesehatan server backend dan koneksi database Supabase secara real-time.
* **Format Response:**
  ```json
  {
    "status": "UP",
    "message": "Server Subur.in-Backend berjalan normal dan terkoneksi ke Supabase!",
    "timestamp": "2026-05-28T12:00:00.000Z"
  }
  ```

### 2. Autentikasi Google (OAuth2)
* **Endpoint:** `POST /api/auth/google`
* **Deskripsi:** Melakukan registrasi atau login pengguna secara otomatis menggunakan Google ID Token, lalu mengembalikan token JWT sesi.
* **Request Body:**
  ```json
  {
    "idToken": "GOOGLE_ID_TOKEN_STRING"
  }
  ```
* **Format Response:**
  ```json
  {
    "success": true,
    "message": "Autentikasi Google berhasil!",
    "data": {
      "token": "JWT_SESSION_TOKEN",
      "user": {
        "id": "USER_UUID",
        "name": "Nama Pengguna",
        "email": "user@gmail.com",
        "avatarUrl": "https://lh3.googleusercontent.com/..."
      }
    }
  }
  ```

### 3. Simulasi fuzzy logic & rekomendasi
* **Endpoint:** `POST /api/recommendations/simulate`
* **Deskripsi:** Menyimulasikan kalkulasi logika fuzzy Mamdani dan menghitung dosis penyiraman air, kapur dolomit, dan sulfur elemental secara dinamis berdasarkan jenis tanaman pada preset polybag prototipe (20x20 cm, media 2 L).
* **Request Body:**
  ```json
  {
    "phValue": 5.5,
    "moistureValue": 50.0,
    "plantIdOrName": "UUID_OR_NAME_PLANT"
  }
  ```
* **Format Response:**
  ```json
  {
    "success": true,
    "message": "Simulasi Fuzzy Logic berhasil dijalankan!",
    "data": {
      "phValue": 5.5,
      "moistureValue": 50,
      "fuzzyIndex": 1,
      "categoryCode": "C5",
      "actionText": "pH media terlalu asam dan media kering. Pertimbangkan dolomit, lalu siram sesuai estimasi volume.",
      "waterAction": "IRRIGATE",
      "phAction": "LIME",
      "phCorrection": { "status": "READY", "reasons": [] },
      "waterVolumeLiter": 0.3,
      "limeDosageGram": 8.45,
      "sulfurDosageGram": 0,
      "reduceWatering": false,
      "_debug": {
        "polybagPresetUsed": "STANDAR",
        "areaM2": 0.03142,
        "volumeLiterUsed": 5,
        "plantUsed": "Pakcoy (Brassica rapa subsp. chinensis)",
        "phTarget": 6.8,
        "nmiTrigger": 60,
        "nmiTarget": 80
      }
    }
  }
  ```

## Dokumentasi lengkap

Dokumentasi arsitektur, referensi API penuh, environment variable, dan konvensi kode ada di [`../docs`](../docs), mulai dari [`docs/api/`](../docs/api) untuk semua endpoint dan [`docs/backend/`](../docs/backend) untuk konvensi coding.

## Author

Capstone2026-E04
