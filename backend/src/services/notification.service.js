"use strict";

const prisma = require("../database/connections/prisma_client");
const { broadcastToDevice } = require("../sse/sse_manager");
const telegramService = require("./telegram.service");

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
    select: { user: { select: { telegramChatId: true } } },
  });

  if (device?.user?.telegramChatId) {
    await telegramService.sendMessage(
      device.user.telegramChatId,
      `*${title}*\n${message}`
    );
  }

  return notification;
}

module.exports = { notifyDevice };
