"use strict";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_BASE = "https://api.telegram.org";

async function sendMessage(chatId, text) {
  try {
    const response = await fetch(
      `${TELEGRAM_API_BASE}/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "Markdown",
        }),
      }
    );

    const result = await response.json();

    if (!result.ok) {
      console.error(
        `[Telegram Service] Gagal mengirim pesan ke chatId "${chatId}":`,
        result.description
      );
    }
  } catch (error) {
    console.error(
      `[Telegram Service] Error saat mengirim pesan ke chatId "${chatId}":`,
      error.message
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
