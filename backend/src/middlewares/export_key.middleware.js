"use strict";

const crypto = require("crypto");

const sha256 = (v) => crypto.createHash("sha256").update(v).digest();

// Kunci statis untuk ekspor CSV (Excel tidak bisa memperbarui JWT). Nonaktif bila EXPORT_API_KEY kosong.
function hasValidExportKey(req) {
  const expected = process.env.EXPORT_API_KEY;
  const given =
    req.get("X-API-Key") ??
    (typeof req.query.api_key === "string" ? req.query.api_key : undefined);
  if (!expected || !given) return false;
  return crypto.timingSafeEqual(sha256(expected), sha256(given));
}

module.exports = { hasValidExportKey };
