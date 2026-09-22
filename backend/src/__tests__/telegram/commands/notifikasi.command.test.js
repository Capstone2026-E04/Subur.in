"use strict";

jest.mock("../../../database/connections/prisma_client", () => ({
  user: { update: jest.fn() },
}));

const prisma = require("../../../database/connections/prisma_client");
const notifikasiCommand = require("../../../telegram/commands/notifikasi.command");

function makeCtx(overrides) {
  return {
    chatId: 111,
    telegramUserId: 222,
    args: [],
    parsed: null,
    reply: jest.fn(),
    answerCallback: jest.fn(),
    editKeyboard: jest.fn(),
    ...overrides,
  };
}

describe("notifikasi command", () => {
  it("shows the current status and a toggle button when called without arguments", async () => {
    const ctx = makeCtx({ user: { id: "fake-user-1", telegramNotifyEnabled: true }, devices: [] });

    await notifikasiCommand.handler(ctx);

    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("AKTIF"),
      expect.objectContaining({ inline_keyboard: expect.any(Array) }),
    );
  });

  it("turns notifications off and persists the preference", async () => {
    const ctx = makeCtx({ user: { id: "fake-user-2", telegramNotifyEnabled: true }, devices: [], args: ["off"] });

    await notifikasiCommand.handler(ctx);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "fake-user-2" },
      data: { telegramNotifyEnabled: false },
    });
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining("dinonaktifkan"));
  });

  it("turns notifications on and persists the preference", async () => {
    const ctx = makeCtx({ user: { id: "fake-user-3", telegramNotifyEnabled: false }, devices: [], args: ["on"] });

    await notifikasiCommand.handler(ctx);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "fake-user-3" },
      data: { telegramNotifyEnabled: true },
    });
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining("diaktifkan"));
  });

  it("asks an unlinked user to /link first", async () => {
    const ctx = makeCtx({ user: null, devices: [] });

    await notifikasiCommand.handler(ctx);

    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining("/link"));
  });

  it("toggles the preference from the inline keyboard callback", async () => {
    const ctx = makeCtx({
      user: { id: "fake-user-5", telegramNotifyEnabled: true },
      devices: [],
      parsed: { domain: "notifikasi", action: "set", value: "off" },
    });

    await notifikasiCommand.handleCallback(ctx);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "fake-user-5" },
      data: { telegramNotifyEnabled: false },
    });
  });
});
