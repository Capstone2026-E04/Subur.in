"use strict";

const { buildCallbackData } = require("../utils/parse_callback_data");

function buildNotifikasiKeyboard(enabled) {
  const button = enabled
    ? { text: "Nonaktifkan", callback_data: buildCallbackData("notifikasi", "set", "off") }
    : { text: "Aktifkan", callback_data: buildCallbackData("notifikasi", "set", "on") };

  return { inline_keyboard: [[button]] };
}

module.exports = { buildNotifikasiKeyboard };
