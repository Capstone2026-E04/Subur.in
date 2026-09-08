# Telegram API

Handles the Telegram Bot webhook and the account-linking flow. See [ADR-006](../decisions/adr-006-telegram-notification-channel.md) for why Telegram is the sole external push channel, and [backend/authentication.md](../backend/authentication.md) for how `POST /api/users/me/telegram/link-code` and `DELETE /api/users/me/telegram` fit into the authenticated user endpoints (documented alongside profile in [users.md](users.md)).

## `POST /api/telegram/webhook`

**No `Authorization` header** — this endpoint is called by Telegram's servers, not the frontend. Receives a Telegram [`Update`](https://core.telegram.org/bots/api#update) object.

**Request body (from Telegram):**
```json
{
  "message": {
    "chat": { "id": 123456789 },
    "text": "/link ABC123"
  }
}
```

**Behavior:**

| Message text | Action |
|---|---|
| `/start` | Replies with a short welcome message explaining how to get a link code from the Subur.in settings page. |
| `/link <CODE>` | Looks up a `User` by `telegramLinkCode`. If found, sets that user's `telegramChatId` to the sender's chat ID and clears `telegramLinkCode` (one-time use), then replies with a confirmation. If not found, replies that the code is invalid or expired. |
| Anything else | Replies with a short help message. |

**Response:** Always `200` with an empty body, regardless of outcome — Telegram retries indefinitely on any non-200 response, and a failure here (bad code, DB error) is communicated back to the user via a chat reply, not an HTTP error.

## `POST /api/users/me/telegram/link-code`

Requires `Authorization: Bearer <jwt>`. Generates a 6-character alphanumeric code, stores it on the caller's `telegramLinkCode`, and returns it for display in the UI.

**Success response `200`:**
```json
{
  "success": true,
  "message": "Kode penghubung Telegram berhasil dibuat.",
  "data": { "linkCode": "AB12CD" }
}
```

## `DELETE /api/users/me/telegram`

Requires `Authorization: Bearer <jwt>`. Clears both `telegramChatId` and `telegramLinkCode` on the caller's account, disconnecting Telegram notifications.

**Success response `200`:**
```json
{ "success": true, "message": "Koneksi Telegram berhasil diputuskan." }
```

## Notes

- `sendMessage` in [`services/telegram.service.js`](../../backend/src/services/telegram.service.js) never throws — a failed Telegram API call is logged and swallowed so it can never break the database/SSE side of [`notifyDevice`](../../backend/src/services/notification.service.js).
- Only `notifyDevice`'s notification-title messages are sent with `parse_mode: "Markdown"`; webhook replies are sent as plain text on purpose, since they may contain a user-typed code with unescaped Markdown special characters (see the [changelog](../changelog.md)).
