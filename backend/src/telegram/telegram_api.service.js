"use strict";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_BASE = "https://api.telegram.org";

async function callTelegramApi(method, body) {
  try {
    const response = await fetch(
      `${TELEGRAM_API_BASE}/bot${TELEGRAM_BOT_TOKEN}/${method}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const result = await response.json();
    if (!result.ok) {
      console.error(`[TelegramApiService] Telegram API menolak permintaan ${method} (fallback: gagal senyap, tidak menghambat caller):`, { body, description: result.description });
    }
    return result;
  } catch (error) {
    console.error(`[TelegramApiService] Gagal memanggil ${method} ke Telegram (fallback: gagal senyap, tidak menghambat caller):`, { message: error.message, stack: error.stack, body });
    return null;
  }
}

async function sendMessage(chatId, text, parseMode, replyMarkup) {
  return callTelegramApi("sendMessage", {
    chat_id: chatId,
    text,
    ...(parseMode ? { parse_mode: parseMode } : {}),
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

async function sendPhoto(chatId, photoUrl, caption, parseMode) {
  return callTelegramApi("sendPhoto", {
    chat_id: chatId,
    photo: photoUrl,
    ...(caption ? { caption } : {}),
    ...(parseMode ? { parse_mode: parseMode } : {}),
  });
}

async function editMessageReplyMarkup(chatId, messageId, replyMarkup) {
  return callTelegramApi("editMessageReplyMarkup", {
    chat_id: chatId,
    message_id: messageId,
    ...(replyMarkup ? { reply_markup: replyMarkup } : { reply_markup: { inline_keyboard: [] } }),
  });
}

async function answerCallbackQuery(callbackQueryId, text) {
  return callTelegramApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
  });
}

function generateLinkCode() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

module.exports = {
  sendMessage,
  sendPhoto,
  editMessageReplyMarkup,
  answerCallbackQuery,
  generateLinkCode,
};
