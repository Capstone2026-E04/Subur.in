"use strict";

const SESSION_TTL_SECONDS = 300;
const SESSION_KEY_PREFIX = "bot_session:";

const WIZARD_TYPE = {
  THRESHOLD: "threshold",
};

module.exports = { SESSION_TTL_SECONDS, SESSION_KEY_PREFIX, WIZARD_TYPE };
