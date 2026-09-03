# Subur.in Backend

Backend service untuk proyek **Subur.in**.

## Tech Stack

- Node.js
- Express.js
- Supabase (Database)

## Cara Menjalankan

1. Install dependencies:
   ```bash
   npm install
   ```
2. Jalankan server:
   ```bash
   npm run dev
   ```

## API Endpoints

Berikut adalah daftar endpoint API yang sudah dibuat dan aktif sejauh ini:

### 1. Health Check
* **Endpoint:** `GET /health`
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

### 3. Simulasi Fuzzy Logic & Rekomendasi
* **Endpoint:** `POST /api/recommendations/simulate`
* **Deskripsi:** Menyimulasikan kalkulasi logika fuzzy Mamdani dan menghitung dosis penyiraman air, kapur dolomit, dan sulfur elemental secara dinamis berdasarkan jenis tanaman dan ukuran polybag yang aktif di database.
* **Request Body:**
  ```json
  {
    "phValue": 5.5,
    "moistureValue": 40.0,
    "polybagPreset": "UUID_OR_NAME_POLYBAG",
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
      "moistureValue": 40,
      "fuzzyIndex": 3.42,
      "categoryCode": "C5",
      "actionText": "pH tanah terlalu asam DAN tanah kering. Tambahkan kapur pertanian (dolomit) sesuai dosis, kemudian lakukan penyiraman sesuai volume yang direkomendasikan.",
      "waterVolumeLiter": 0.864,
      "limeDosageGram": 4.24,
      "sulfurDosageGram": 0,
      "reduceWatering": false,
      "_debug": {
        "inputClamped": { "ph": 5.5, "moisture": 40 },
        "polybagPresetUsed": "STANDAR",
        "areaM2": 0.03142,
        "volumeLiterUsed": 5,
        "plantUsed": "Pakcoy (Brassica rapa L. var. chinensis)",
        "phTarget": 6.5,
        "thetaTarget": 0.7
      }
    }
  }
  ```

## Author

Capstone2026-E04
