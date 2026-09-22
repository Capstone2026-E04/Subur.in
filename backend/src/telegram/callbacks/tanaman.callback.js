"use strict";

const { setActiveDeviceId } = require("../session/session.service");

async function handleCallback(ctx) {
  await ctx.answerCallback();

  if (ctx.parsed.action !== "select") return;

  const device = ctx.devices.find((d) => d.id === ctx.parsed.value);

  if (!device) {
    await ctx.reply("Device tidak ditemukan atau bukan milik Anda.");
    return;
  }

  await setActiveDeviceId(ctx.telegramUserId, device.id);
  await ctx.editKeyboard(null);
  await ctx.reply(`Tanaman aktif diatur ke: ${device.label} (${device.plant?.name || "?"}).`);
}

module.exports = { handleCallback };
