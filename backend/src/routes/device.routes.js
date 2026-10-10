const express = require("express");
const router = express.Router();
const deviceController = require("../controllers/device.controller");
const correctionController = require("../controllers/correction.controller");
const authMiddleware = require("../middlewares/auth.middleware");

router.use(authMiddleware);

router.post("/", deviceController.registerDevice);
router.get("/", deviceController.getMyDevices);
router.get("/discovered", deviceController.getDiscoveredDevices);
router.get("/:id/recommendation", deviceController.getDeviceRecommendation);
router.post("/:id/corrections", correctionController.createCorrection);
router.get("/:id/corrections", correctionController.getCorrections);
router.patch("/:id", deviceController.updateDevice);
router.delete("/:id", deviceController.deleteDevice);

module.exports = router;
