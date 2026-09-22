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
    await ctx.reply(`Belum ada rekomendasi tercatat untuk ${formatDeviceLabel(device)}.`);
    return;
  }

  const lines = [
    `Rekomendasi ${formatDeviceLabel(device)}`,
    "",
    `Kategori penyebab: ${log.categoryCode}`,
    `Penjelasan: ${log.actionText}`,
    "",
    "Dosis treatment:",
  ];

  if (log.waterVolumeLiter > 0) lines.push(`- Air: ${log.waterVolumeLiter.toFixed(2)} liter`);
  if (log.limeDosageGram > 0) lines.push(`- Dolomit: ${log.limeDosageGram.toFixed(1)} gram`);
  if (log.sulfurDosageGram > 0) lines.push(`- Sulfur: ${log.sulfurDosageGram.toFixed(1)} gram`);
  if (log.reduceWatering) lines.push("- Kurangi penyiraman sementara.");
  if (log.waterVolumeLiter === 0 && log.limeDosageGram === 0 && log.sulfurDosageGram === 0 && !log.reduceWatering) {
    lines.push("- Tidak ada treatment yang diperlukan saat ini.");
  }

  lines.push("", `Terakhir diperbarui: ${formatTimestamp(log.createdAt)}`);

  await ctx.reply(lines.join("\n"));
}

module.exports = {
  name: "rekomendasi",
  description: "Menampilkan rekomendasi treatment dan breakdown dosis terakhir",
  handler: requireLinkedDevice(baseHandler),
};
