"use strict";

const { requireLinkedDevice } = require("../middlewares/require_linked_device.middleware");
const { buildTanamanKeyboard } = require("../keyboards/tanaman.keyboard");

async function baseHandler(ctx) {
  await ctx.reply("Pilih tanaman aktif:", buildTanamanKeyboard(ctx.devices));
}

module.exports = {
  name: "tanaman",
  description: "Memilih tanaman aktif untuk /status, /riwayat, /rekomendasi, dan /device",
  handler: requireLinkedDevice(baseHandler),
};
