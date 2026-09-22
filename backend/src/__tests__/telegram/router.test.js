"use strict";

jest.mock("../../database/connections/prisma_client", () => ({
  user: { findUnique: jest.fn() },
  device: { findMany: jest.fn() },
}));

jest.mock("../../telegram/telegram_api.service", () => ({
  sendMessage: jest.fn().mockResolvedValue({ ok: true }),
  sendPhoto: jest.fn().mockResolvedValue({ ok: true }),
  answerCallbackQuery: jest.fn().mockResolvedValue({ ok: true }),
  editMessageReplyMarkup: jest.fn().mockResolvedValue({ ok: true }),
}));

const prisma = require("../../database/connections/prisma_client");
const telegramApi = require("../../telegram/telegram_api.service");
const { handleUpdate } = require("../../telegram/router");

const FAKE_CHAT_ID = 987654321;
const FAKE_USER_ID = 123456789;

describe("router handleUpdate", () => {
  beforeEach(() => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.device.findMany.mockResolvedValue([]);
  });

  it("replies with the welcome message for /start", async () => {
    await handleUpdate({
      message: { chat: { id: FAKE_CHAT_ID }, from: { id: FAKE_USER_ID }, text: "/start" },
    });

    expect(telegramApi.sendMessage).toHaveBeenCalledTimes(1);
    expect(telegramApi.sendMessage.mock.calls[0][1]).toEqual(expect.stringContaining("Selamat datang"));
  });

  it("replies with the unknown-command message for an unregistered command", async () => {
    await handleUpdate({
      message: { chat: { id: FAKE_CHAT_ID }, from: { id: FAKE_USER_ID }, text: "/perintahasal" },
    });

    expect(telegramApi.sendMessage).toHaveBeenCalledTimes(1);
    expect(telegramApi.sendMessage.mock.calls[0][1]).toEqual(expect.stringContaining("Perintah tidak dikenali"));
  });

  it("does not reply to a non-command message with no active wizard", async () => {
    await handleUpdate({
      message: { chat: { id: FAKE_CHAT_ID }, from: { id: FAKE_USER_ID }, text: "halo bot" },
    });

    expect(telegramApi.sendMessage).not.toHaveBeenCalled();
  });

  it("answers an unrecognized callback_query domain without replying", async () => {
    await handleUpdate({
      callback_query: {
        id: "cb-1",
        from: { id: FAKE_USER_ID },
        message: { chat: { id: FAKE_CHAT_ID }, message_id: 1 },
        data: "domainasal:aksi",
      },
    });

    expect(telegramApi.answerCallbackQuery).toHaveBeenCalledTimes(1);
    expect(telegramApi.sendMessage).not.toHaveBeenCalled();
  });

  it("ignores an update with neither message nor callback_query", async () => {
    await expect(handleUpdate({})).resolves.not.toThrow();
  });
});
