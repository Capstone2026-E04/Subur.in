# Installation

## Prasyarat

- Node.js 18+ dan npm
- Database PostgreSQL (project ini menargetkan Supabase di produksi, tetapi Postgres apa pun bisa digunakan secara lokal)
- Instance Redis (self-hosted `redis-server` di produksi; Redis lokal apa pun bisa digunakan untuk development)
- Broker MQTT yang dapat diakses melalui TLS (project ini menargetkan EMQX Cloud)
- Google Cloud OAuth 2.0 Client ID (Web application) untuk Google Sign-In

## 1. Clone

```bash
git clone https://github.com/Capstone2026-E04/Subur.in.git
cd Subur.in
```

## 2. Backend

```bash
cd backend
npm install
cp .env.example .env    # isi nilainya, lihat setup/environment.md
npx prisma generate
npx prisma db push       # atau: npx prisma migrate dev, lihat database/migration.md
npm run db:seed          # seed data plants + polybag types
npm run dev              # nodemon, http://localhost:3000
```

## 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # isi nilainya, lihat setup/environment.md
npm run dev                  # http://localhost:3001 (atau PORT dari .env.local)
```

## 4. Verifikasi

- Backend: `GET http://localhost:3000/api/health` seharusnya mengembalikan `{"status":"UP", ...}`.
- Backend: `GET http://localhost:3000/api` menampilkan daftar semua endpoint yang tersedia.
- Frontend: buka URL dev server, Anda seharusnya diarahkan ke `/login`; sign in dengan Google seharusnya menyinkronkan sesi dengan backend.

## Menjalankan Keduanya dengan Docker Compose

[`docker-compose.yml`](../../docker-compose.yml) di root repo adalah file compose **produksi**: file ini menarik image prebuilt dari GHCR alih-alih membangun dari source, dan ditujukan untuk VPS deployment, bukan development lokal. Untuk development lokal, jalankan setiap aplikasi dengan `npm run dev` seperti di atas. Lihat [deployment.md](deployment.md) untuk cara image dibangun dan dikirim.
