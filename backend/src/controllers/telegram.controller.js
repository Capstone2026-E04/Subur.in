"use strict";

const prisma = require("../database/connections/prisma_client");
const telegramService = require("../services/telegram.service");

const WELCOME_MESSAGE =
  "Halo! Selamat datang di Bot Subur.in.\n\nUntuk menghubungkan akun Subur.in Anda, buka halaman Pengaturan pada dashboard Subur.in, klik \"Hubungkan Telegram\" untuk mendapatkan kode, lalu kirim perintah berikut ke bot ini:\n\n/link KODE_ANDA";

const HELP_MESSAGE =
  "Perintah tidak dikenali. Kirim /link KODE_ANDA untuk menghubungkan akun Subur.in Anda ke Telegram.";

exports.handleWebhook = async (req, res) => {
  try {
    const message = req.body?.message;
    const text = message?.text;
    const chatId = message?.chat?.id;

    if (!text || !chatId) {
      return res.status(200).send();
    }

    if (text.trim() === "/start") {
      await telegramService.sendMessage(chatId, WELCOME_MESSAGE);
      return res.status(200).send();
    }

    if (text.trim().toLowerCase().startsWith("/link")) {
      const parts = text.trim().split(/\s+/);
      const code = parts[1]?.toUpperCase();

      if (!code) {
        await telegramService.sendMessage(
          chatId,
          "Format perintah salah. Gunakan: /link KODE_ANDA"
        );
        return res.status(200).send();
      }

      const user = await prisma.user.findUnique({
        where: { telegramLinkCode: code },
      });

      if (!user) {
        await telegramService.sendMessage(
          chatId,
          "Kode tidak valid atau sudah kedaluwarsa. Silakan buat kode baru dari halaman Pengaturan Subur.in."
        );
        return res.status(200).send();
      }

      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            telegramChatId: String(chatId),
            telegramLinkCode: null,
          },
        });
      } catch (updateError) {
        if (updateError.code === "P2002") {
          await telegramService.sendMessage(
            chatId,
            "Akun Telegram ini sudah terhubung ke akun Subur.in lain. Putuskan koneksi tersebut terlebih dahulu."
          );
          return res.status(200).send();
        }
        throw updateError;
      }

      await telegramService.sendMessage(
        chatId,
        `Akun Subur.in Anda (${user.email}) berhasil terhubung. Anda akan menerima notifikasi perangkat di sini mulai sekarang.`
      );
      return res.status(200).send();
    }

    await telegramService.sendMessage(chatId, HELP_MESSAGE);
    return res.status(200).send();
  } catch (error) {
    console.error("[Telegram Controller] Gagal memproses webhook:", error.message);
    return res.status(200).send();
  }
};
