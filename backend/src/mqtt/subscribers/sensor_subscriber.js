"use strict";

const {
  saveRawSensorLog,
  saveBufferedSensorLog,
  saveRejectedSensorRecord,
  updateDeviceLastSeen,
} = require("../../repositories/sensor_repository");
const { publishRecordAck } = require("../publishers/ack_publisher");

const {
  setLatestSensorData,
  shouldSaveToDatabase,
  pushSensorExport,
} = require("../../repositories/sensor_redis_repository");

const { broadcastToDevice } = require("../../sse/sse_manager");
const prisma = require("../../database/connections/prisma_client");
const {
  generateRecommendation,
} = require("../../ai/services/recommendation.service");
const { adcToVwc } = require("../../ai/core/vwc_calibration");
const { getPhMonitor } = require("../../ai/services/ph_monitor.service");
const {
  recordMoisture,
  claimWaterDecision,
} = require("../../ai/services/water_schedule.service");
const { getRedisClient } = require("../../database/connections/redis");
const { notifyDevice } = require("../../services/notification.service");

const SENSOR_TOPIC = "suburin/devices/+/telemetry";

function registerSensorSubscriber(mqttClient) {
  mqttClient.subscribe(SENSOR_TOPIC, { qos: 1 }, (err) => {
    if (err) {
      console.error("[SensorSubscriber] Gagal subscribe ke topic MQTT:", {
        message: err.message,
        stack: err.stack,
        topic: SENSOR_TOPIC,
      });
      return;
    }
    console.log(
      `[MQTT Subscriber]  Subscribe berhasil ke topic: "${SENSOR_TOPIC}"`,
    );
  });

  mqttClient.on("message", (topic, payload) =>
    handleSensorMessage(topic, payload),
  );
}

