"use strict";

const prisma = require("../../database/connections/prisma_client");
const telegramService = require("../../telegram/telegram_api.service");
const { notifyDevice } = require("../../services/notification.service");

jest.mock("../../database/connections/prisma_client", () => ({
  notification: { create: jest.fn(), update: jest.fn() },
  device: { findUnique: jest.fn() },
}));
jest.mock("../../sse/sse_manager", () => ({ broadcastToDevice: jest.fn() }));
jest.mock("../../telegram/telegram_api.service", () => ({
  sendMessage: jest.fn(),
}));

const payload = { title: "Judul", message: "Pesan", type: "info" };
const linkedUser = {
  user: { telegramChatId: "42", telegramNotifyEnabled: true },
};

describe("notifyDevice telegram delivery status", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.notification.create.mockResolvedValue({ id: "n1" });
    prisma.notification.update.mockImplementation(async ({ data }) => ({
      id: "n1",
      ...data,
    }));
    prisma.device.findUnique.mockResolvedValue(linkedUser);
  });

  it("keeps the default skipped status when the user has no Telegram link", async () => {
    prisma.device.findUnique.mockResolvedValue({
      user: { telegramChatId: null, telegramNotifyEnabled: true },
    });

    await notifyDevice("d1", payload);

    expect(telegramService.sendMessage).not.toHaveBeenCalled();
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it("records sent when Telegram accepts the message", async () => {
    telegramService.sendMessage.mockResolvedValue({ ok: true });

    const result = await notifyDevice("d1", payload);

    expect(result).toMatchObject({
      telegramStatus: "sent",
      telegramError: null,
    });
  });

  it("records failed with Telegram's description when it rejects the message", async () => {
    telegramService.sendMessage.mockResolvedValue({
      ok: false,
      description: "Forbidden: bot was blocked by the user",
    });

    const result = await notifyDevice("d1", payload);

    expect(result).toMatchObject({
      telegramStatus: "failed",
      telegramError: "Forbidden: bot was blocked by the user",
    });
  });

  it("records failed when there is no response at all", async () => {
    telegramService.sendMessage.mockResolvedValue(null);

    const result = await notifyDevice("d1", payload);

    expect(result.telegramStatus).toBe("failed");
  });
});
