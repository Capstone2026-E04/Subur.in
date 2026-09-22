"use strict";

const { processUpdate } = require("../telegram/bot");

exports.handleWebhook = async (req, res) => {
  await processUpdate(req.body || {});
  return res.status(200).send();
};
