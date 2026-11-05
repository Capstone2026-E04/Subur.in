"use strict";

const {
  requireLinkedDevice,
} = require("../middlewares/require_linked_device.middleware");
const { resolveActiveDevice } = require("../session/session.service");
const {
  confirmLatestRecommendation,
} = require("../../services/recommendation_confirmation.service");
const { formatDeviceLabel } = require("../utils/format_message");

async function baseHandler(ctx) {
  const device = await resolveActiveDevice(ctx.telegramUserId, ctx.devices);
  if (!device) {
    await ctx.reply(
      "Anda memiliki lebih dari satu tanaman. Gunakan /tanaman untuk memilih tanaman aktif terlebih dahulu.",
    );
    return;
  }

  const { status } = await confirmLatestRecommendation(
    device.id,
    device.deviceCode,
  );
  const label = formatDeviceLabel(device);
  const replies = {
    none: `Belum ada rekomendasi tercatat untuk ${label}.`,
    already: `Rekomendasi terbaru untuk ${label} sudah dikonfirmasi sebelumnya.`,
    confirmed: `Terima kasih, rekomendasi terbaru untuk ${label} dicatat sudah dilaksanakan.`,
  };
  await ctx.reply(replies[status]);
}

module.exports = {
  name: "sudah",
  description: "Konfirmasi bahwa rekomendasi terakhir sudah dilaksanakan",
  handler: requireLinkedDevice(baseHandler),
};
