# Changelog

Reverse-chronological summary of notable changes. See `git log` for full history.

## 2026-09-08

- **fix(layout):** Dashboard root container was `flex` (row) with no responsive breakpoint, so on mobile the hamburger bar and main content panel sat side by side instead of stacked; switched to `flex-col md:flex-row`. Also fixed sub-44px touch targets on the mobile sidebar's hamburger/close buttons and prevented long user names from overflowing the topbar.
- **feat(ux):** Redesigned the landing and login pages to match the rest of the app's visual identity instead of being unstyled placeholders; added a friendly error message on failed Google sign-in; fixed literal `**text**` rendering unbolded on the dashboard/recommendations/analytics pages; removed internal jargon ("Fuzzy Logic", "Treatment", "jalankan seeder database") from user-facing copy.
- **fix(telegram):** `sendMessage` no longer forces `parse_mode: "Markdown"` on every message — the bot's static replies (e.g. `/link KODE_ANDA`) contain an unescaped `_`, which broke Telegram's legacy Markdown parser and made every reply, including `/start`, fail with "can't parse entities."
- **feat(notifications)!:** Removed the desktop browser-push notification option (`Notification.requestPermission()`/`new Notification(...)` and its settings toggle) — Telegram is now the only channel for reaching a user who isn't on the dashboard. See [ADR-006](decisions/adr-006-telegram-notification-channel.md).
- **feat(notifications):** Added Telegram as a notification channel — account linking via a one-time code (`POST /api/users/me/telegram/link-code`, `POST /api/telegram/webhook`), and centralized all notification creation behind `notifyDevice()` in a new `notification.service.js`, replacing duplicated `prisma.notification.create` + `broadcastToDevice` pairs across the codebase ([api/telegram.md](api/telegram.md), [ADR-006](decisions/adr-006-telegram-notification-channel.md)).
- **fix(recommendation):** Removed an undocumented cap on lime/dolomite dosage that didn't match the fuzzy model spec (only sulfur dosage has a documented upper bound); removed dead duplicate constants from `fuzzy_parameters.js` and unused per-plant moisture parameters that were never actually read.
- **ci(deploy):** Backend and frontend deploy workflows now share a concurrency group so they can't run against the shared VPS at the same time, and the VPS deploy script fails the job on any error instead of continuing silently.
- **refactor(redis):** Migrated the Redis client from Upstash to a self-hosted `ioredis` instance.
- **refactor(plants):** Soil moisture target is now a single static value shared by all plants instead of a per-plant field, matching how the fuzzy model was actually designed.
- **fix(auth):** `AUTH_URL` is now resolved from `AUTH_URL_DEV`/`AUTH_URL_PROD` per environment instead of a single value that only worked in one of dev/prod.
- **feat(dashboard):** Migrated dashboard UI to shadcn/ui-style `Card` and a collapsible sidebar (`components/ui/`), replacing hand-rolled card/sidebar markup on most dashboard pages.

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
