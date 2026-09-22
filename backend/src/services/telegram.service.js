"use strict";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_BASE = "https://api.telegram.org";

async function sendMessage(chatId, text, parseMode) {
  try {
    const response = await fetch(
      `${TELEGRAM_API_BASE}/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          ...(parseMode ? { parse_mode: parseMode } : {}),
        }),
      },
    );

    const result = await response.json();

    if (!result.ok) {
      console.error(
        "[TelegramService] Telegram API menolak pesan (fallback: gagal senyap, tidak menghambat caller):",
        {
          chatId,
          description: result.description,
        },
      );
    }
  } catch (error) {
    console.error(
      "[TelegramService] Gagal mengirim pesan ke Telegram (fallback: gagal senyap, tidak menghambat caller):",
      {
        message: error.message,
        stack: error.stack,
        chatId,
      },
    );
  }
}

function generateLinkCode() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

module.exports = { sendMessage, generateLinkCode };