async function handleSensorMessage(topic, payload, { isDev = false } = {}) {
  if (!isSensorTopic(topic)) return;

  const deviceCode = extractDeviceCode(topic);
  if (!deviceCode) {
    console.warn(
      `[MQTT Subscriber] ️  Tidak bisa ekstrak deviceCode dari topic: ${topic}`,
    );
    return;
  }

  let data;
  try {
    data = JSON.parse(payload.toString());
  } catch (parseErr) {
    console.error("[SensorSubscriber] Payload MQTT bukan JSON valid:", {
      message: parseErr.message,
      deviceCode,
      rawPayload: payload.toString(),
    });
    return;
  }

  const ph = data.ph;
  const hasVwc = Object.prototype.hasOwnProperty.call(data, "soil_vwc_pct");
  const hasAdc = !hasVwc && typeof data.soil_adc === "number";
  const calibrated = hasAdc ? adcToVwc(data.soil_adc) : null;
  const safetyOverride = calibrated?.safetyOverride ?? null;
  const moisture = calibrated
    ? calibrated.vwcPercent
    : hasVwc
      ? data.soil_vwc_pct
      : data.moisture !== undefined
        ? data.moisture
        : data.soil_moisture;
  const moistureType = hasVwc || hasAdc ? "vwc_percent" : "legacy_index";
  const recordId = parseRecordId(data.record_id);

  const phValid = isValidSensorValue(ph, "ph");
  const moistureValid = isValidSensorValue(moisture, "moisture");

  if (!phValid || !moistureValid) {
    console.warn(
      `[MQTT Subscriber] ️  Nilai sensor tidak valid dari device "${deviceCode}":`,
      data,
    );
    try {
      const redis = getRedisClient();
      const invalidNotifiedKey = `sensor:invalid_notified:${deviceCode}`;
      const alreadyNotified = await redis.get(invalidNotifiedKey);
      const device = await prisma.device.findUnique({
        where: { deviceCode },
        select: { id: true },
      });
      if (device && !alreadyNotified) {
        await notifyDevice(device.id, {
          title: "Data Sensor Tidak Valid",
          message:
            "Data sensor tidak valid. Periksa sensor, daya, atau koneksi.",
          type: "warning",
        });
        await redis.setex(invalidNotifiedKey, 3600, "1");
      }
    } catch (err) {
      console.error(
        "[SensorSubscriber] Gagal menyimpan notifikasi data sensor tidak valid:",
        {
          message: err.message,
          stack: err.stack,
          deviceCode,
        },
      );
    }
    if (recordId !== null) {
      try {
        const device = await prisma.device.findUnique({
          where: { deviceCode },
          select: { id: true },
        });
        if (device) {
          const reason = `invalid: ${[!phValid && "ph", !moistureValid && "moisture"].filter(Boolean).join(",")}`;
          await saveRejectedSensorRecord(device.id, recordId, data, reason);
          await publishRecordAck(deviceCode, recordId);
        }
      } catch (err) {
        console.error(
          "[SensorSubscriber] Gagal menyimpan record yang ditolak, ACK dibatalkan:",
          {
            message: err.message,
            stack: err.stack,
            deviceCode,
            recordId,
          },
        );
      }
    }
    return;
  }

  console.log(
    `[MQTT Subscriber]  Data diterima | Device: ${deviceCode} | pH: ${ph} | Moisture: ${moisture}%`,
  );

  const measuredAt = parseMeasuredAt(data.measured_at);
  if (recordId === null) {
    await bufferForExport(
      deviceCode,
      new Date(),
      true,
      ph,
      moisture,
      moistureType,
      isDev,
    );
  }

  try {
    const device = await prisma.device.findUnique({
      where: { deviceCode },
      include: { plant: true },
    });

    if (device && recordId !== null) {
      const created = await saveBufferedSensorLog(
        device.id,
        recordId,
        ph,
        moisture,
        moistureType,
        measuredAt,
        isDev,
      );
      if (created) {
        await bufferForExport(
          deviceCode,
          measuredAt ?? new Date(),
          measuredAt !== null,
          ph,
          moisture,
          moistureType,
          isDev,
        );
      }
      await updateDeviceLastSeen(device.id);
      await publishRecordAck(deviceCode, recordId);
      if (!created || isStale(data.measured_at, device.sensorInterval)) return;
    }

    await setLatestSensorData(deviceCode, ph, moisture, moistureType);
    if (!device) {
      console.warn(
        `[MQTT Subscriber] ️  Device "${deviceCode}" tidak ditemukan di database. Data Redis disimpan, Postgres diabaikan.`,
      );
      return;
    }

    const sensorPayload = {
      deviceId: device.id,
      ph,
      moisture,
      moistureType,
      timestamp: new Date().toISOString(),
    };
    broadcastToDevice(device.id, sensorPayload);

    let decisionMoisture = null;
    if (moistureType === "vwc_percent") {
      try {
        if (safetyOverride) {
          decisionMoisture = moisture;
        } else {
          await recordMoisture(deviceCode, moisture);
          decisionMoisture = await claimWaterDecision(deviceCode);
        }
      } catch (err) {
        console.error(
          "[SensorSubscriber] Gagal memproses jendela kelembapan:",
          {
            message: err.message,
            stack: err.stack,
            deviceCode,
          },
        );
      }
    }

    if (decisionMoisture !== null)
      try {
        const redis = getRedisClient();

        const recommendation = await generateRecommendation({
          phValue: ph,
          moistureValue: decisionMoisture,
          plantIdOrName: device.plantId,
          deviceId: device.id,
          safetyOverride,
          phMonitor: await getPhMonitor(device.id, device.plant),
        });

        await prisma.recommendationLog.create({
          data: {
            deviceId: device.id,
            phValue: ph,
            moistureValue: decisionMoisture,
            fuzzyIndex: recommendation.fuzzyIndex,
            categoryCode: recommendation.categoryCode,
            actionText: recommendation.actionText,
            waterVolumeLiter: recommendation.waterVolumeLiter,
            limeDosageGram: recommendation.limeDosageGram,
            sulfurDosageGram: recommendation.sulfurDosageGram,
            reduceWatering: recommendation.reduceWatering,
            isDev,
          },
        });
        console.log(
          `[MQTT Subscriber]  Recommendation log disimpan ke Postgres | Device: ${deviceCode}`,
        );

        const dryKey = `sensor:consecutive_dry:${deviceCode}`;
        const wetKey = `sensor:consecutive_wet:${deviceCode}`;
        const offlineNotifiedKey = `sensor:offline_notified:${deviceCode}`;
        const invalidNotifiedKey = `sensor:invalid_notified:${deviceCode}`;
        const phAcidNotifiedKey = `sensor:ph_acid_notified:${deviceCode}`;
        const phAlkalineNotifiedKey = `sensor:ph_alkaline_notified:${deviceCode}`;

        await redis.del(offlineNotifiedKey);
        await redis.del(invalidNotifiedKey);

        if (recommendation.waterAction === "IRRIGATE") {
          const dryCount = await redis.incr(dryKey);
          await redis.del(wetKey);
          if (dryCount === 2 && recommendation.waterVolumeLiter > 0) {
            await notifyDevice(device.id, {
              title: "Media Kering",
              message: `Media kering. Siram sekitar ${Math.round(recommendation.waterVolumeLiter * 1000)} mL.`,
              type: "warning",
            });
          }
        } else if (recommendation.waterAction === "STOP") {
          const wetCount = await redis.incr(wetKey);
          await redis.del(dryKey);
          if (wetCount === 2) {
            await notifyDevice(device.id, {
              title: "Media Terlalu Basah",
              message:
                "Media terlalu basah. Hentikan penyiraman sementara dan cek drainase.",
              type: "warning",
            });
          }
        } else {
          await redis.del(dryKey);
          await redis.del(wetKey);
        }

        if (recommendation.limeDosageGram > 0) {
          const alreadyNotified = await redis.get(phAcidNotifiedKey);
          if (!alreadyNotified) {
            await notifyDevice(device.id, {
              title: "pH Terlalu Asam",
              message: `pH terlalu asam. Pertimbangkan dolomit sekitar ${Math.round(recommendation.limeDosageGram * 10) / 10} gram (estimasi).`,
              type: "warning",
            });
            await redis.setex(phAcidNotifiedKey, 3600, "1");
          }
        } else if (recommendation.sulfurDosageGram > 0) {
          const alreadyNotified = await redis.get(phAlkalineNotifiedKey);
          if (!alreadyNotified) {
            await notifyDevice(device.id, {
              title: "pH Terlalu Basa",
              message: `pH terlalu basa. Pertimbangkan sulfur elemental sekitar ${Math.round(recommendation.sulfurDosageGram * 10) / 10} gram (estimasi).`,
              type: "warning",
            });
            await redis.setex(phAlkalineNotifiedKey, 3600, "1");
          }
        } else {
          await redis.del(phAcidNotifiedKey);
          await redis.del(phAlkalineNotifiedKey);
        }
      } catch (recErr) {
        console.error(
          "[SensorSubscriber] Gagal membuat/menyimpan rekomendasi otomatis:",
          {
            message: recErr.message,
            stack: recErr.stack,
            deviceCode,
          },
        );
      }

    const allowWrite =
      recordId === null && (await shouldSaveToDatabase(deviceCode));
    if (allowWrite) {
      await saveRawSensorLog(device.id, ph, moisture, isDev, moistureType);
      await updateDeviceLastSeen(device.id);
      console.log(
        `[MQTT Subscriber]  Data sensor disimpan ke Postgres | Device: ${deviceCode}`,
      );
    }
  } catch (err) {
    console.error(
      "[SensorSubscriber] Gagal memproses data sensor dari device:",
      {
        message: err.message,
        stack: err.stack,
        deviceCode,
      },
    );
  }
}

