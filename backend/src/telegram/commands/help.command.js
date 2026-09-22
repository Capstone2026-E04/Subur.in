"use strict";

async function handler(ctx) {
  const { commandList } = require("./index");
  const lines = commandList
    .filter((command) => command.name !== "start")
    .map((command) => `/${command.name} - ${command.description}`);
  await ctx.reply(`Daftar perintah yang tersedia:\n\n${lines.join("\n")}`);
}

module.exports = {
  name: "help",
  description: "Menampilkan daftar perintah yang tersedia",
  handler,
};
