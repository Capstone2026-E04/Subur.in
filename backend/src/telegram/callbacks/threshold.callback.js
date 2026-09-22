"use strict";

const { resolveActiveDevice, setWizard } = require("../session/session.service");
const { WIZARD_TYPE } = require("../session/session.constants");
const { PARAMETER_RANGES } = require("../commands/threshold.command");

async function handleCallback(ctx) {
  await ctx.answerCallback();

  const parameter = ctx.parsed.value;
  if (ctx.parsed.action !== "param" || !PARAMETER_RANGES[parameter]) return;

  const device = await resolveActiveDevice(ctx.telegramUserId, ctx.devices);
  if (!device) {
    await ctx.reply("Anda memiliki lebih dari satu tanaman. Gunakan /tanaman untuk memilih tanaman aktif terlebih dahulu.");
    return;
  }

  await setWizard(ctx.telegramUserId, { type: WIZARD_TYPE.THRESHOLD, parameter, deviceId: device.id });
  await ctx.editKeyboard(null);

  const range = PARAMETER_RANGES[parameter];
  await ctx.reply(`Kirim nilai minimum dan maksimum ${range.label} dipisahkan spasi.\nContoh: ${range.example}`);
}

module.exports = { handleCallback };
