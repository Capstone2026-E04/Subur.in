"use strict";

const prisma = require("../database/connections/prisma_client");
const telegramApi = require("./telegram_api.service");
const { commandMap } = require("./commands/index");
const { callbackHandlers } = require("./callbacks/index");
const { parseCallbackData } = require("./utils/parse_callback_data");
const { getWizard } = require("./session/session.service");
const { WIZARD_TYPE } = require("./session/session.constants");

const UNKNOWN_COMMAND_MESSAGE = "Perintah tidak dikenali. Kirim /help untuk melihat daftar perintah.";

const WIZARD_HANDLERS = {
  [WIZARD_TYPE.THRESHOLD]: (ctx) => commandMap.threshold.handleWizardInput(ctx),
};

async function findUserByChatId(chatId) {
  return prisma.user.findUnique({ where: { telegramChatId: String(chatId) } });
}

async function fetchDevicesForUser(user) {
  if (!user) return [];
  return prisma.device.findMany({
    where: { userId: user.id },
    include: { plant: true, polybag: { include: { polybagType: true } } },
  });
}

function buildCtx({ chatId, telegramUserId, user, devices, message, callbackQueryId, parsed, args, text, wizard }) {
  return {
    chatId,
    telegramUserId,
    user,
    devices,
    message,
    callbackQueryId,
    parsed,
    args: args || [],
    text,
    wizard,
    reply: (msgText, replyMarkup) => telegramApi.sendMessage(chatId, msgText, undefined, replyMarkup),
    replyPhoto: (photoUrl, caption) => telegramApi.sendPhoto(chatId, photoUrl, caption),
    answerCallback: (text2) => (callbackQueryId ? telegramApi.answerCallbackQuery(callbackQueryId, text2) : Promise.resolve()),
    editKeyboard: (replyMarkup) => (message ? telegramApi.editMessageReplyMarkup(chatId, message.message_id, replyMarkup) : Promise.resolve()),
  };
}

async function handleMessage(message) {
  const chatId = message.chat?.id;
  const telegramUserId = message.from?.id;
  const text = (message.text || "").trim();

  if (!chatId || !text) return;

  const user = await findUserByChatId(chatId);
  const devices = await fetchDevicesForUser(user);

  if (!text.startsWith("/")) {
    const wizard = user ? await getWizard(telegramUserId) : null;
    if (wizard && WIZARD_HANDLERS[wizard.type]) {
      const ctx = buildCtx({ chatId, telegramUserId, user, devices, message, text, wizard });
      await WIZARD_HANDLERS[wizard.type](ctx);
    }
    return;
  }

  const [rawCommand, ...args] = text.split(/\s+/);
  const commandName = rawCommand.slice(1).split("@")[0].toLowerCase();
  const command = commandMap[commandName];

  const ctx = buildCtx({ chatId, telegramUserId, user, devices, message, args, text });

  if (!command) {
    await ctx.reply(UNKNOWN_COMMAND_MESSAGE);
    return;
  }

  await command.handler(ctx);
}

async function handleCallbackQuery(callbackQuery) {
  const chatId = callbackQuery.message?.chat?.id;
  const telegramUserId = callbackQuery.from?.id;
  const parsed = parseCallbackData(callbackQuery.data);

  if (!chatId || !parsed) {
    await telegramApi.answerCallbackQuery(callbackQuery.id);
    return;
  }

  const user = await findUserByChatId(chatId);
  const devices = await fetchDevicesForUser(user);

  const ctx = buildCtx({
    chatId,
    telegramUserId,
    user,
    devices,
    message: callbackQuery.message,
    callbackQueryId: callbackQuery.id,
    parsed,
  });

  const callbackHandler = callbackHandlers[parsed.domain];
  if (!callbackHandler) {
    await ctx.answerCallback();
    return;
  }

  await callbackHandler(ctx);
}

async function handleUpdate(update) {
  if (update.message) {
    await handleMessage(update.message);
    return;
  }
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
    return;
  }
}

module.exports = { handleUpdate };
