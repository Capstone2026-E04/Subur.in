"use strict";

const { getRedisClient } = require("../../database/connections/redis");
const { SESSION_TTL_SECONDS, SESSION_KEY_PREFIX } = require("./session.constants");

function sessionKey(telegramUserId) {
  return `${SESSION_KEY_PREFIX}${telegramUserId}`;
}

async function getSession(telegramUserId) {
  try {
    const redis = getRedisClient();
    const raw = await redis.get(sessionKey(telegramUserId));
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error("[TelegramSessionService] Gagal mengambil sesi (fallback: anggap tidak ada sesi):", {
      message: err.message,
      stack: err.stack,
      telegramUserId,
    });
    return null;
  }
}

async function setSession(telegramUserId, data) {
  try {
    const redis = getRedisClient();
    await redis.set(sessionKey(telegramUserId), JSON.stringify(data), "EX", SESSION_TTL_SECONDS);
  } catch (err) {
    console.error("[TelegramSessionService] Gagal menyimpan sesi:", {
      message: err.message,
      stack: err.stack,
      telegramUserId,
    });
  }
}

async function updateSession(telegramUserId, patch) {
  const current = (await getSession(telegramUserId)) || {};
  await setSession(telegramUserId, { ...current, ...patch });
}

async function clearSession(telegramUserId) {
  try {
    const redis = getRedisClient();
    await redis.del(sessionKey(telegramUserId));
  } catch (err) {
    console.error("[TelegramSessionService] Gagal menghapus sesi:", {
      message: err.message,
      stack: err.stack,
      telegramUserId,
    });
  }
}

async function getWizard(telegramUserId) {
  const session = await getSession(telegramUserId);
  return session?.wizard || null;
}

async function setWizard(telegramUserId, wizardState) {
  await updateSession(telegramUserId, { wizard: wizardState });
}

async function clearWizard(telegramUserId) {
  await updateSession(telegramUserId, { wizard: null });
}

async function getActiveDeviceId(telegramUserId) {
  const session = await getSession(telegramUserId);
  return session?.activeDeviceId || null;
}

async function setActiveDeviceId(telegramUserId, deviceId) {
  await updateSession(telegramUserId, { activeDeviceId: deviceId });
}

async function resolveActiveDevice(telegramUserId, devices) {
  if (!devices || devices.length === 0) return null;
  if (devices.length === 1) return devices[0];

  const activeDeviceId = await getActiveDeviceId(telegramUserId);
  if (!activeDeviceId) return null;

  return devices.find((device) => device.id === activeDeviceId) || null;
}

module.exports = {
  getSession,
  setSession,
  updateSession,
  clearSession,
  getWizard,
  setWizard,
  clearWizard,
  getActiveDeviceId,
  setActiveDeviceId,
  resolveActiveDevice,
};
