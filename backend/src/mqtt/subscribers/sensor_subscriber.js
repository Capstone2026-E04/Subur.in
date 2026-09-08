"use strict";

const {
  saveRawSensorLog,
  updateDeviceLastSeen,
  findDeviceById,
} = require("../../repositories/sensor_repository");

const {
  setLatestSensorData,
  shouldSaveToDatabase,
} = require("../../repositories/sensor_redis_repository");

const { broadcastToDevice } = require("../../sse/sse_manager");
const prisma = require("../../database/connections/prisma_client");
const { generateRecommendation } = require("../../ai/services/recommendation.service");
const { getRedisClient } = require("../../database/connections/redis");
const { notifyDevice } = require("../../services/notification.service");

const SENSOR_TOPIC = "suburin/devices/+/telemetry";

function registerSensorSubscriber(mqttClient) {
  mqttClient.subscribe(SENSOR_TOPIC, { qos: 1 }, (err) => {
    if (err) {
      console.error(
        `[MQTT Subscriber]  Gagal subscribe ke topic "${SENSOR_TOPIC}":`,
        err.message
      );
      return;
    }
    console.log(
      `[MQTT Subscriber]  Subscribe berhasil ke topic: "${SENSOR_TOPIC}"`
    );
  });

  mqttClient.on("message", async (topic, payload) => {
    if (!isSensorTopic(topic)) return;

    const deviceId = extractDeviceId(topic);
    if (!deviceId) {
      console.warn(
        `[MQTT Subscriber] ️  Tidak bisa ekstrak deviceId dari topic: ${topic}`
      );
      return;
    }

    let data;
    try {
      data = JSON.parse(payload.toString());
    } catch {
      console.error(
        `[MQTT Subscriber]  Payload bukan JSON valid dari device "${deviceId}":`,
        payload.toString()
      );
      return;
    }

    const ph = data.ph;
    const moisture = data.moisture !== undefined ? data.moisture : data.soil_moisture;

    if (!isValidSensorValue(ph, "ph") || !isValidSensorValue(moisture, "moisture")) {
      console.warn(
        `[MQTT Subscriber] ️  Nilai sensor tidak valid dari device "${deviceId}":`,
        data
      );
      try {
        const redis = getRedisClient();
        const invalidNotifiedKey = `sensor:invalid_notified:${deviceId}`;
        const alreadyNotified = await redis.get(invalidNotifiedKey);
        if (!alreadyNotified) {
          await notifyDevice(deviceId, {
            title: "Data Sensor Tidak Valid",
            message: "Data sensor tidak valid. Periksa sensor, daya, atau koneksi.",
            type: "warning",
          });
          await redis.setex(invalidNotifiedKey, 3600, "1");
        }
      } catch (err) {
        console.error("[MQTT Subscriber] Gagal menyimpan notifikasi data tidak valid:", err.message);
      }
      return;
    }

    console.log(
      `[MQTT Subscriber]  Data diterima | Device: ${deviceId} | pH: ${ph} | Moisture: ${moisture}%`
    );

    try {
      await setLatestSensorData(deviceId, ph, moisture);

      const sensorPayload = {
        deviceId,
        ph,
        moisture,
        timestamp: new Date().toISOString(),
      };
      broadcastToDevice(deviceId, sensorPayload);

      const device = await prisma.device.findUnique({
        where: { id: deviceId },
        include: { plant: true }
      });
      if (!device) {
        console.warn(
          `[MQTT Subscriber] ️  Device "${deviceId}" tidak ditemukan di database. Data Redis disimpan, Postgres diabaikan.`
        );
        return;
      }

      try {
        const recommendation = await generateRecommendation({
          phValue: ph,
          moistureValue: moisture,
          polybagPreset: device.polybagId,
          plantIdOrName: device.plantId
        });

        await prisma.recommendationLog.create({
          data: {
            deviceId: deviceId,
            phValue: ph,
            moistureValue: moisture,
            fuzzyIndex: recommendation.fuzzyIndex,
            categoryCode: recommendation.categoryCode,
            actionText: recommendation.actionText,
            waterVolumeLiter: recommendation.waterVolumeLiter,
            limeDosageGram: recommendation.limeDosageGram,
            sulfurDosageGram: recommendation.sulfurDosageGram,
            reduceWatering: recommendation.reduceWatering
          }
        });
        console.log(
          `[MQTT Subscriber]  Recommendation log disimpan ke Postgres | Device: ${deviceId}`
        );

        const redis = getRedisClient();
        const dryKey = `sensor:consecutive_dry:${deviceId}`;
        const wetKey = `sensor:consecutive_wet:${deviceId}`;
        const offlineNotifiedKey = `sensor:offline_notified:${deviceId}`;
        const invalidNotifiedKey = `sensor:invalid_notified:${deviceId}`;
        const phAcidNotifiedKey = `sensor:ph_acid_notified:${deviceId}`;
        const phAlkalineNotifiedKey = `sensor:ph_alkaline_notified:${deviceId}`;

        await redis.del(offlineNotifiedKey);
        await redis.del(invalidNotifiedKey);

        if (moisture < 25) {
          const dryCount = await redis.incr(dryKey);
          await redis.del(wetKey);
          if (dryCount === 2 && recommendation.waterVolumeLiter > 0) {
            await notifyDevice(deviceId, {
              title: "Media Kering",
              message: `Media kering. Siram sekitar ${Math.round(recommendation.waterVolumeLiter * 1000)} mL.`,
              type: "warning",
            });
          }
        } else if (moisture > 35) {
          const wetCount = await redis.incr(wetKey);
          await redis.del(dryKey);
          if (wetCount === 2 && recommendation.reduceWatering) {
            await notifyDevice(deviceId, {
              title: "Media Terlalu Basah",
              message: "Media terlalu basah. Hentikan penyiraman sementara dan cek drainase.",
              type: "warning",
            });
          }
        } else {
          await redis.del(dryKey);
          await redis.del(wetKey);
        }

        const minPh = device.plant.minPh;
        const maxPh = device.plant.maxPh;

        if (ph < minPh - 0.2 && recommendation.limeDosageGram > 0) {
          const alreadyNotified = await redis.get(phAcidNotifiedKey);
          if (!alreadyNotified) {
            await notifyDevice(deviceId, {
              title: "pH Terlalu Asam",
              message: `pH terlalu asam. Tambahkan kapur/dolomit sekitar ${Math.round(recommendation.limeDosageGram)} gram.`,
              type: "warning",
            });
            await redis.setex(phAcidNotifiedKey, 3600, "1");
          }
        } else if (ph > maxPh + 0.2 && recommendation.sulfurDosageGram > 0) {
          const alreadyNotified = await redis.get(phAlkalineNotifiedKey);
          if (!alreadyNotified) {
            await notifyDevice(deviceId, {
              title: "pH Terlalu Basa",
              message: `pH terlalu basa. Tambahkan sulfur elemental sekitar ${Math.round(recommendation.sulfurDosageGram)} gram.`,
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
          `[MQTT Subscriber] ️ Gagal membuat/menyimpan rekomendasi otomatis untuk device "${deviceId}":`,
          recErr.message
        );
      }

      const allowWrite = await shouldSaveToDatabase(deviceId);
      if (allowWrite) {
        await saveRawSensorLog(deviceId, ph, moisture);
        await updateDeviceLastSeen(deviceId);
        console.log(
          `[MQTT Subscriber]  Data sensor disimpan ke Postgres | Device: ${deviceId}`
        );
      }
    } catch (err) {
      console.error(
        `[MQTT Subscriber]  Error saat memproses data dari device "${deviceId}":`,
        err.message
      );
    }
  });
}

function isSensorTopic(topic) {
  return /^suburin\/devices\/.+\/telemetry$/.test(topic);
}

function extractDeviceId(topic) {
  const parts = topic.split("/");
  return parts.length === 4 ? parts[2] : null;
}

function isValidSensorValue(value, fieldName) {
  if (typeof value !== "number" || isNaN(value)) {
    console.warn(
      `[MQTT Subscriber] Nilai "${fieldName}" tidak valid: ${value}`
    );
    return false;
  }
  if (fieldName === "ph" && (value < 0 || value > 14)) {
    console.warn(
      `[MQTT Subscriber] Nilai "${fieldName}" di luar rentang yang diizinkan (0-14): ${value}`
    );
    return false;
  }
  if (fieldName === "moisture" && (value < 0 || value > 100)) {
    console.warn(
      `[MQTT Subscriber] Nilai "${fieldName}" di luar rentang yang diizinkan (0-100): ${value}`
    );
    return false;
  }
  return true;
}

module.exports = { registerSensorSubscriber, SENSOR_TOPIC };
