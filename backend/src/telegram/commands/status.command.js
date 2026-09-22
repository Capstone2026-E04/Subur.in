"use strict";

const prisma = require("../../database/connections/prisma_client");
const { requireLinkedDevice } = require("../middlewares/require_linked_device.middleware");
const { resolveActiveDevice } = require("../session/session.service");
const { formatDeviceLabel, formatTimestamp } = require("../utils/format_message");

async function baseHandler(ctx) {
  const device = await resolveActiveDevice(ctx.telegramUserId, ctx.devices);
  if (!device) {
    await ctx.reply("Anda memiliki lebih dari satu tanaman. Gunakan /tanaman untuk memilih tanaman aktif terlebih dahulu.");
    return;
  }

  const log = await prisma.recommendationLog.findFirst({
    where: { deviceId: device.id },
    orderBy: { createdAt: "desc" },
  });

  if (!log) {
    await ctx.reply(`Belum ada data sensor tercatat untuk ${formatDeviceLabel(device)}.`);
    return;
  }

  await ctx.reply(
    `Status ${formatDeviceLabel(device)}\n\n` +
      `pH: ${log.phValue}\n` +
      `Kelembapan: ${log.moistureValue}%\n` +
      `Kategori: ${log.categoryCode}\n` +
      `Kondisi: ${log.actionText}\n` +
      `Terakhir diperbarui: ${formatTimestamp(log.createdAt)}`,
  );
}

module.exports = {
  name: "status",
  description: "Menampilkan data sensor dan kategori fuzzy terkini",
  handler: requireLinkedDevice(baseHandler),
};
