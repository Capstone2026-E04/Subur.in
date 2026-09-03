# State Management

There is **no global client-side store** (Zustand is listed in `package.json` but is not currently used anywhere in `src/`) — state is local component/hook state plus the NextAuth session. Keep this in mind before reaching for a store: most new state should follow the same pattern below rather than introducing Zustand.

## Session State

NextAuth v5's `SessionProvider` (wired in `app/(dashboard)/layout.tsx`) is the source of truth for auth state. Client components read it with `useSession()` from `next-auth/react`, primarily to get `session.user.backendToken` — the JWT used to call the backend API.

## Data-Fetching Hooks

Each backend resource that needs client-side interactivity gets a small hook in `src/hooks/` that:
1. Reads `backendToken` via `useSession()`.
2. Wraps a `src/services/*` function in `useState`/`useCallback`.
3. Exposes `{ data, isLoading, error, ...actions }` to the component.

| Hook | Backs |
|---|---|
| `useDevices` | List/claim/update/delete devices ([`services/deviceService.ts`](../../frontend/src/services/deviceService.ts)) |
| `useDeviceStatus` | Per-device online/offline status |
| `usePlants` | Plant reference list |
| `useSensorRealtime` | Live pH/moisture via SSE (`EventSource` against `/api/sensors/:id/stream`), with REST fallback (`/latest`) on stream error and auto-reconnect after 5s |

This keeps components simple (they call a hook, render its state) without a global store — each hook owns its own slice of server state and re-fetches/refreshes independently.

## Adding New Server State

Follow the existing pattern: add a function to the relevant `src/services/*.ts` file (thin wrapper around `fetch`/Axios + `API_URL`), then a hook in `src/hooks/` if a component needs to mutate or subscribe to it. Only introduce a shared store (Zustand, since it's already a dependency) if state genuinely needs to be shared across unrelated component subtrees that can't pass it via props/hooks — not by default.
