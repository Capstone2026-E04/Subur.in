"use strict";

const { getRedisClient } = require("../database/connections/redis");

const SENSOR_TTL_SECONDS = 300;
const THROTTLE_KEY_PREFIX = "sensor:throttle:";
const LATEST_KEY_PREFIX = "sensor:latest:";

async function setLatestSensorData(deviceId, ph, moisture) {
  try {
    const redis = getRedisClient();
    const key = `${LATEST_KEY_PREFIX}${deviceId}`;
    const payload = JSON.stringify({
      deviceId,
      ph,
      moisture,
      timestamp: new Date().toISOString(),
    });
    await redis.set(key, payload, "EX", SENSOR_TTL_SECONDS);
  } catch (err) {
    console.error("[SensorRedisRepository] Gagal setLatestSensorData (fallback aktif, tulis DB tetap lanjut):", {
      message: err.message,
      stack: err.stack,
      deviceId,
    });
  }
}

async function getLatestSensorData(deviceId) {
  try {
    const redis = getRedisClient();
    const key = `${LATEST_KEY_PREFIX}${deviceId}`;
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error("[SensorRedisRepository] Gagal getLatestSensorData (fallback aktif, caller akan query DB):", {
      message: err.message,
      stack: err.stack,
      deviceId,
    });
    return null;
  }
}

async function shouldSaveToDatabase(deviceId) {
  try {
    const redis = getRedisClient();
    const throttleSeconds = parseInt(
      process.env.SENSOR_THROTTLE_SECONDS || "30",
      10,
    );
    const key = `${THROTTLE_KEY_PREFIX}${deviceId}`;
    const exists = await redis.exists(key);
    if (exists) return false;
    await redis.set(key, "1", "EX", throttleSeconds);
    return true;
  } catch (err) {
    console.error("[SensorRedisRepository] Gagal shouldSaveToDatabase (fallback: izinkan simpan ke DB):", {
      message: err.message,
      stack: err.stack,
      deviceId,
    });
    return true;
  }
}

module.exports = {
  setLatestSensorData,
  getLatestSensorData,
  shouldSaveToDatabase,
};
