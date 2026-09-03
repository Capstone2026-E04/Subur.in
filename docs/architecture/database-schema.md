# Database Schema

PostgreSQL (hosted on Supabase), accessed via Prisma. Schema source: [`backend/prisma/schema.prisma`](../../backend/prisma/schema.prisma).

## Entities

| Model | Purpose |
|---|---|
| `User` | Account created/synced via Google Sign-In |
| `Device` | A registered IoT sensor unit, owned by a user, linked to a plant and a polybag |
| `Plant` | Plant species reference data (pH tolerance range/target) |
| `PolybagType` | Physical polybag dimensions (diameter, height) |
| `Polybag` | A polybag instance derived from a `PolybagType`, with computed soil volume |
| `RecommendationLog` | One fuzzy-logic recommendation result, tied to a device |
| `RawSensorLog` | Raw pH/moisture telemetry, partitioned by month for retention/cleanup |
| `Notification` | Device-scoped user-facing alert (e.g. invalid sensor data) |

## ERD

```mermaid
erDiagram
    USER ||--o{ DEVICE : owns
    PLANT ||--o{ DEVICE : "used by"
    POLYBAG ||--o{ DEVICE : "used by"
    POLYBAG_TYPE ||--o{ POLYBAG : defines
    DEVICE ||--o{ RECOMMENDATION_LOG : produces
    DEVICE ||--o{ RAW_SENSOR_LOG : produces
    DEVICE ||--o{ NOTIFICATION : triggers

    USER {
        uuid id PK
        varchar google_id UK
        varchar name
        varchar email UK
        text avatar_url
    }
    DEVICE {
        varchar id PK
        uuid user_id FK
        varchar label
        uuid plant_id FK
        uuid polybag_id FK
        enum status
        timestamp last_seen_at
        int sensor_interval
    }
    PLANT {
        uuid id PK
        varchar name
        varchar scientific_name
        float min_ph
        float max_ph
        float ph_target
    }
    POLYBAG_TYPE {
        uuid id PK
        varchar name
        float diameter
        float height
    }
    POLYBAG {
        uuid id PK
        uuid polybag_type_id FK
        float soil_volume_liter
    }
    RECOMMENDATION_LOG {
        uuid id PK
        varchar device_id FK
        float ph_value
        float moisture_value
        float fuzzy_index
        varchar category_code
        text action_text
        float water_volume_liter
        float lime_dosage_gram
        float sulfur_dosage_gram
        bool reduce_watering
    }
    RAW_SENSOR_LOG {
        int id PK
        timestamptz timestamp PK
        varchar device_id FK
        float ph
        float moisture
    }
    NOTIFICATION {
        uuid id PK
        varchar device_id FK
        varchar title
        text message
        varchar type
        bool is_read
    }
```

## Notes

- `Device.id` is a natural key (varchar), matching the physical device's identifier rather than a generated UUID, since MQTT topics and hardware provisioning reference it directly.
- `Device` -> `Plant`/`Polybag` relations use `onDelete: Restrict` — a plant or polybag in use by a device cannot be deleted, preventing orphaned devices.
- `Device` -> `User` uses `onDelete: Cascade` — deleting a user removes their devices (and transitively their recommendation logs and notifications).
- `RawSensorLog` is keyed on `(timestamp, id)` and range-partitioned by month at the database level (managed by [`src/cron/database_cleanup_cron.js`](../../backend/src/cron/database_cleanup_cron.js)) to keep high-frequency telemetry writes and retention cleanup cheap.
- `DeviceStatus` enum: `ACTIVE`, `INACTIVE`, `OFFLINE`.

See [database/prisma.md](../database/prisma.md) for query conventions and [database/migration.md](../database/migration.md) for how schema changes are applied.
