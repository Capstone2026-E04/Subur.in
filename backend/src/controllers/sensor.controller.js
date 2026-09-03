"use strict";

const { addClient, removeClient } = require("../sse/sse_manager");
const { getLatestSensorData } = require("../repositories/sensor_redis_repository");
const { getLatestSensorLog, getSensorHistory } = require("../repositories/sensor_repository");

exports.streamSensorData = (req, res) => {
  const { deviceId } = req.params;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ connected: true, deviceId })}\n\n`);

  addClient(deviceId, res);

  const keepAlive = setInterval(() => {
    res.write(`: keepalive\n\n`);
  }, 20000);

  req.on("close", () => {
    clearInterval(keepAlive);
    removeClient(deviceId, res);
  });
};

exports.getLatestSensor = async (req, res) => {
  const { deviceId } = req.params;

  try {
    let data = await getLatestSensorData(deviceId);

    if (!data) {
      console.log(`[Sensor Controller] Cache miss atau Redis down. Mencari data terbaru di database untuk device "${deviceId}"...`);
      const dbLog = await getLatestSensorLog(deviceId);
      if (dbLog) {
        data = {
          deviceId: dbLog.deviceId,
          ph: dbLog.ph,
          moisture: dbLog.moisture,
          timestamp: dbLog.timestamp,
        };
      }
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: `Belum ada data sensor untuk device "${deviceId}".`,
      });
    }
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("[Sensor Controller]  Error getLatestSensor:", err.message);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data sensor.",
      error: err.message,
    });
  }
};

exports.getSensorHistory = async (req, res) => {
  const { deviceId } = req.params;
  const limit = parseInt(req.query.limit) || 30;

  const retries = 3;
  const delay = 250;
  let history = null;
  let lastError = null;

  for (let i = 0; i < retries; i++) {
    try {
      history = await getSensorHistory(deviceId, limit);
      break;
    } catch (err) {
      lastError = err;
      if (i < retries - 1) {
        console.warn(
          `[Prisma History Query] ️ Gagal mengambil riwayat (percobaan ke-${i + 1}/${retries}). Mencoba kembali dalam ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  if (history !== null) {
    return res.status(200).json({
      success: true,
      data: history,
    });
  }

  console.error("[Sensor Controller]  Error getSensorHistory:", lastError.message);
  return res.status(500).json({
    success: false,
    message: "Gagal mengambil riwayat sensor setelah beberapa percobaan.",
    error: lastError.message,
  });
};
