"use strict";

const { handleUpdate } = require("./router");

async function processUpdate(update) {
  try {
    await handleUpdate(update);
  } catch (error) {
    console.error("[TelegramBot] Gagal memproses update Telegram:", {
      message: error.message,
      stack: error.stack,
      update,
    });
  }
}

module.exports = { processUpdate };
