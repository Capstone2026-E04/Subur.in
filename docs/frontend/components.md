# Components

No component library — everything under `src/components` is a hand-built, Tailwind-styled React component, organized by scope rather than by atomic-design tier.

## `components/common/`

Shared across the whole app (both auth and dashboard layouts):

| Component | Purpose |
|---|---|
| `Header.tsx` | Top-level page header |
| `Sidebar.tsx` | Generic sidebar shell |
| `LoadingSpinner.tsx` | Reusable loading indicator |

## `components/dashboard/`

Dashboard-specific widgets, most driven by [`navConfig.ts`](../../frontend/src/components/dashboard/navConfig.ts) or the sensor/device hooks:

| Component | Purpose |
|---|---|
| `Sidebar.tsx` / `Topbar.tsx` | Dashboard navigation chrome, rendered from `NAV_ITEMS` in `navConfig.ts` |
| `StatCard.tsx` | Reusable stat/metric tile (e.g. device count, active sensors) |
| `SensorGaugeCard.tsx` | Gauge-style display for a single live sensor value (pH or moisture) |
| `SensorHistoryChart.tsx` | Recharts-based time series for sensor history (`GET /api/sensors/:id/history`) |
| `SensorMonitorPanel.tsx` | Composes gauge + chart + live status for one device |
| `LiveLocationTracker.tsx` | Live-updating status indicator, driven by `useSensorRealtime`/`useDeviceStatus` |
| `EditNameForm.tsx` | Inline form for editing the user's display name (`PATCH /api/users/me`) |

## `components/devices/`

Device management UI, all backed by [`useDevices`](../../frontend/src/hooks/useDevices.ts):

| Component | Purpose |
|---|---|
| `DeviceCard.tsx` | Summary card for one registered device |
| `ConnectDeviceModal.tsx` | Claim flow for a newly discovered device (`POST /api/devices`) |
| `EditDeviceModal.tsx` | Edit label/plant/polybag/interval (`PATCH /api/devices/:id`) |
| `DeleteConfirmDialog.tsx` | Generic confirm-delete dialog, reused for device deletion |

## Conventions

- Add navigation entries by editing `navConfig.ts` — the Sidebar and Topbar render from that array automatically rather than needing per-component route wiring. Set `hidden: true` for routes that should be reachable but not shown in nav (e.g. `/dashboard/profile`).
- Components that need live backend data fetch through `src/services/*` (Axios/fetch wrappers), not inline `fetch()` calls — see [state-management.md](state-management.md).
- All dashboard components assume an authenticated NextAuth session; they are rendered under the `(dashboard)` route group layout, which is the enforcement point for auth (see [routing.md](routing.md)).
