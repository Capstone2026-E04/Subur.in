const prisma = require('../database/connections/prisma_client');
const { getRedisClient } = require('../database/connections/redis');
const { generateRecommendation } = require('../ai/services/recommendation.service');
const { getLatestSensorData } = require('../repositories/sensor_redis_repository');
const { getLatestSensorLog } = require('../repositories/sensor_repository');
const { publishDeviceConfig } = require('../mqtt/publishers/config_publisher');
const { sendSuccess, sendError } = require('../utils/response');


exports.getDiscoveredDevices = async (req, res, next) => {
  try {
    const redis = getRedisClient();


    const keys = await redis.keys('sensor:latest:*');

    if (keys.length === 0) {
      return sendSuccess(res, 200, 'Tidak ada device aktif baru yang terdeteksi.', { devices: [] });
    }


    const activeDevices = [];
    for (const key of keys) {
      const rawData = await redis.get(key);
      if (rawData) {
        activeDevices.push(JSON.parse(rawData));
      }
    }


    const activeDeviceIds = activeDevices.map(d => d.deviceId);


    const registeredDevices = await prisma.device.findMany({
      where: {
        id: { in: activeDeviceIds }
      },
      select: { id: true }
    });

    const registeredIds = new Set(registeredDevices.map(d => d.id));


    const unclaimedDevices = activeDevices.filter(d => !registeredIds.has(d.deviceId));

    return sendSuccess(res, 200, 'Berhasil mendeteksi device aktif yang belum terdaftar.', { devices: unclaimedDevices });

  } catch (error) {
    console.error('[DeviceController] Gagal mencari device aktif:', {
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
    const { deviceId, label, plantId, polybagId, sensorInterval } = req.body;

    if (!deviceId || !label || !plantId || !polybagId) {
      return sendError(res, 400, 'deviceId, label, plantId, dan polybagId wajib diisi.');
    }


    const existingDevice = await prisma.device.findUnique({
      where: { id: deviceId }
    });

    if (existingDevice) {
      return sendError(res, 400, 'Device dengan ID ini sudah terdaftar di sistem.');
    }


    const newDevice = await prisma.device.create({
      data: {
        id: deviceId,
        userId: userId,
        label: label.trim(),
        plantId: plantId,
        polybagId: polybagId,
        status: 'ACTIVE',
        sensorInterval: sensorInterval !== undefined ? Number(sensorInterval) : 15
      },
      include: {
        plant: true,
        polybag: {
          include: { polybagType: true }
        }
      }
    });

    const intervalMin = sensorInterval !== undefined ? Number(sensorInterval) : 15;
    publishDeviceConfig(deviceId, intervalMin).catch(err => {
      console.error(`[MQTT Publish] Gagal mengirim config awal saat registrasi device:`, {
        message: err.message,
        stack: err.stack,
        deviceId,
      });
    });

    return sendSuccess(res, 201, 'Device berhasil didaftarkan dan dihubungkan ke akun Anda.', { device: newDevice });

  } catch (error) {
    console.error('[DeviceController] Gagal mendaftarkan device:', {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
      deviceId: req.body?.deviceId,
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
          include: { polybagType: true }
        }
      }
    });

    return sendSuccess(res, 200, 'Daftar device Anda berhasil diambil.', { devices });

  } catch (error) {
    console.error('[DeviceController] Gagal mengambil daftar device:', {
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


    const device = await prisma.device.findFirst({
      where: { id: id, userId: userId }
    });

    if (!device) {
      return sendError(res, 404, 'Device tidak ditemukan atau Anda tidak memiliki akses.');
    }

    const updatedDevice = await prisma.device.update({
      where: { id: id },
      data: {
        label: label !== undefined ? label.trim() : device.label,
        plantId: plantId !== undefined ? plantId : device.plantId,
        polybagId: polybagId !== undefined ? polybagId : device.polybagId,
        status: status !== undefined ? status : device.status,
        sensorInterval: sensorInterval !== undefined ? Number(sensorInterval) : device.sensorInterval
      },
      include: {
        plant: true,
        polybag: {
          include: { polybagType: true }
        }
      }
    });

    console.log(`[DeviceController] Menghitung status MQTT config | sensorInterval di body: ${sensorInterval} (Number: ${Number(sensorInterval)}), db lama: ${device.sensorInterval}`);
    if (sensorInterval !== undefined && Number(sensorInterval) !== device.sensorInterval) {
      const intervalMin = Number(sensorInterval);
      console.log(`[DeviceController] Mengirim data interval baru ke MQTT: ${intervalMin} menit`);
      publishDeviceConfig(id, intervalMin).catch(err => {
        console.error(`[MQTT Publish] Gagal mengirim config saat update device:`, {
          message: err.message,
          stack: err.stack,
          deviceId: id,
        });
      });
    }

    return sendSuccess(res, 200, 'Info device berhasil diperbarui.', { device: updatedDevice });

  } catch (error) {
    console.error('[DeviceController] Gagal memperbarui device:', {
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
      where: { id: id, userId: userId }
    });

    if (!device) {
      return sendError(res, 404, 'Device tidak ditemukan atau Anda tidak memiliki akses.');
    }

    await prisma.device.delete({
      where: { id: id }
    });

    return sendSuccess(res, 200, 'Device berhasil dihapus dari akun Anda.');

  } catch (error) {
    console.error('[DeviceController] Gagal menghapus device:', {
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
        polybag: true
      }
    });

    if (!device) {
      return sendError(res, 404, 'Device tidak ditemukan atau Anda tidak memiliki akses.');
    }


    let sensorData = await getLatestSensorData(id);
    if (!sensorData) {
      const dbLog = await getLatestSensorLog(id);
      if (dbLog) {
        sensorData = {
          ph: dbLog.ph,
          moisture: dbLog.moisture,
          timestamp: dbLog.timestamp
        };
      }
    }

    if (!sensorData) {
      return sendSuccess(res, 200, 'Belum ada data sensor tercatat untuk alat ini.', null);
    }


    const recommendation = await generateRecommendation({
      phValue: sensorData.ph,
      moistureValue: sensorData.moisture,
      polybagPreset: device.polybagId,
      plantIdOrName: device.plantId
    });


    const savedLog = await prisma.recommendationLog.create({
      data: {
        deviceId: id,
        phValue: sensorData.ph,
        moistureValue: sensorData.moisture,
        fuzzyIndex: recommendation.fuzzyIndex,
        categoryCode: recommendation.categoryCode,
        actionText: recommendation.actionText,
        waterVolumeLiter: recommendation.waterVolumeLiter,
        limeDosageGram: recommendation.limeDosageGram,
        sulfurDosageGram: recommendation.sulfurDosageGram,
        reduceWatering: recommendation.reduceWatering
      }
    });

    return sendSuccess(res, 200, 'Rekomendasi Fuzzy Logic berhasil dibuat.', {
      ...recommendation,
      logId: savedLog.id,
      timestamp: sensorData.timestamp
    });

  } catch (error) {
    console.error('[DeviceController] Gagal menghasilkan rekomendasi device:', {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
      deviceId: req.params?.id,
    });
    return next(error);
  }
};

exports.sendDeviceConfig = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { delay_ms } = req.body;

    if (delay_ms === undefined || delay_ms === null) {
      return sendError(res, 400, 'Field "delay_ms" wajib diisi.');
    }

    const parsedDelay = Number(delay_ms);
    if (!Number.isInteger(parsedDelay) || parsedDelay < 100) {
      return sendError(res, 400, '"delay_ms" harus berupa bilangan bulat dan minimal 100 ms.');
    }

    const device = await prisma.device.findFirst({
      where: { id, userId }
    });

    if (!device) {
      return sendError(res, 404, 'Device tidak ditemukan atau Anda tidak memiliki akses.');
    }

    const result = await publishDeviceConfig(id, parsedDelay);

    return sendSuccess(res, 200, `Konfigurasi delay berhasil dikirim ke device "${id}".`, {
      deviceId: id,
      topic: result.topic,
      payload: result.payload
    });
  } catch (error) {
    console.error('[DeviceController] Gagal mengirim konfigurasi ke device:', {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
      deviceId: req.params?.id,
    });
    return next(error);
  }
};
