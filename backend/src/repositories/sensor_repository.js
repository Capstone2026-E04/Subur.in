"use strict";

const prisma = require("../database/connections/prisma_client");

async function findDeviceById(deviceId) {
  return await prisma.device.findUnique({
    where: { id: deviceId },
  });
}

async function saveRawSensorLog(deviceId, ph, moisture, isDev = false) {
  return await prisma.rawSensorLog.create({
    data: {
      deviceId: deviceId,
      ph: ph,
      moisture: moisture,
      isDev,
    },
  });
}

// Idempoten lewat UNIQUE(device_id, record_id); true bila record baru tersimpan.
// measuredAt null = jam ESP32 belum sinkron NTP: waktu terima hanya penanda posisi, time_synced=false.
async function saveBufferedSensorLog(
  deviceId,
  recordId,
  ph,
  moisture,
  measuredAt,
  isDev = false,
) {
  const { count } = await prisma.rawSensorLog.createMany({
    data: [
      {
        deviceId,
        recordId,
        ph,
        moisture,
        isDev,
        timestamp: measuredAt ?? undefined,
        timeSynced: measuredAt !== null,
      },
    ],
    skipDuplicates: true,
  });
  return count === 1;
}

async function updateDeviceLastSeen(deviceId) {
  return await prisma.device.update({
    where: { id: deviceId },
    data: {
      lastSeenAt: new Date(),
    },
  });
}

async function getLatestSensorLog(deviceId) {
  return await prisma.rawSensorLog.findFirst({
    where: { deviceId },
    orderBy: { timestamp: "desc" },
  });
}

async function getSensorHistory(deviceId, limit = 30) {
  const logs = await prisma.rawSensorLog.findMany({
    where: { deviceId },
    orderBy: { timestamp: "desc" },
    take: limit,
  });
  return logs.reverse();
}

async function getSensorHistorySince(deviceId, sinceDate) {
  const logs = await prisma.rawSensorLog.findMany({
    where: { deviceId, timestamp: { gte: sinceDate } },
    orderBy: { timestamp: "asc" },
  });
  return logs;
}

module.exports = {
  findDeviceById,
  saveRawSensorLog,
  saveBufferedSensorLog,
  updateDeviceLastSeen,
  getLatestSensorLog,
  getSensorHistory,
  getSensorHistorySince,
};
