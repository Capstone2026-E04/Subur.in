const prisma = require("../../database/connections/prisma_client");
const {
  getSensorHistorySince,
} = require("../../repositories/sensor_repository");
const { evaluatePhMonitor } = require("../core/ph_monitor");
const { median } = require("../core/water_schedule");
const { PH_MONITOR_MIN_SAMPLES } = require("../config/treatment_constants");

const DAY_MS = 24 * 60 * 60 * 1000;

function windowMedian(logs, from, to) {
  const values = logs
    .filter((l) => l.timestamp > from && l.timestamp <= to)
    .map((l) => l.ph);
  return values.length >= PH_MONITOR_MIN_SAMPLES ? median(values) : null;
}

async function getPhMonitor(deviceId, plant, now = new Date()) {
  const [logs, correction] = await Promise.all([
    getSensorHistorySince(deviceId, new Date(now - 2 * DAY_MS)),
    prisma.correctionLog.findFirst({
      where: { deviceId },
      orderBy: { appliedAt: "desc" },
    }),
  ]);
  const dayAgo = new Date(now - DAY_MS);
  const twoDaysAgo = new Date(now - 2 * DAY_MS);
  return evaluatePhMonitor({
    current: windowMedian(logs, dayAgo, now),
    previous: windowMedian(logs, twoDaysAgo, dayAgo),
    plant,
    correction,
    now,
  });
}

module.exports = { getPhMonitor };
