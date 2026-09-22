"use strict";

const prisma = require("../../database/connections/prisma_client");
const { requireLinkedDevice } = require("../middlewares/require_linked_device.middleware");
const { buildCallbackData } = require("../utils/parse_callback_data");

async function baseHandler(ctx) {
  await ctx.reply("Apakah Anda yakin ingin memutuskan koneksi Telegram dari akun Subur.in?", {
    inline_keyboard: [
      [
        { text: "Ya, putuskan", callback_data: buildCallbackData("unlink", "confirm") },
        { text: "Batal", callback_data: buildCallbackData("unlink", "cancel") },
      ],
    ],
  });
}

async function handleCallback(ctx) {
  await ctx.answerCallback();

  if (ctx.parsed.action === "cancel") {
    await ctx.editKeyboard(null);
    await ctx.reply("Dibatalkan. Koneksi Telegram Anda tetap aktif.");
    return;
  }

  if (ctx.parsed.action === "confirm") {
    await prisma.user.update({
      where: { id: ctx.user.id },
      data: { telegramChatId: null, telegramLinkCode: null },
    });
    await ctx.editKeyboard(null);
    await ctx.reply("Koneksi Telegram berhasil diputuskan. Kirim /link KODE_ANDA jika ingin menghubungkan kembali.");
  }
}

module.exports = {
  name: "unlink",
  description: "Memutuskan koneksi Telegram dari akun Subur.in",
  handler: requireLinkedDevice(baseHandler, { requireDevice: false }),
  handleCallback,
};
