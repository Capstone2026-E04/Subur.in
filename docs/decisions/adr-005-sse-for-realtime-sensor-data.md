# ADR-005: Server-Sent Events for Live Sensor Updates

## Status
Accepted

## Context
The dashboard needs live pH/moisture updates and notification pushes per device as soon as a new MQTT telemetry message arrives, without the frontend polling the REST API on a timer. The data flow is one-directional (server -> browser only); the frontend never needs to push messages back over the same channel.

## Decision
Use Server-Sent Events (SSE) rather than WebSockets. The backend keeps an in-memory per-device list of open `res` objects ([`sse/sse_manager.js`](../../backend/src/sse/sse_manager.js)) and writes `data: ...\n\n` chunks to all of them when the MQTT subscriber ingests a new reading or a notification is created. The frontend consumes this with the browser-native `EventSource` API in [`useSensorRealtime`](../../frontend/src/hooks/useSensorRealtime.ts), with a REST fallback (`GET /api/sensors/:id/latest`) on stream error and automatic reconnect after 5 seconds.

## Consequences
- No extra dependency or protocol upgrade handling needed — `EventSource` is a native browser API and the server side is plain HTTP with the right headers (`text/event-stream`, `Cache-Control: no-cache`, `X-Accel-Buffering: no` to defeat proxy buffering), which is simpler to reason about and deploy behind a standard reverse proxy than WebSockets.
- One-directional only — this is fine for the current use case (sensor push + notification push), but if the frontend ever needs to send real-time messages back to the server (not just REST requests), SSE would need to be replaced or paired with a separate channel.
- The client registry in `sse_manager.js` is in-process memory — it does not survive a backend restart/redeploy (clients auto-reconnect via `EventSource`'s built-in retry, so this is a brief gap, not data loss) and does not scale across multiple backend instances without a shared pub/sub layer (e.g. Redis pub/sub) if the backend is ever horizontally scaled.
