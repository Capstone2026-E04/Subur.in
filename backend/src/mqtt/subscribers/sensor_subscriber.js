"use strict";

const {
  saveRawSensorLog,
  updateDeviceLastSeen,
} = require("../../repositories/sensor_repository");

const {
  setLatestSensorData,
  shouldSaveToDatabase,
} = require("../../repositories/sensor_redis_repository");

const { broadcastToDevice } = require("../../sse/sse_manager");
const prisma = require("../../database/connections/prisma_client");
const {
  generateRecommendation,
} = require("../../ai/services/recommendation.service");
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
  const moisture =
    data.moisture !== undefined ? data.moisture : data.soil_moisture;

  if (
    !isValidSensorValue(ph, "ph") ||
    !isValidSensorValue(moisture, "moisture")
  ) {
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
    return;
  }

  console.log(
    `[MQTT Subscriber]  Data diterima | Device: ${deviceCode} | pH: ${ph} | Moisture: ${moisture}%`,
  );

  try {
    await setLatestSensorData(deviceCode, ph, moisture);

    const device = await prisma.device.findUnique({
      where: { deviceCode },
      include: { plant: true },
    });
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
      timestamp: new Date().toISOString(),
    };
    broadcastToDevice(device.id, sensorPayload);

    try {
      const redis = getRedisClient();
      const phOutKey = `sensor:ph_out_of_range:${deviceCode}`;
      const phOutOfRange =
        ph <= device.plant.minPh - 0.5 || ph >= device.plant.maxPh + 0.5;
      let consistentReadings = 0;
      if (phOutOfRange) {
        consistentReadings = await redis.incr(phOutKey);
      } else {
        await redis.del(phOutKey);
      }

      const recommendation = await generateRecommendation({
        phValue: ph,
        moistureValue: moisture,
        plantIdOrName: device.plantId,
        deviceId: device.id,
        consistentReadings,
      });

      await prisma.recommendationLog.create({
        data: {
          deviceId: device.id,
          phValue: ph,
          moistureValue: moisture,
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

    const allowWrite = await shouldSaveToDatabase(deviceCode);
    if (allowWrite) {
      await saveRawSensorLog(device.id, ph, moisture, isDev);
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
