"use strict";

jest.mock("../../../database/connections/prisma_client", () => ({
  device: { update: jest.fn() },
}));

jest.mock("../../../telegram/session/session.service", () => ({
  resolveActiveDevice: jest.fn(),
  clearWizard: jest.fn().mockResolvedValue(undefined),
}));

const prisma = require("../../../database/connections/prisma_client");
const { resolveActiveDevice } = require("../../../telegram/session/session.service");
const thresholdCommand = require("../../../telegram/commands/threshold.command");

function makeCtx(overrides) {
  return {
    chatId: 111,
    telegramUserId: 222,
    args: [],
    reply: jest.fn(),
    ...overrides,
  };
}

const DEVICE = { id: "device-threshold", label: "Test Device", plant: { name: "Pakcoy" } };

describe("threshold command", () => {
  beforeEach(() => {
    resolveActiveDevice.mockResolvedValue(DEVICE);
  });

  it("shows the parameter selection keyboard when called without arguments", async () => {
    const ctx = makeCtx({ user: { id: "fake-user" }, devices: [DEVICE] });

    await thresholdCommand.handler(ctx);

    expect(ctx.reply).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ inline_keyboard: expect.any(Array) }));
  });

  it("rejects an unrecognized parameter", async () => {
    const ctx = makeCtx({ user: { id: "fake-user" }, devices: [DEVICE], args: ["suhu", "10", "20"] });

    await thresholdCommand.handler(ctx);

    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining("tidak dikenali"));
  });

  it("rejects when the minimum is not smaller than the maximum", async () => {
    const ctx = makeCtx({ user: { id: "fake-user" }, devices: [DEVICE], args: ["ph", "8", "5"] });

    await thresholdCommand.handler(ctx);

    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining("lebih kecil"));
  });

  it("rejects a value outside the parameter's sane range", async () => {
    const ctx = makeCtx({ user: { id: "fake-user" }, devices: [DEVICE], args: ["ph", "-1", "20"] });

    await thresholdCommand.handler(ctx);

    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining("rentang"));
  });

  it("saves a valid pH range directly when full arguments are given, skipping the wizard", async () => {
    prisma.device.update.mockResolvedValue(DEVICE);
    const ctx = makeCtx({ user: { id: "fake-user" }, devices: [DEVICE], args: ["ph", "5.5", "7.5"] });

    await thresholdCommand.handler(ctx);

    expect(prisma.device.update).toHaveBeenCalledWith({
      where: { id: DEVICE.id },
      data: { customPhMin: 5.5, customPhMax: 7.5 },
    });
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining("berhasil diatur"));
  });

  it("saves the moisture range via handleWizardInput after the parameter was chosen through the keyboard", async () => {
    prisma.device.update.mockResolvedValue(DEVICE);
    const ctx = makeCtx({
      user: { id: "fake-user" },
      devices: [DEVICE],
      text: "20 60",
      wizard: { type: "threshold", parameter: "kelembapan", deviceId: DEVICE.id },
    });

    await thresholdCommand.handleWizardInput(ctx);

    expect(prisma.device.update).toHaveBeenCalledWith({
      where: { id: DEVICE.id },
      data: { customMoistureMin: 20, customMoistureMax: 60 },
    });
  });

  it("rejects a malformed value during handleWizardInput without saving", async () => {
    const ctx = makeCtx({
      user: { id: "fake-user" },
      devices: [DEVICE],
      text: "bukan-angka",
      wizard: { type: "threshold", parameter: "ph", deviceId: DEVICE.id },
    });

    await thresholdCommand.handleWizardInput(ctx);

    expect(prisma.device.update).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining("Format nilai salah"));
  });
});
