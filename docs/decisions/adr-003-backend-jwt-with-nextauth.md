# ADR-003: Backend-Issued JWT Bridged Through NextAuth

## Status
Accepted

## Context
The frontend uses NextAuth v5 purely for the Google OAuth handshake (consent screen, token exchange, session cookie). The backend is a separate Express service with its own database and no NextAuth integration, and needs to authenticate every API request independently of the frontend's session mechanism (e.g. for future non-browser clients, or if the frontend is ever replaced).

## Decision
On successful Google sign-in, NextAuth's `signIn` callback ([`lib/auth.ts`](../../frontend/src/lib/auth.ts)) immediately exchanges the Google ID token for a backend-issued JWT by calling `POST /api/auth/google`. That backend JWT is stored inside the NextAuth session (`session.user.backendToken`) and is the token actually sent as `Authorization: Bearer` on every backend API call — the Google ID token itself is never reused after this exchange.

## Consequences
- The backend stays a self-contained auth authority (its own `JWT_SECRET`, its own user table keyed by `googleId`/`email`) — it doesn't need to trust or validate NextAuth session cookies, so it could serve non-Next.js clients unchanged.
- Sign-in fails closed: if the backend exchange call fails (network error, backend down, `GOOGLE_CLIENT_ID` mismatch), `signIn` returns `false` and the user is never granted a NextAuth session, even though Google's own OAuth step succeeded.
- Two token lifetimes exist (NextAuth session vs. the 7-day backend JWT nested inside it) — if they drift out of sync, a user could have a live NextAuth session with an expired backend token, seeing 401s on API calls until they re-authenticate. There is currently no proactive refresh of the backend token before its 7-day expiry.
