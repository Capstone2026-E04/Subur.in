"use strict";

const prisma = require("../database/connections/prisma_client");

async function findDeviceById(deviceId) {
  return await prisma.device.findUnique({
    where: { id: deviceId },
  });
}

async function saveRawSensorLog(
  deviceId,
  ph,
  moisture,
  isDev = false,
  moistureType = "legacy_index",
) {
  return await prisma.rawSensorLog.create({
    data: {
      deviceId: deviceId,
      ph: ph,
      moisture: moisture,
      moistureType,
      isDev,
    },
  });
}

// Idempoten lewat UNIQUE(device_id, record_id); payload asli disimpan utuh bersama alasan penolakan.
async function saveRejectedSensorRecord(deviceId, recordId, payload, reason) {
  await prisma.rejectedSensorRecord.createMany({
    data: [{ deviceId, recordId, payload, reason }],
    skipDuplicates: true,
  });
}

// Idempoten lewat sensor_record_receipts (PK device_id+record_id, tidak dipartisi sehingga tetap
// unik walau measured_at null); receipt dan log satu transaksi. true bila record baru tersimpan.
// measuredAt null = jam ESP32 belum sinkron NTP: waktu terima hanya penanda posisi, time_synced=false.
async function saveBufferedSensorLog(
  deviceId,
  recordId,
  ph,
  moisture,
  moistureType,
  measuredAt,
  isDev = false,
) {
  return await prisma.$transaction(async (tx) => {
    const { count } = await tx.sensorRecordReceipt.createMany({
      data: [{ deviceId, recordId }],
      skipDuplicates: true,
    });
    if (count === 0) return false;
    await tx.rawSensorLog.create({
      data: {
        deviceId,
        recordId,
        ph,
        moisture,
        moistureType,
        isDev,
        timestamp: measuredAt ?? undefined,
        timeSynced: measuredAt !== null,
      },
    });
    return true;
  });
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
  saveRejectedSensorRecord,
  updateDeviceLastSeen,
  getLatestSensorLog,
  getSensorHistory,
  getSensorHistorySince,
};
