# ADR-002: Next.js App Router with Route Groups

## Status
Accepted

## Context
The frontend needs a clear separation between a public login page and an authenticated dashboard with many sub-pages (devices, plants, recommendations, analytics, notifications, settings, profile), with authentication enforced consistently across all dashboard pages without repeating the check in every page component.

## Decision
Use Next.js 16's App Router with two route groups: `(auth)` for `/login`, and `(dashboard)` for all `/dashboard/*` pages. The `(dashboard)/layout.tsx` is an async server component that calls NextAuth's `auth()` once and redirects to `/login` if there's no session — every page inside the group inherits this check for free.

## Consequences
- Adding a new protected page is just adding a `page.tsx` under `(dashboard)/dashboard/`; no per-page auth boilerplate.
- The layout also does a server-side fetch of the fresh user profile before rendering, avoiding a client-side loading flash for name/avatar — at the cost of one extra backend round trip per dashboard navigation that crosses the layout boundary.
- Route groups mean the URL structure (`/dashboard/...`) doesn't reflect the folder grouping (`(dashboard)/dashboard/...`) — mildly redundant nesting (`(dashboard)/dashboard/`) but keeps the group name and the actual first path segment distinct and intentional.
