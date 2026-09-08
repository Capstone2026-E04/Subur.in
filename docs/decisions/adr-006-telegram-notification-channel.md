# ADR-006: Telegram as the External Push Channel, Centralized via a Single Dispatch Service

## Status
Accepted

## Context
Notifications (invalid sensor data, dry/wet soil, out-of-range pH) were created by calling `prisma.notification.create` and `broadcastToDevice` (SSE) as a manual pair at every call site — the MQTT subscriber alone had five near-identical copies of this pattern. This duplication made it easy for a new call site to forget one half of the pair, and there was no way to reach a user who wasn't actively looking at the dashboard: the only delivery channel was an SSE stream to an open browser tab plus the in-app notification list, both of which require the user to already be on the site.

A desktop-push option (the browser `Notification` API) existed as a partial alternative, gated behind a per-viewer permission prompt and a `localStorage` preference, but it only worked while the browser was open on that device and required re-granting permission per browser/device.

## Decision
- Add Telegram as the external push channel: users link their Telegram account from the settings page via a one-time 6-character code (`POST /api/users/me/telegram/link-code`, consumed by the bot's `/link <code>` command through a webhook at `POST /api/telegram/webhook`), storing the resulting chat ID on `User.telegramChatId`.
- Centralize all notification creation behind a single `notifyDevice(deviceId, { title, message, type })` function in `src/services/notification.service.js`. It always writes to Postgres and broadcasts over SSE, and additionally sends a Telegram message when the device's owner has linked their account. Every existing call site (MQTT subscriber, the notification test endpoint) was migrated to call this instead of the manual create+broadcast pair.
- Remove the desktop browser-push option entirely (`Notification.requestPermission()` / `new Notification(...)` and its settings toggle) — Telegram covers the "reach the user when they're not looking at the dashboard" need without the per-browser permission friction, so maintaining both was redundant.
- `telegramService.sendMessage` never throws; a failed Telegram API call is logged and swallowed so a user who hasn't linked Telegram (or whose bot call fails) still gets the database + SSE notification exactly as before.

## Consequences
- Adding a new kind of notification anywhere in the backend is now one `notifyDevice(...)` call instead of remembering to pair a Prisma write with an SSE broadcast — and it gets Telegram delivery for free.
- The app depends on the Telegram Bot API being reachable for that one channel; because `sendMessage` is fire-and-forget with respect to the rest of the flow, a Telegram outage degrades to "database + SSE only," not a broken notification pipeline.
- Users without a linked Telegram account get no push at all outside the dashboard — there's no other out-of-band channel (email, native mobile push) yet. Revisit if that gap matters for the target users.
- The webhook endpoint is intentionally unauthenticated (Telegram itself has no way to send a bearer token) and always returns `200`; correctness there is enforced by validating the `telegramLinkCode` lookup, not by request auth.
