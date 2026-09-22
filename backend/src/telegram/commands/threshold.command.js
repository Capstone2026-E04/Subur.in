"use strict";

const prisma = require("../../database/connections/prisma_client");
const { requireLinkedDevice } = require("../middlewares/require_linked_device.middleware");
const { resolveActiveDevice, clearWizard } = require("../session/session.service");
const { buildThresholdParameterKeyboard } = require("../keyboards/threshold.keyboard");

const PARAMETER_RANGES = {
  ph: { min: 0, max: 14, label: "pH", example: "5.5 7.5" },
  kelembapan: { min: 0, max: 100, label: "Kelembapan", example: "25 60" },
};

function parseValues(rawText) {
  const parts = (rawText || "").trim().split(/\s+/).map(Number);
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return null;
  return { min: parts[0], max: parts[1] };
}

function validateValues(parameter, values) {
  const range = PARAMETER_RANGES[parameter];
  if (values.min >= values.max) {
    return "Nilai minimum harus lebih kecil dari nilai maksimum.";
  }
  if (values.min < range.min || values.max > range.max) {
    return `Nilai ${range.label} harus berada dalam rentang ${range.min} sampai ${range.max}.`;
  }
  return null;
}

async function saveThreshold(ctx, device, parameter, values) {
  const data =
    parameter === "ph"
      ? { customPhMin: values.min, customPhMax: values.max }
      : { customMoistureMin: values.min, customMoistureMax: values.max };

  await prisma.device.update({ where: { id: device.id }, data });

  const range = PARAMETER_RANGES[parameter];
  await ctx.reply(`Threshold ${range.label} untuk ${device.label} berhasil diatur: ${values.min} - ${values.max}.`);
}

async function baseHandler(ctx) {
  const device = await resolveActiveDevice(ctx.telegramUserId, ctx.devices);
  if (!device) {
    await ctx.reply("Anda memiliki lebih dari satu tanaman. Gunakan /tanaman untuk memilih tanaman aktif terlebih dahulu.");
    return;
  }

  const [paramArg, minArg, maxArg] = ctx.args;

  if (!paramArg) {
    await ctx.reply("Pilih parameter yang ingin diatur:", buildThresholdParameterKeyboard());
    return;
  }

  const parameter = paramArg.toLowerCase();
  if (!PARAMETER_RANGES[parameter]) {
    await ctx.reply("Parameter tidak dikenali. Gunakan: /threshold ph <min> <max> atau /threshold kelembapan <min> <max>.");
    return;
  }

  const values = parseValues(`${minArg || ""} ${maxArg || ""}`);
  if (!values) {
    await ctx.reply(`Format perintah salah. Gunakan: /threshold ${parameter} <min> <max>.`);
    return;
  }

  const validationError = validateValues(parameter, values);
  if (validationError) {
    await ctx.reply(validationError);
    return;
  }

  await saveThreshold(ctx, device, parameter, values);
}

async function handleWizardInput(ctx) {
  const { parameter, deviceId } = ctx.wizard;
  const device = ctx.devices.find((d) => d.id === deviceId);

  if (!device) {
    await clearWizard(ctx.telegramUserId);
    await ctx.reply("Sesi tidak valid. Silakan mulai ulang dengan /threshold.");
    return;
  }

  const values = parseValues(ctx.text);
  if (!values) {
    const range = PARAMETER_RANGES[parameter];
    await ctx.reply(`Format nilai salah. Kirim dua angka dipisahkan spasi, contoh: ${range.example}.`);
    return;
  }

  const validationError = validateValues(parameter, values);
  if (validationError) {
    await ctx.reply(validationError);
    return;
  }

  await clearWizard(ctx.telegramUserId);
  await saveThreshold(ctx, device, parameter, values);
}

module.exports = {
  name: "threshold",
  description: "Mengatur ambang batas notifikasi pH/kelembapan: /threshold <ph|kelembapan> <min> <max>",
  handler: requireLinkedDevice(baseHandler),
  handleWizardInput,
  PARAMETER_RANGES,
};
