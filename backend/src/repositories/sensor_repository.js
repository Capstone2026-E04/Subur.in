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

async function saveRejectedSensorRecord(deviceId, recordId, payload, reason) {
  await prisma.rejectedSensorRecord.createMany({
    data: [{ deviceId, recordId, payload, reason }],
    skipDuplicates: true,
  });
}

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

async function getSensorHistorySince(deviceId, sinceDate, untilDate, take) {
  const logs = await prisma.rawSensorLog.findMany({
    where: {
      deviceId,
      timestamp: { gte: sinceDate, ...(untilDate && { lte: untilDate }) },
    },
    orderBy: { timestamp: "asc" },
    ...(take && { take }),
  });
  return logs;
}

const WIB_OFFSET_SECONDS = 7 * 3600;

async function getSensorHistoryBuckets(deviceId, from, to, bucketSeconds) {
  const rows = await prisma.$queryRaw`
    SELECT
      floor((extract(epoch FROM "timestamp") + ${WIB_OFFSET_SECONDS}::float8) / ${bucketSeconds}::float8)::float8 AS bucket,
      avg(ph) AS ph,
      avg(moisture) AS moisture
    FROM raw_sensor_logs
    WHERE device_id = ${deviceId}::uuid
      AND "timestamp" >= ${from}
      AND "timestamp" <= ${to}
    GROUP BY 1
    ORDER BY 1`;
  return rows.map((row) => ({
    timestamp: new Date(
      (row.bucket * bucketSeconds - WIB_OFFSET_SECONDS) * 1000,
    ).toISOString(),
    ph: Number(row.ph),
    moisture: Number(row.moisture),
  }));
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
  getSensorHistoryBuckets,
};
