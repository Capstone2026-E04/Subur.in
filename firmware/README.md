# Firmware

Sketch ESP32 (pH + VWC, antrean LittleFS). Satu folder per node; nama folder = nama sketch (syarat Arduino IDE).

| Folder | `NODE_ID` |
|---|---|
| `node_1/` | `node_1` |
| `node_2/` | `node_2` |

## Setup

1. Di folder node: `cp secrets.h.example secrets.h`, lalu isi WiFi dan kredensial MQTT. `secrets.h` di-ignore git.
2. Buka `node_X/node_X.ino`, pilih board ESP32 dan partition scheme ber-filesystem, lalu upload.

Dua sketch identik kecuali `NODE_ID`; perubahan logika perlu diterapkan di keduanya. Detail kontrak backend, batas, dan prosedur uji ada di komentar header `.ino`.
