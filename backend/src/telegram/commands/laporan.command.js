"use strict";

const prisma = require("../../database/connections/prisma_client");
const { requireLinkedDevice } = require("../middlewares/require_linked_device.middleware");
const { resolveActiveDevice } = require("../session/session.service");
const { formatDeviceLabel, formatTimestamp } = require("../utils/format_message");

async function buildLaporanText(deviceId) {
  const device = await prisma.device.findUnique({ where: { id: deviceId }, include: { plant: true } });
  if (!device) return null;

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const logs = await prisma.recommendationLog.findMany({
    where: { deviceId, createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
  });

  if (logs.length === 0) {
    return `Laporan ${formatDeviceLabel(device)}\n\nBelum ada data rekomendasi dalam 7 hari terakhir.`;
  }

  const latest = logs[logs.length - 1];
  const avgPh = logs.reduce((sum, log) => sum + log.phValue, 0) / logs.length;
  const avgMoisture = logs.reduce((sum, log) => sum + log.moistureValue, 0) / logs.length;
  const treatmentCount = logs.filter(
    (log) => log.waterVolumeLiter > 0 || log.limeDosageGram > 0 || log.sulfurDosageGram > 0,
  ).length;

  return [
    `Laporan Mingguan ${formatDeviceLabel(device)}`,
    "",
    `Rata-rata pH: ${avgPh.toFixed(2)}`,
    `Rata-rata kelembapan: ${avgMoisture.toFixed(1)}%`,
    `Jumlah treatment disarankan: ${treatmentCount}x`,
    `Kategori terakhir: ${latest.categoryCode} (${latest.actionText})`,
    "",
    `Diperbarui: ${formatTimestamp(latest.createdAt)}`,
  ].join("\n");
}

async function baseHandler(ctx) {
  const device = await resolveActiveDevice(ctx.telegramUserId, ctx.devices);
  if (!device) {
    await ctx.reply("Anda memiliki lebih dari satu tanaman. Gunakan /tanaman untuk memilih tanaman aktif terlebih dahulu.");
    return;
  }

  const text = await buildLaporanText(device.id);
  await ctx.reply(text);
}

module.exports = {
  name: "laporan",
  description: "Menampilkan ringkasan mingguan on-demand",
  handler: requireLinkedDevice(baseHandler),
  buildLaporanText,
};
