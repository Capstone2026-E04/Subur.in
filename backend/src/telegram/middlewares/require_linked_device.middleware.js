"use strict";

function requireLinkedDevice(handler, { requireDevice = true } = {}) {
  return async function wrapped(ctx) {
    if (!ctx.user) {
      await ctx.reply(
        "Akun Telegram Anda belum terhubung ke Subur.in. Kirim /link KODE_ANDA untuk menghubungkan akun terlebih dahulu.",
      );
      return;
    }

    if (requireDevice && ctx.devices.length === 0) {
      await ctx.reply(
        "Anda belum memiliki device yang terdaftar. Daftarkan device melalui dashboard Subur.in terlebih dahulu.",
      );
      return;
    }

    return handler(ctx);
  };
}

module.exports = { requireLinkedDevice };
