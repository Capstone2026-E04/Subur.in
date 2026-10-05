const prisma = require("../database/connections/prisma_client");
const { getRedisClient } = require("../database/connections/redis");
const {
  generateRecommendation,
} = require("../ai/services/recommendation.service");
const {
  getLatestSensorData,
} = require("../repositories/sensor_redis_repository");
const { getLatestSensorLog } = require("../repositories/sensor_repository");
const { publishDeviceConfig } = require("../mqtt/publishers/config_publisher");
const { sendSuccess, sendError } = require("../utils/response");

// Batas 1-60 menit mengikuti validasi firmware ESP (mqttCallback).
const isValidInterval = (v) =>
  Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 60;

exports.getDiscoveredDevices = async (req, res, next) => {
  try {
    const redis = getRedisClient();

    const keys = await redis.keys("sensor:latest:*");

    if (keys.length === 0) {
      return sendSuccess(
        res,
        200,
        "Tidak ada device aktif baru yang terdeteksi.",
        { devices: [] },
      );
    }

    const activeDevices = [];
    for (const key of keys) {
      const rawData = await redis.get(key);
      if (rawData) {
        activeDevices.push(JSON.parse(rawData));
      }
    }

    const activeDeviceCodes = activeDevices.map((d) => d.deviceCode);

    const registeredDevices = await prisma.device.findMany({
      where: {
        deviceCode: { in: activeDeviceCodes },
      },
      select: { deviceCode: true },
    });

    const registeredCodes = new Set(registeredDevices.map((d) => d.deviceCode));

    const unclaimedDevices = activeDevices.filter(
      (d) => !registeredCodes.has(d.deviceCode),
    );

    return sendSuccess(
      res,
      200,
      "Berhasil mendeteksi device aktif yang belum terdaftar.",
      { devices: unclaimedDevices },
    );
  } catch (error) {
    console.error("[DeviceController] Gagal mencari device aktif:", {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    return next(error);
  }
};

exports.registerDevice = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { deviceCode, label, plantId, polybagId, sensorInterval } = req.body;

    if (!deviceCode || !label || !plantId || !polybagId) {
      return sendError(
        res,
        400,
        "deviceCode, label, plantId, dan polybagId wajib diisi.",
      );
    }

    if (sensorInterval !== undefined && !isValidInterval(sensorInterval)) {
      return sendError(
        res,
        400,
        '"sensorInterval" harus berupa bilangan bulat 1-60 menit.',
      );
    }

    const existingDevice = await prisma.device.findUnique({
      where: { deviceCode },
    });

    if (existingDevice) {
      return sendError(
        res,
        400,
        "Device dengan ID ini sudah terdaftar di sistem.",
      );
    }

    const newDevice = await prisma.device.create({
      data: {
        deviceCode,
        userId: userId,
        label: label.trim(),
        plantId: plantId,
        polybagId: polybagId,
        status: "ACTIVE",
        sensorInterval:
          sensorInterval !== undefined ? Number(sensorInterval) : 15,
      },
      include: {
        plant: true,
        polybag: {
          include: { polybagType: true },
        },
      },
    });

    const intervalMin =
      sensorInterval !== undefined ? Number(sensorInterval) : 15;
    publishDeviceConfig(deviceCode, intervalMin).catch((err) => {
      console.error(
        `[MQTT Publish] Gagal mengirim config awal saat registrasi device:`,
        {
          message: err.message,
          stack: err.stack,
          deviceCode,
        },
      );
    });

    return sendSuccess(
      res,
      201,
      "Device berhasil didaftarkan dan dihubungkan ke akun Anda.",
      { device: newDevice },
    );
  } catch (error) {
    console.error("[DeviceController] Gagal mendaftarkan device:", {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
      deviceCode: req.body?.deviceCode,
    });
    return next(error);
  }
};

