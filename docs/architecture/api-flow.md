# API Flow

## Authenticated REST Request

Most endpoints require a JWT issued by `POST /api/auth/google`, sent as `Authorization: Bearer <token>` and verified by [`auth.middleware.js`](../../backend/src/middlewares/auth.middleware.js).

```mermaid
sequenceDiagram
    participant Client
    participant Route
    participant AuthMiddleware
    participant Controller
    participant Prisma
    participant DB

    Client->>Route: GET /api/devices (Authorization: Bearer <jwt>)
    Route->>AuthMiddleware: verify JWT
    alt token missing/invalid
        AuthMiddleware-->>Client: 401 Unauthorized
    else token valid
        AuthMiddleware->>Controller: next() with req.user
        Controller->>Prisma: device.findMany({ where: { userId } })
        Prisma->>DB: SQL query
        DB-->>Prisma: rows
        Prisma-->>Controller: devices
        Controller-->>Client: 200 { success, data: { devices } }
    end
```

## Google Sign-In

```mermaid
sequenceDiagram
    participant Browser
    participant NextAuth as Frontend NextAuth
    participant Backend
    participant Google
    participant DB

    Browser->>NextAuth: Sign in with Google
    NextAuth->>Google: OAuth consent + id_token
    Google-->>NextAuth: id_token
    NextAuth->>Backend: POST /api/auth/google { idToken }
    Backend->>Google: verifyIdToken(idToken)
    Google-->>Backend: payload (sub, email, name, picture)
    Backend->>DB: find/create User by googleId
    DB-->>Backend: user
    Backend-->>NextAuth: { token (JWT, 7d), user }
    NextAuth-->>Browser: session with backendToken
```

## Device Telemetry (MQTT -> DB/Cache -> SSE)

```mermaid
sequenceDiagram
    participant Device
    participant Broker as MQTT Broker
    participant Subscriber as sensor_subscriber.js
    participant Redis
    participant Postgres
    participant SSE as sse_manager
    participant Dashboard

    Device->>Broker: publish suburin/devices/{id}/telemetry { ph, moisture }
    Broker->>Subscriber: message
    Subscriber->>Subscriber: validate ph (0-14), moisture (0-100)
    alt invalid payload
        Subscriber->>Postgres: create Notification (throttled 1h via Redis lock)
    else valid payload
        Subscriber->>Redis: setLatestSensorData(deviceId, {ph, moisture})
        Subscriber->>Postgres: saveRawSensorLog (throttled by SENSOR_THROTTLE_SECONDS)
        Subscriber->>Postgres: updateDeviceLastSeen
        Subscriber->>SSE: broadcastToDevice(deviceId, reading)
        SSE-->>Dashboard: text/event-stream update
    end
```

## Recommendation Generation

```mermaid
sequenceDiagram
    participant Client
    participant Controller as device.controller.js
    participant Redis
    participant Postgres
    participant Engine as ai/services/recommendation.service.js

    Client->>Controller: GET /api/devices/:id/recommendation
    Controller->>Redis: getLatestSensorData(id)
    alt cache miss
        Controller->>Postgres: getLatestSensorLog(id)
    end
    Controller->>Engine: generateRecommendation({ph, moisture, polybagId, plantId})
    Engine->>Postgres: load Plant + Polybag/PolybagType
    Engine->>Engine: runInference (fuzzify -> rules -> defuzzify)
    Engine->>Engine: calculate water/lime/sulfur dosage
    Engine-->>Controller: recommendation
    Controller->>Postgres: create RecommendationLog
    Controller-->>Client: 200 { data: recommendation }
```

See [error-response.md](../api/error-response.md) for the shared error envelope and [authentication.md](../api/authentication.md) for token details.
