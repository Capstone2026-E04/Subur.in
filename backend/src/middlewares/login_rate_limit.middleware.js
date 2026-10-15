const { rateLimit } = require("express-rate-limit");
const { sendError } = require("../utils/response");

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 10;

module.exports = rateLimit({
  windowMs: WINDOW_MS,
  limit: MAX_FAILED_ATTEMPTS,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  keyGenerator: (req) => {
    const email = req.body?.email;
    return typeof email === "string" && email
      ? email.trim().toLowerCase().slice(0, 255)
      : "no-email";
  },
  handler: (req, res) =>
    sendError(
      res,
      429,
      "Terlalu banyak percobaan login gagal. Coba lagi dalam beberapa menit.",
    ),
});
