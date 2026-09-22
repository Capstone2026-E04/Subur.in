"use strict";

const { buildCallbackData } = require("../utils/parse_callback_data");

function buildThresholdParameterKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "pH", callback_data: buildCallbackData("threshold", "param", "ph") },
        { text: "Kelembapan", callback_data: buildCallbackData("threshold", "param", "kelembapan") },
      ],
    ],
  };
}

module.exports = { buildThresholdParameterKeyboard };
