"use strict";

const { requireLinkedDevice } = require("../middlewares/require_linked_device.middleware");
const { resolveActiveDevice } = require("../session/session.service");
const { getSensorHistorySince } = require("../../repositories/sensor_repository");
const { buildHistoryChartUrl } = require("../utils/format_chart");
const { formatDeviceLabel } = require("../utils/format_message");

const VALID_RANGES = { "7d": 7, "30d": 30 };

async function baseHandler(ctx) {
  const rangeArg = (ctx.args[0] || "7d").toLowerCase();

  if (!VALID_RANGES[rangeArg]) {
    await ctx.reply("Rentang tidak valid. Gunakan: /riwayat 7d atau /riwayat 30d.");
    return;
  }

  const device = await resolveActiveDevice(ctx.telegramUserId, ctx.devices);
  if (!device) {
    await ctx.reply("Anda memiliki lebih dari satu tanaman. Gunakan /tanaman untuk memilih tanaman aktif terlebih dahulu.");
    return;
  }

  const days = VALID_RANGES[rangeArg];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const logs = await getSensorHistorySince(device.id, since);

  if (logs.length === 0) {
    await ctx.reply(`Belum ada data histori sensor dalam ${days} hari terakhir untuk ${formatDeviceLabel(device)}.`);
    return;
  }

  const chartUrl = buildHistoryChartUrl(logs);
  await ctx.replyPhoto(chartUrl, `Riwayat pH & kelembapan ${formatDeviceLabel(device)} (${days} hari terakhir)`);
}

module.exports = {
  name: "riwayat",
  description: "Menampilkan grafik riwayat sensor: /riwayat [7d|30d]",
  handler: requireLinkedDevice(baseHandler),
};
