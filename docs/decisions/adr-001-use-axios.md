# ADR-001: Use Axios for HTTP Requests

## Status
Accepted

## Context
The frontend needs to call the backend REST API from client and server components, attaching a Bearer token and handling JSON errors consistently across many service modules (`src/services/*`).

## Decision
Use `axios` as the HTTP client for backend API calls made from `src/services/*`, rather than the native `fetch` for every call site (native `fetch` is still used directly for the SSE fallback request and inside the NextAuth callback, where no interceptor/config benefit applies).

## Consequences
- Consistent request/response handling (JSON parsing, error shape) across service files without repeating boilerplate.
- One more runtime dependency to keep updated.
- Two HTTP call styles exist in the codebase (`axios` in services, raw `fetch` in `lib/auth.ts` and `useSensorRealtime`) — this is intentional where `fetch` is already required (server-side NextAuth callback, `EventSource`-adjacent fallback), not a drift to converge, but a new service module should default to `axios` for consistency.
