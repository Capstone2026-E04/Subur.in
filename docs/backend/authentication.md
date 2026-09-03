# Backend Authentication

Google Sign-In only, with a backend-issued JWT as the session token for the API. See [api/authentication.md](../api/authentication.md) for the endpoint contract and [architecture/api-flow.md](../architecture/api-flow.md) for the sequence diagram.

## Sign-In Flow ([`controllers/auth.controller.js`](../../backend/src/controllers/auth.controller.js))

1. Client sends `{ idToken }` — a Google-issued ID token (obtained by the frontend via NextAuth's Google provider).
2. Backend verifies it with `google-auth-library`'s `OAuth2Client.verifyIdToken`, checking the audience against `GOOGLE_CLIENT_ID`.
3. Extracts `sub` (Google user ID), `email`, `name`, `picture` from the verified payload.
4. Finds the user by `googleId`; if not found, tries to find by `email` and links the Google ID to that existing account (handles a user who existed before Google linking, or a re-auth after `googleId` was somehow cleared); otherwise creates a new `User`.
5. Signs a JWT (`{ id, email, name }`, `JWT_SECRET`, 7-day expiry) and returns it alongside the user record.

## Request Authorization ([`middlewares/auth.middleware.js`](../../backend/src/middlewares/auth.middleware.js))

Applied per-router with `router.use(authMiddleware)` (devices, users, notifications) or per-route (plants, polybags, recommendation history) — see each router file for which routes are public vs. protected.

```javascript
module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '...' });
  }
  const token = authHeader.split(' ')[1];
  const decoded = jwt.verify(token, JWT_SECRET);
  req.user = decoded;
  next();
};
```

On success, `req.user` is the decoded JWT payload (`{ id, email, name }`) — controllers read `req.user.id` to scope queries to the caller. On failure (missing header, malformed header, expired/invalid signature) it short-circuits with `401` before the controller runs.

## Secrets

`JWT_SECRET` has a hardcoded fallback (`'fallback_secret_for_development'`) if the env var is unset — **this must never be relied on outside local development**; a missing `JWT_SECRET` in any deployed environment means anyone can forge valid session tokens. Always set a strong `JWT_SECRET` in production (see [setup/environment.md](../setup/environment.md)).

## What's Not Covered

- No refresh tokens — a JWT is valid for its full 7-day lifetime or until `JWT_SECRET` rotates; there's no server-side revocation list.
- No role/permission system — every authenticated user has the same capabilities over their own resources; authorization is purely "do you own this row" (see [api/error-response.md](../api/error-response.md#authorization-vs-not-found)).
