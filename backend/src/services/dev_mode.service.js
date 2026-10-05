"use strict";

const prisma = require("../database/connections/prisma_client");
const {
  handleSensorMessage,
} = require("../mqtt/subscribers/sensor_subscriber");

const TICK_MS = 5000;

const timers = new Map();

const rand = (min, max) =>
  Math.round((min + Math.random() * (max - min)) * 10) / 10;

async function tick(userId) {
  try {
    const devices = await prisma.device.findMany({
      where: { userId },
      select: { id: true },
    });
    for (const { id } of devices) {
      const payload = Buffer.from(
        JSON.stringify({ ph: rand(4.5, 8), moisture: rand(20, 90) }),
      );
      await handleSensorMessage(`suburin/devices/${id}/telemetry`, payload);
    }
  } catch (err) {
    console.error("[DevMode] Gagal menjalankan simulasi:", {
      message: err.message,
      stack: err.stack,
      userId,
    });
  }
}

function isEnabled(userId) {
  return timers.has(userId);
}

function setEnabled(userId, enabled) {
  if (enabled && !timers.has(userId)) {
    tick(userId);
    timers.set(
      userId,
      setInterval(() => tick(userId), TICK_MS),
    );
  } else if (!enabled && timers.has(userId)) {
    clearInterval(timers.get(userId));
    timers.delete(userId);
  }
}

module.exports = { isEnabled, setEnabled };