async function bufferForExport(
  deviceCode,
  time,
  synced,
  ph,
  moisture,
  moistureType,
  isDev,
) {
  if (isDev) return;
  try {
    await pushSensorExport(deviceCode, {
      t: time.toISOString(),
      ph,
      moisture,
      moistureType,
      synced,
    });
  } catch (err) {
    console.error("[SensorSubscriber] Gagal menyimpan buffer ekspor:", {
      message: err.message,
      stack: err.stack,
      deviceCode,
    });
  }
}

function parseRecordId(value) {
  if (typeof value === "string" && value.trim().length > 0) return value;
  return Number.isSafeInteger(value) ? String(value) : null;
}

function parseMeasuredAt(value) {
  if (value === null || value === undefined) return null;
  const date = new Date(
    typeof value === "number" && value < 1e11 ? value * 1000 : value,
  );
  return isNaN(date) ? null : date;
}

function isStale(measuredAt, sensorIntervalMin) {
  const date = parseMeasuredAt(measuredAt);
  return date !== null && Date.now() - date > 2 * sensorIntervalMin * 60 * 1000;
}

function isSensorTopic(topic) {
  return /^suburin\/devices\/.+\/telemetry$/.test(topic);
}

function extractDeviceCode(topic) {
  const parts = topic.split("/");
  return parts.length === 4 ? parts[2] : null;
}

function isValidSensorValue(value, fieldName) {
  if (typeof value !== "number" || isNaN(value)) {
    console.warn(
      `[MQTT Subscriber] Nilai "${fieldName}" tidak valid: ${value}`,
    );
    return false;
  }
  if (fieldName === "ph" && (value < 0 || value > 14)) {
    console.warn(
      `[MQTT Subscriber] Nilai "${fieldName}" di luar rentang yang diizinkan (0-14): ${value}`,
    );
    return false;
  }
  if (fieldName === "moisture" && (value < 0 || value > 100)) {
    console.warn(
      `[MQTT Subscriber] Nilai "${fieldName}" di luar rentang yang diizinkan (0-100): ${value}`,
    );
    return false;
  }
  return true;
}

module.exports = {
  registerSensorSubscriber,
  handleSensorMessage,
  SENSOR_TOPIC,
};
