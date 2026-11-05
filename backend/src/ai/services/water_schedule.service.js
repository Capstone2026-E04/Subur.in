const { getRedisClient } = require("../../database/connections/redis");
const prisma = require("../../database/connections/prisma_client");
const { median, classifyEmergency } = require("../core/water_schedule");
const {
  WATER_WINDOW,
  WATER_MIN_READINGS,
  WATER_DECISION_SECONDS,
  PH_DECISION_SECONDS,
} = require("../config/treatment_constants");

const WINDOW_KEY = (code) => `sensor:moisture_window:${code}`;
const SLOT_KEY = (code) => `sensor:water_decision:${code}`;
const PH_SLOT_KEY = (code) => `sensor:ph_decision:${code}`;
const EMERGENCY_KEY = (code) => `sensor:emergency:${code}`;

async function readWindow(redis, deviceCode) {
  const raw = await redis.lrange(WINDOW_KEY(deviceCode), 0, WATER_WINDOW - 1);
  return raw.map(Number);
}

async function recordMoisture(deviceCode, moisture) {
  const redis = getRedisClient();
  await redis.lpush(WINDOW_KEY(deviceCode), moisture);
  await redis.ltrim(WINDOW_KEY(deviceCode), 0, WATER_WINDOW - 1);
}

async function claimWaterDecision(deviceCode) {
  const redis = getRedisClient();
  const readings = await readWindow(redis, deviceCode);
  if (readings.length < WATER_MIN_READINGS) return null;
  const claimed = await redis.set(
    SLOT_KEY(deviceCode),
    "1",
    "EX",
    WATER_DECISION_SECONDS,
    "NX",
  );
  return claimed ? median(readings) : null;
}

// Dipanggil setelah recordMoisture. Mengembalikan "dry_critical" / "wet_surge"
// bila ada kondisi darurat yang boleh dikeluarkan sekarang, selain itu null.
// Satu darurat per 4 jam (atau sampai user konfirmasi); saat keluar, slot
// rekomendasi biasa dimulai ulang 4 jam dari sekarang.
async function claimEmergency(deviceCode, deviceId) {
  const redis = getRedisClient();
  const type = classifyEmergency(await readWindow(redis, deviceCode));
  if (!type) return null;

  // Lonjakan basah yang didahului konfirmasi siram adalah penyiraman, bukan darurat.
  if (type === "wet_surge") {
    const confirmed = await prisma.recommendationLog.findFirst({
      where: {
        deviceId,
        confirmedAt: {
          gte: new Date(Date.now() - WATER_DECISION_SECONDS * 1000),
        },
      },
      select: { id: true },
    });
    if (confirmed) return null;
  }

  const claimed = await redis.set(
    EMERGENCY_KEY(deviceCode),
    type,
    "EX",
    WATER_DECISION_SECONDS,
    "NX",
  );
  if (!claimed) return null;
  await restartWaterDecision(deviceCode);
  return type;
}

// Slot rekomendasi biasa diulang 4 jam dari sekarang (dipanggil saat darurat
// keluar dan saat user menandai rekomendasi sudah dilaksanakan).
async function restartWaterDecision(deviceCode) {
  await getRedisClient().set(
    SLOT_KEY(deviceCode),
    "1",
    "EX",
    WATER_DECISION_SECONDS,
  );
}

// Konfirmasi user: slot 4 jam diulang dan darurat berikutnya boleh keluar lagi.
async function confirmWaterAction(deviceCode) {
  await restartWaterDecision(deviceCode);
  await getRedisClient().del(EMERGENCY_KEY(deviceCode));
}

// Rekomendasi dosis pH (kapur/sulfur) hanya boleh keluar sekali per 7 hari.
async function claimPhDecision(deviceCode) {
  const claimed = await getRedisClient().set(
    PH_SLOT_KEY(deviceCode),
    "1",
    "EX",
    PH_DECISION_SECONDS,
    "NX",
  );
  return Boolean(claimed);
}

module.exports = {
  recordMoisture,
  claimWaterDecision,
  claimEmergency,
  confirmWaterAction,
  claimPhDecision,
};
