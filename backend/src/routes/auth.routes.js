const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const loginRateLimit = require("../middlewares/login_rate_limit.middleware");

router.post("/register", authController.register);
router.post("/login", loginRateLimit, authController.login);
router.post("/google", authController.googleSignIn);

module.exports = router;
