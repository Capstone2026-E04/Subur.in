"use strict";

function sendSuccess(res, statusCode, message, data = null, meta = null) {
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

function sendError(res, statusCode, message, errors = null) {
  return res.status(statusCode).json({ success: false, message, errors });
}

module.exports = { sendSuccess, sendError };
