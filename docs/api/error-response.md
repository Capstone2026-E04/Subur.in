# Error Response Format

Every endpoint returns JSON with a consistent `success` envelope. There is no global error-handling middleware — each controller catches its own errors and shapes the response, so the shape below is a convention, not enforced framework-wide.

## Envelope

**Success:**
```json
{
  "success": true,
  "message": "Daftar device Anda berhasil diambil.",
  "data": {}
}
```

**Error:**
```json
{
  "success": false,
  "message": "Device tidak ditemukan atau Anda tidak memiliki akses.",
  "error": "optional lower-level error detail, present on 5xx and some 4xx"
}
```

- `message` is a human-readable string (in Indonesian, matching the rest of the API) safe to show to end users.
- `error` is only included on some responses and may leak internal error messages (e.g. Prisma/driver errors on 500s) — treat it as debug information, not something to render directly in the UI.

## Status Codes

| Code | Meaning | Example |
|---|---|---|
| `200` | Success | Resource fetched/updated/deleted |
| `201` | Created | Device registered, test notification created |
| `400` | Bad request / validation failure | Missing required field, value out of range |
| `401` | Unauthenticated | Missing/invalid `Authorization` header, invalid Google ID token, expired JWT |
| `404` | Not found / not owned by caller | Device, notification, or user not found for the authenticated user |
| `500` | Unhandled server error | Database error, unexpected exception |

## Authorization vs. Not Found

Resource-scoped endpoints (devices, notifications) intentionally return `404` rather than `403` when a resource exists but belongs to a different user — this avoids confirming a resource ID exists to a caller who doesn't own it. See [`device.controller.js`](../../backend/src/controllers/device.controller.js) `updateDevice`/`deleteDevice` for the pattern (`findFirst({ where: { id, userId } })`).
