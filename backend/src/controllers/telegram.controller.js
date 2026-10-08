"use strict";

const crypto = require("crypto");
const { processUpdate } = require("../telegram/bot");

const sha256 = (v) => crypto.createHash("sha256").update(v).digest();

function hasValidSecret(req) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  const given = req.get("X-Telegram-Bot-Api-Secret-Token");
  if (!expected || !given) return false;
  return crypto.timingSafeEqual(sha256(expected), sha256(given));
}

exports.handleWebhook = async (req, res) => {
  if (!hasValidSecret(req)) return res.status(401).send();
  await processUpdate(req.body || {});
  return res.status(200).send();
};
