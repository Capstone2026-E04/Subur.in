const express = require("express");
const router = express.Router();
const superadminController = require("../controllers/superadmin.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const superadminMiddleware = require("../middlewares/superadmin.middleware");

router.use(authMiddleware);
router.use(superadminMiddleware);

router.get("/overview", superadminController.getOverview);
router.get("/device-options", superadminController.getDeviceOptions);
router.get("/sensor-history", superadminController.getSensorHistory);
router.get("/:resource", superadminController.listResource);

module.exports = router;
