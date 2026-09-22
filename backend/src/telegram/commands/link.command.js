"use strict";

const prisma = require("../../database/connections/prisma_client");

async function handler(ctx) {
  const code = ctx.args[0]?.toUpperCase();

  if (!code) {
    await ctx.reply("Format perintah salah. Gunakan: /link KODE_ANDA");
    return;
  }

  const user = await prisma.user.findUnique({ where: { telegramLinkCode: code } });

  if (!user) {
    await ctx.reply("Kode tidak valid atau sudah kedaluwarsa. Silakan buat kode baru dari halaman Pengaturan Subur.in.");
    return;
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { telegramChatId: String(ctx.chatId), telegramLinkCode: null },
    });
  } catch (updateError) {
    if (updateError.code === "P2002") {
      await ctx.reply("Akun Telegram ini sudah terhubung ke akun Subur.in lain. Putuskan koneksi tersebut terlebih dahulu.");
      return;
    }
    throw updateError;
  }

  await ctx.reply(`Akun Subur.in Anda (${user.email}) berhasil terhubung. Anda akan menerima notifikasi perangkat di sini mulai sekarang.`);
}

module.exports = {
  name: "link",
  description: "Menghubungkan akun Subur.in ke Telegram: /link KODE_ANDA",
  handler,
};
