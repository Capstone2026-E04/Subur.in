"use strict";

const express = require("express");
const router = express.Router();
const telegramController = require("../controllers/telegram.controller");

router.post("/webhook", telegramController.handleWebhook);

module.exports = router;
