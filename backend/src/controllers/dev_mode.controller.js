"use strict";

const devMode = require("../services/dev_mode.service");
const { sendSuccess, sendError } = require("../utils/response");

exports.getDevMode = (req, res) =>
  sendSuccess(res, 200, "Status Dev Mode berhasil diambil.", {
    enabled: devMode.isEnabled(req.user.id),
  });

exports.setDevMode = (req, res) => {
  const { enabled } = req.body;
  if (typeof enabled !== "boolean") {
    return sendError(res, 400, '"enabled" wajib berupa boolean.');
  }
  devMode.setEnabled(req.user.id, enabled);
  return sendSuccess(
    res,
    200,
    `Dev Mode ${enabled ? "diaktifkan" : "dinonaktifkan"}.`,
    { enabled },
  );
};
