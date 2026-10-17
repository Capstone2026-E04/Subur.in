"use strict";

const { handleUpdate } = require("./router");
const telegramApi = require("./telegram_api.service");

const ERROR_MESSAGE =
  "Maaf, terjadi kesalahan saat memproses perintah Anda. Silakan coba lagi sebentar lagi.";

async function processUpdate(update) {
  try {
    await handleUpdate(update);
  } catch (error) {
    console.error("[TelegramBot] Gagal memproses update Telegram:", {
      message: error.message,
      stack: error.stack,
      updateId: update?.update_id,
    });
    const chatId =
      update?.message?.chat?.id ?? update?.callback_query?.message?.chat?.id;
    if (chatId) await telegramApi.sendMessage(chatId, ERROR_MESSAGE);
  }
}

module.exports = { processUpdate };