exports.getMyDevices = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const devices = await prisma.device.findMany({
      where: { userId: userId },
      include: {
        plant: true,
        polybag: {
          include: { polybagType: true },
        },
      },
    });

    return sendSuccess(res, 200, "Daftar device Anda berhasil diambil.", {
      devices,
    });
  } catch (error) {
    console.error("[DeviceController] Gagal mengambil daftar device:", {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    return next(error);
  }
};

exports.updateDevice = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { label, plantId, polybagId, status, sensorInterval } = req.body;

    if (sensorInterval !== undefined && !isValidInterval(sensorInterval)) {
      return sendError(
        res,
        400,
        '"sensorInterval" harus berupa bilangan bulat 1-60 menit.',
      );
    }

    const device = await prisma.device.findFirst({
      where: { id: id, userId: userId },
    });

    if (!device) {
      return sendError(
        res,
        404,
        "Device tidak ditemukan atau Anda tidak memiliki akses.",
      );
    }

    const updatedDevice = await prisma.device.update({
      where: { id: id },
      data: {
        label: label !== undefined ? label.trim() : device.label,
        plantId: plantId !== undefined ? plantId : device.plantId,
        polybagId: polybagId !== undefined ? polybagId : device.polybagId,
        status: status !== undefined ? status : device.status,
        sensorInterval:
          sensorInterval !== undefined
            ? Number(sensorInterval)
            : device.sensorInterval,
      },
      include: {
        plant: true,
        polybag: {
          include: { polybagType: true },
        },
      },
    });

    console.log(
      `[DeviceController] Menghitung status MQTT config | sensorInterval di body: ${sensorInterval} (Number: ${Number(sensorInterval)}), db lama: ${device.sensorInterval}`,
    );
    if (
      sensorInterval !== undefined &&
      Number(sensorInterval) !== device.sensorInterval
    ) {
      const intervalMin = Number(sensorInterval);
      console.log(
        `[DeviceController] Mengirim data interval baru ke MQTT: ${intervalMin} menit`,
      );
      publishDeviceConfig(device.deviceCode, intervalMin).catch((err) => {
        console.error(
          `[MQTT Publish] Gagal mengirim config saat update device:`,
          {
            message: err.message,
            stack: err.stack,
            deviceId: id,
          },
        );
      });
    }

    return sendSuccess(res, 200, "Info device berhasil diperbarui.", {
      device: updatedDevice,
    });
  } catch (error) {
    console.error("[DeviceController] Gagal memperbarui device:", {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
      deviceId: req.params?.id,
    });
    return next(error);
  }
};

exports.deleteDevice = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const device = await prisma.device.findFirst({
      where: { id: id, userId: userId },
    });

    if (!device) {
      return sendError(
        res,
        404,
        "Device tidak ditemukan atau Anda tidak memiliki akses.",
      );
    }

    await prisma.$transaction([
      prisma.rawSensorLog.deleteMany({ where: { deviceId: id } }),
      prisma.device.delete({ where: { id: id } }),
    ]);

    return sendSuccess(res, 200, "Device berhasil dihapus dari akun Anda.");
  } catch (error) {
    console.error("[DeviceController] Gagal menghapus device:", {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
      deviceId: req.params?.id,
    });
    return next(error);
  }
};

exports.getDeviceRecommendation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const device = await prisma.device.findFirst({
      where: { id: id, userId: userId },
      include: {
        plant: true,
        polybag: true,
      },
    });

    if (!device) {
      return sendError(
        res,
        404,
        "Device tidak ditemukan atau Anda tidak memiliki akses.",
      );
    }

    let sensorData = await getLatestSensorData(device.deviceCode);
    if (!sensorData) {
      const dbLog = await getLatestSensorLog(id);
      if (dbLog) {
        sensorData = {
          ph: dbLog.ph,
          moisture: dbLog.moisture,
          timestamp: dbLog.timestamp,
        };
      }
    }

    if (!sensorData) {
      return sendSuccess(
        res,
        200,
        "Belum ada data sensor tercatat untuk alat ini.",
        null,
      );
    }

    const intervalMinutes =
      Number.isFinite(device.sensorInterval) && device.sensorInterval > 0
        ? device.sensorInterval
        : 1;
    const ageMs = Date.now() - new Date(sensorData.timestamp).getTime();
    if (ageMs > 2 * intervalMinutes * 60 * 1000) {
      return sendSuccess(
        res,
        200,
        "Data sensor sudah lama. Periksa sensor, daya, atau koneksi alat.",
        null,
      );
    }

    const recommendation = await generateRecommendation({
      phValue: sensorData.ph,
      moistureValue: sensorData.moisture,
      polybagPreset: device.polybagId,
      plantIdOrName: device.plantId,
    });

    return sendSuccess(res, 200, "Rekomendasi Fuzzy Logic berhasil dibuat.", {
      ...recommendation,
      timestamp: sensorData.timestamp,
    });
  } catch (error) {
    console.error("[DeviceController] Gagal menghasilkan rekomendasi device:", {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
      deviceId: req.params?.id,
    });
    return next(error);
  }
};
