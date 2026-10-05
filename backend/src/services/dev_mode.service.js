"use strict";

const prisma = require("../database/connections/prisma_client");
const {
  handleSensorMessage,
} = require("../mqtt/subscribers/sensor_subscriber");

const TICK_MS = 5000;

const timers = new Map();

const rand = (min, max) =>
  Math.round((min + Math.random() * (max - min)) * 10) / 10;

const CRITICAL_CHANCE = 0.3;

// Kondisi kritis yang memicu notifyDevice. Kering/basah butuh 2 pembacaan
// berturut-turut, jadi dikirim dua kali.
const CRITICAL_SCENARIOS = [
  () => Array(2).fill({ ph: rand(6, 7), moisture: rand(0, 20) }), // kering
  () => Array(2).fill({ ph: rand(6, 7), moisture: rand(90, 100) }), // basah
  () => [{ ph: rand(0, 3.5), moisture: rand(25, 35) }], // pH asam
  () => [{ ph: rand(10, 14), moisture: rand(25, 35) }], // pH basa
];

function pickReadings() {
  if (Math.random() < CRITICAL_CHANCE) {
    const scenario =
      CRITICAL_SCENARIOS[Math.floor(Math.random() * CRITICAL_SCENARIOS.length)];
    return scenario();
  }
  return [{ ph: rand(0, 14), moisture: rand(0, 100) }];
}

async function tick(userId) {
  try {
    const devices = await prisma.device.findMany({
      where: { userId },
      select: { id: true },
    });
    for (const { id } of devices) {
      for (const reading of pickReadings()) {
        await handleSensorMessage(
          `suburin/devices/${id}/telemetry`,
          Buffer.from(JSON.stringify(reading)),
        );
      }
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

module.exports = { isEnabled, setEnabled, pickReadings };
