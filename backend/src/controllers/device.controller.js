const prisma = require('../database/connections/prisma_client');
const { getRedisClient } = require('../database/connections/redis');
const { generateRecommendation } = require('../ai/services/recommendation.service');
const { getLatestSensorData } = require('../repositories/sensor_redis_repository');
const { getLatestSensorLog } = require('../repositories/sensor_repository');
const { publishDeviceConfig } = require('../mqtt/publishers/config_publisher');


exports.getDiscoveredDevices = async (req, res) => {
  try {
    const redis = getRedisClient();

    
    const keys = await redis.keys('sensor:latest:*');

    if (keys.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Tidak ada device aktif baru yang terdeteksi.',
        data: { devices: [] }
      });
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

    return res.status(200).json({
      success: true,
      message: 'Berhasil mendeteksi device aktif yang belum terdaftar.',
      data: { devices: unclaimedDevices }
    });

  } catch (error) {
    console.error('Get Discovered Devices Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mencari device aktif.',
      error: error.message
    });
  }
};


exports.registerDevice = async (req, res) => {
  try {
    const userId = req.user.id;
    const { deviceId, label, plantId, polybagId, sensorInterval } = req.body;

    if (!deviceId || !label || !plantId || !polybagId) {
      return res.status(400).json({
        success: false,
        message: 'deviceId, label, plantId, dan polybagId wajib diisi.'
      });
    }

    
    const existingDevice = await prisma.device.findUnique({
      where: { id: deviceId }
    });

    if (existingDevice) {
      return res.status(400).json({
        success: false,
        message: 'Device dengan ID ini sudah terdaftar di sistem.'
      });
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
      console.error(`[MQTT Publish] Gagal mengirim config awal saat registrasi device:`, err.message);
    });

    return res.status(201).json({
      success: true,
      message: 'Device berhasil didaftarkan dan dihubungkan ke akun Anda.',
      data: { device: newDevice }
    });

  } catch (error) {
    console.error('Register Device Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mendaftarkan device.',
      error: error.message
    });
  }
};


exports.getMyDevices = async (req, res) => {
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

    return res.status(200).json({
      success: true,
      message: 'Daftar device Anda berhasil diambil.',
      data: { devices }
    });

  } catch (error) {
    console.error('Get My Devices Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil daftar device.',
      error: error.message
    });
  }
};


exports.updateDevice = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { label, plantId, polybagId, status, sensorInterval } = req.body;

    
    const device = await prisma.device.findFirst({
      where: { id: id, userId: userId }
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device tidak ditemukan atau Anda tidak memiliki akses.'
      });
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

    console.log(`[Update Device] Menghitung status MQTT config | sensorInterval di body: ${sensorInterval} (Number: ${Number(sensorInterval)}), db lama: ${device.sensorInterval}`);
    if (sensorInterval !== undefined && Number(sensorInterval) !== device.sensorInterval) {
      const intervalMin = Number(sensorInterval);
      console.log(`[Update Device] Mengirim data interval baru ke MQTT: ${intervalMin} menit`);
      publishDeviceConfig(id, intervalMin).catch(err => {
        console.error(`[MQTT Publish] Gagal mengirim config saat update device:`, err.message);
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Info device berhasil diperbarui.',
      data: { device: updatedDevice }
    });

  } catch (error) {
    console.error('Update Device Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui device.',
      error: error.message
    });
  }
};


exports.deleteDevice = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    
    const device = await prisma.device.findFirst({
      where: { id: id, userId: userId }
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device tidak ditemukan atau Anda tidak memiliki akses.'
      });
    }

    await prisma.device.delete({
      where: { id: id }
    });

    return res.status(200).json({
      success: true,
      message: 'Device berhasil dihapus dari akun Anda.'
    });

  } catch (error) {
    console.error('Delete Device Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus device.',
      error: error.message
    });
  }
};


exports.getDeviceRecommendation = async (req, res) => {
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
      return res.status(404).json({
        success: false,
        message: 'Device tidak ditemukan atau Anda tidak memiliki akses.'
      });
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
      return res.status(200).json({
        success: true,
        message: 'Belum ada data sensor tercatat untuk alat ini.',
        data: null
      });
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

    return res.status(200).json({
      success: true,
      message: 'Rekomendasi Fuzzy Logic berhasil dibuat.',
      data: {
        ...recommendation,
        logId: savedLog.id,
        timestamp: sensorData.timestamp
      }
    });

  } catch (error) {
    console.error('Get Device Recommendation Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghasilkan rekomendasi.',
      error: error.message
    });
  }
};

exports.sendDeviceConfig = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { delay_ms } = req.body;

    if (delay_ms === undefined || delay_ms === null) {
      return res.status(400).json({
        success: false,
        message: 'Field "delay_ms" wajib diisi.'
      });
    }

    const parsedDelay = Number(delay_ms);
    if (!Number.isInteger(parsedDelay) || parsedDelay < 100) {
      return res.status(400).json({
        success: false,
        message: '"delay_ms" harus berupa bilangan bulat dan minimal 100 ms.'
      });
    }

    const device = await prisma.device.findFirst({
      where: { id, userId }
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device tidak ditemukan atau Anda tidak memiliki akses.'
      });
    }

    const result = await publishDeviceConfig(id, parsedDelay);

    return res.status(200).json({
      success: true,
      message: `Konfigurasi delay berhasil dikirim ke device "${id}".`,
      data: {
        deviceId: id,
        topic: result.topic,
        payload: result.payload
      }
    });
  } catch (error) {
    console.error('Send Device Config Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengirim konfigurasi ke device.',
      error: error.message
    });
  }
};
