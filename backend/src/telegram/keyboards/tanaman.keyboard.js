"use strict";

const { buildCallbackData } = require("../utils/parse_callback_data");

function buildTanamanKeyboard(devices) {
  const rows = devices.map((device) => [
    {
      text: `${device.label} (${device.plant?.name || "?"})`,
      callback_data: buildCallbackData("tanaman", "select", device.id),
    },
  ]);
  return { inline_keyboard: rows };
}

module.exports = { buildTanamanKeyboard };
