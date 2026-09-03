"use strict";

const prisma = require("../database/connections/prisma_client");

async function findDeviceById(deviceId) {
  return await prisma.device.findUnique({
    where: { id: deviceId },
  });
}

async function saveRawSensorLog(deviceId, ph, moisture) {
  return await prisma.rawSensorLog.create({
    data: {
      deviceId: deviceId,
      ph: ph,
      moisture: moisture,
    },
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

module.exports = {
  findDeviceById,
  saveRawSensorLog,
  updateDeviceLastSeen,
  getLatestSensorLog,
  getSensorHistory,
};

