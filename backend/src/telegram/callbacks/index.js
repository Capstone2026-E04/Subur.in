"use strict";

const { commandMap } = require("../commands/index");
const tanamanCallback = require("./tanaman.callback");
const thresholdCallback = require("./threshold.callback");

const callbackHandlers = {
  tanaman: tanamanCallback.handleCallback,
  threshold: thresholdCallback.handleCallback,
  unlink: (ctx) => commandMap.unlink.handleCallback(ctx),
  notifikasi: (ctx) => commandMap.notifikasi.handleCallback(ctx),
};

module.exports = { callbackHandlers };
