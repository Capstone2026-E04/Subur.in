# Users API

All endpoints require `Authorization: Bearer <jwt>` (see [authentication.md](authentication.md)) and operate on the authenticated caller's own account (`req.user.id`).

## `GET /api/users/me`

Returns the authenticated user's profile.

**Success response `200`:**
```json
{
  "success": true,
  "message": "Data profil berhasil diambil.",
  "data": {
    "user": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "name": "Budi Santoso",
      "email": "budi@gmail.com",
      "avatarUrl": "https://lh3.googleusercontent.com/a/AC...",
      "createdAt": "2026-01-10T08:00:00.000Z",
      "updatedAt": "2026-01-10T08:00:00.000Z"
    }
  }
}
```

**Error responses:** `401` (no/invalid token), `404` (user no longer exists), `500`.

## `PATCH /api/users/me`

Updates `name` and/or `avatarUrl`. At least one field is required.

**Request body:**
```json
{
  "name": "Budi Santoso Jaya",
  "avatarUrl": "https://lh3.googleusercontent.com/a/AC..."
}
```

**Validation:**
- At least one of `name`/`avatarUrl` must be present.
- `name` must be a non-empty string, max 100 characters.

**Success response `200`:**
```json
{
  "success": true,
  "message": "Profil berhasil diperbarui.",
  "data": {
    "user": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "name": "Budi Santoso Jaya",
      "email": "budi@gmail.com",
      "avatarUrl": "https://lh3.googleusercontent.com/a/AC...",
      "updatedAt": "2026-02-01T09:00:00.000Z"
    }
  }
}
```

**Error responses:** `400` (no fields / invalid name), `401`, `500`.

## `DELETE /api/users/me`

Permanently deletes the authenticated user's account. Cascades to their devices, which cascades to those devices' recommendation logs and notifications (see [database-schema.md](../architecture/database-schema.md)).

**Success response `200`:**
```json
{
  "success": true,
  "message": "Akun berhasil dihapus secara permanen."
}
```

**Error responses:** `401`, `404`, `500`.
