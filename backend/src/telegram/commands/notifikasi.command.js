"use strict";

const prisma = require("../../database/connections/prisma_client");
const { requireLinkedDevice } = require("../middlewares/require_linked_device.middleware");
const { buildNotifikasiKeyboard } = require("../keyboards/notifikasi.keyboard");

function statusText(enabled) {
  return `Notifikasi perubahan kategori C1-C9 saat ini: ${enabled ? "AKTIF" : "NONAKTIF"}.`;
}

async function setNotify(ctx, enabled) {
  await prisma.user.update({
    where: { id: ctx.user.id },
    data: { telegramNotifyEnabled: enabled },
  });
  await ctx.reply(
    enabled ? "Notifikasi perubahan kategori C1-C9 diaktifkan." : "Notifikasi perubahan kategori C1-C9 dinonaktifkan.",
  );
}

async function baseHandler(ctx) {
  const arg = (ctx.args[0] || "").toLowerCase();

  if (arg === "on" || arg === "off") {
    await setNotify(ctx, arg === "on");
    return;
  }

  await ctx.reply(
    `${statusText(ctx.user.telegramNotifyEnabled)}\n\nGunakan /notifikasi on atau /notifikasi off, atau tekan tombol di bawah.`,
    buildNotifikasiKeyboard(ctx.user.telegramNotifyEnabled),
  );
}

async function handleCallback(ctx) {
  await ctx.answerCallback();
  if (ctx.parsed.action !== "set") return;
  await ctx.editKeyboard(null);
  await setNotify(ctx, ctx.parsed.value === "on");
}

module.exports = {
  name: "notifikasi",
  description: "Mengatur notifikasi perubahan kategori: /notifikasi on|off",
  handler: requireLinkedDevice(baseHandler, { requireDevice: false }),
  handleCallback,
};
