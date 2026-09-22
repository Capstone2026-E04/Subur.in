"use strict";

jest.mock("../../../database/connections/prisma_client", () => ({
  recommendationLog: { findFirst: jest.fn() },
}));

jest.mock("../../../telegram/session/session.service", () => ({
  resolveActiveDevice: jest.fn(),
}));

const prisma = require("../../../database/connections/prisma_client");
const { resolveActiveDevice } = require("../../../telegram/session/session.service");
const statusCommand = require("../../../telegram/commands/status.command");

function makeCtx(overrides) {
  return {
    chatId: 111,
    telegramUserId: 222,
    args: [],
    reply: jest.fn(),
    ...overrides,
  };
}

const DEVICE = { id: "device-only", label: "Only", plant: { name: "Bayam" } };

describe("status command", () => {
  it("asks the user to link their account when not linked", async () => {
    const ctx = makeCtx({ user: null, devices: [] });

    await statusCommand.handler(ctx);

    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining("/link"));
  });

  it("asks the user to register a device when they have none", async () => {
    const ctx = makeCtx({ user: { id: "fake-user" }, devices: [] });

    await statusCommand.handler(ctx);

    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining("belum memiliki device"));
  });

  it("asks the user to run /tanaman when no device is currently active", async () => {
    resolveActiveDevice.mockResolvedValue(null);
    const devices = [
      { id: "device-a", label: "A", plant: { name: "Pakcoy" } },
      { id: "device-b", label: "B", plant: { name: "Selada" } },
    ];
    const ctx = makeCtx({ user: { id: "fake-user" }, devices });

    await statusCommand.handler(ctx);

    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining("/tanaman"));
  });

  it("reports no sensor data yet when the active device has no recommendation log", async () => {
    resolveActiveDevice.mockResolvedValue(DEVICE);
    prisma.recommendationLog.findFirst.mockResolvedValue(null);
    const ctx = makeCtx({ user: { id: "fake-user" }, devices: [DEVICE] });

    await statusCommand.handler(ctx);

    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining("Belum ada data sensor"));
  });

  it("reports the latest category and readings for the active device", async () => {
    resolveActiveDevice.mockResolvedValue(DEVICE);
    prisma.recommendationLog.findFirst.mockResolvedValue({
      phValue: 6.5,
      moistureValue: 40,
      categoryCode: "C1",
      actionText: "Kondisi optimal, tidak ada tindakan diperlukan.",
      createdAt: new Date("2026-09-22T09:00:00.000Z"),
    });
    const ctx = makeCtx({ user: { id: "fake-user" }, devices: [DEVICE] });

    await statusCommand.handler(ctx);

    const [message] = ctx.reply.mock.calls[0];
    expect(message).toEqual(expect.stringContaining("C1"));
    expect(message).toEqual(expect.stringContaining("6.5"));
  });
});
