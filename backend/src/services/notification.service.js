"use strict";

const prisma = require("../database/connections/prisma_client");
const { broadcastToDevice } = require("../sse/sse_manager");
const telegramService = require("../telegram/telegram_api.service");

async function notifyDevice(deviceId, { title, message, type }) {
  const notification = await prisma.notification.create({
    data: { deviceId, title, message, type },
  });

  broadcastToDevice(deviceId, {
    type: "NOTIFICATION",
    notification,
  });

  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    select: {
      user: { select: { telegramChatId: true, telegramNotifyEnabled: true } },
    },
  });

  if (!device?.user?.telegramChatId || !device.user.telegramNotifyEnabled) {
    return notification;
  }

  const result = await telegramService.sendMessage(
    device.user.telegramChatId,
    `*${title}*\n${message}`,
    "Markdown",
  );
  const delivered = result?.ok === true;

  return prisma.notification.update({
    where: { id: notification.id },
    data: {
      telegramStatus: delivered ? "sent" : "failed",
      telegramError: delivered
        ? null
        : (result?.description ?? "Tidak ada respons dari Telegram").slice(
            0,
            255,
          ),
    },
  });
}

module.exports = { notifyDevice };
