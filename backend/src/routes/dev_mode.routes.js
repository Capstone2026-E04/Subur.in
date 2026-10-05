const express = require("express");
const router = express.Router();
const devModeController = require("../controllers/dev_mode.controller");
const authMiddleware = require("../middlewares/auth.middleware");

router.use(authMiddleware);

router.get("/", devModeController.getDevMode);
router.put("/", devModeController.setDevMode);

module.exports = router;
