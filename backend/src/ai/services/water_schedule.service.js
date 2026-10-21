const { getRedisClient } = require("../../database/connections/redis");
const { median } = require("../core/water_schedule");
const {
  WATER_WINDOW,
  WATER_MIN_READINGS,
  WATER_DECISION_SECONDS,
} = require("../config/treatment_constants");

const WINDOW_KEY = (code) => `sensor:moisture_window:${code}`;
const SLOT_KEY = (code) => `sensor:water_decision:${code}`;

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

async function getWindowMedian(deviceCode) {
  const readings = await readWindow(getRedisClient(), deviceCode);
  return readings.length >= WATER_MIN_READINGS ? median(readings) : null;
}

module.exports = { recordMoisture, claimWaterDecision, getWindowMedian };
