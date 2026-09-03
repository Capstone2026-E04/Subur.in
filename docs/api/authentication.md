# Authentication API

Subur.in uses Google Sign-In only — there is no email/password flow. The frontend performs the Google OAuth handshake via NextAuth, then exchanges the Google ID token for a backend-issued JWT. See [backend/authentication.md](../backend/authentication.md) for implementation detail and [architecture/api-flow.md](../architecture/api-flow.md) for the full sequence diagram.

## `POST /api/auth/google`

Verifies a Google ID token, finds or creates the corresponding `User`, and issues a session JWT (7-day expiry).

**Auth required:** No

**Request body:**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}
```

**Success response `200`:**
```json
{
  "success": true,
  "message": "Autentikasi Google berhasil!",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "user": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "name": "Budi Santoso",
      "email": "budi@gmail.com",
      "avatarUrl": "https://lh3.googleusercontent.com/a/AC..."
    }
  }
}
```

**Error responses:**
| Status | Cause |
|---|---|
| `400` | `idToken` missing, or Google account has no email |
| `401` | Google ID token invalid/expired |
| `500` | Database error while finding/creating the user |

## Using the Token

Send the returned `token` as a Bearer token on every protected endpoint:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

The JWT payload contains `id`, `email`, and `name`, and is verified with `JWT_SECRET` (see [setup/environment.md](../setup/environment.md)). Protected endpoints reject requests with a `401` if the header is missing, malformed, or the token is invalid/expired (see [error-response.md](error-response.md)).

## Account Linking

If a user previously signed up with the same email through a different Google account state, the backend links the incoming `googleId` to the existing user record by email match rather than creating a duplicate account.
