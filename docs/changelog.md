# Changelog

Reverse-chronological summary of notable changes. See `git log` for full history.

## 2026-09-03

- **fix(auth):** Aligned the frontend `SessionProvider`'s `basePath` with the server-side NextAuth config (`/api/nextauth`), fixing session desync after the earlier `basePath` move.
- **fix(auth):** Backend now trusts the reverse proxy's forwarded host header so NextAuth resolves the correct origin when deployed behind a reverse proxy.
- **chore(env):** Production API URL updated to `suburin.duckdns.org`.

## Earlier

- **feat(api):** Health check mounted under `/api/health`; added Prometheus metrics at `/api/metrics` ([backend/logging.md](backend/logging.md)).
- **chore(env):** Frontend default dev `PORT` changed to `3001`.
- **ci(deploy):** Backend deploy workflow now runs `prisma db push` automatically after every deploy ([setup/deployment.md](setup/deployment.md)).
- **fix:** Moved NextAuth's `basePath` to `/api/nextauth` to avoid path collision with the backend's own `/api` prefix when both are proxied from the same origin.
- **fix:** Frontend Docker build now reads `.env.local` in `docker-compose.yml` instead of `.env`.
- **chore:** Initial Docker-based deployment pipeline set up (GHCR + VPS via GitHub Actions).
