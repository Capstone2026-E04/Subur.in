"use strict";

const { requireLinkedDevice } = require("../middlewares/require_linked_device.middleware");
const { resolveActiveDevice } = require("../session/session.service");
const { formatDeviceLabel, formatTimestamp } = require("../utils/format_message");

async function baseHandler(ctx) {
  const device = await resolveActiveDevice(ctx.telegramUserId, ctx.devices);
  if (!device) {
    await ctx.reply("Anda memiliki lebih dari satu tanaman. Gunakan /tanaman untuk memilih tanaman aktif terlebih dahulu.");
    return;
  }

  let connectionStatus = "Belum pernah mengirim data";
  if (device.lastSeenAt) {
    const offlineThresholdMs = 2 * device.sensorInterval * 60 * 1000;
    const isOnline = Date.now() - new Date(device.lastSeenAt).getTime() <= offlineThresholdMs;
    connectionStatus = isOnline ? "Online" : "Offline";
  }

  await ctx.reply(
    `Info ${formatDeviceLabel(device)}\n\n` +
      `ID Device: ${device.id}\n` +
      `Status koneksi: ${connectionStatus}\n` +
      `Terakhir terlihat: ${device.lastSeenAt ? formatTimestamp(device.lastSeenAt) : "Belum ada data"}\n` +
      `Interval sensor: ${device.sensorInterval} menit`,
  );
}

module.exports = {
  name: "device",
  description: "Menampilkan info koneksi dan status perangkat",
  handler: requireLinkedDevice(baseHandler),
};
