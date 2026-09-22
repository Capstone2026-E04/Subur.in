"use strict";

const start = require("./start.command");
const link = require("./link.command");
const status = require("./status.command");
const riwayat = require("./riwayat.command");
const rekomendasi = require("./rekomendasi.command");
const unlink = require("./unlink.command");
const device = require("./device.command");
const tanaman = require("./tanaman.command");
const notifikasi = require("./notifikasi.command");
const threshold = require("./threshold.command");
const help = require("./help.command");
const laporan = require("./laporan.command");

const commandList = [
  start,
  link,
  status,
  riwayat,
  rekomendasi,
  unlink,
  device,
  tanaman,
  notifikasi,
  threshold,
  help,
  laporan,
];

const commandMap = {};
for (const command of commandList) {
  commandMap[command.name] = command;
}

module.exports = { commandList, commandMap };
