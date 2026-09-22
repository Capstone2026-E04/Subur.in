"use strict";

const WELCOME_MESSAGE =
  "Halo! Selamat datang di Bot Subur.in.\n\nUntuk menghubungkan akun Subur.in Anda, buka halaman Pengaturan pada dashboard Subur.in, klik \"Hubungkan Telegram\" untuk mendapatkan kode, lalu kirim perintah berikut ke bot ini:\n\n/link KODE_ANDA";

async function handler(ctx) {
  await ctx.reply(WELCOME_MESSAGE);
}

module.exports = {
  name: "start",
  description: "Menampilkan pesan selamat datang",
  handler,
};
