const express = require("express");
const router = express.Router();
const { streamSensorData, getLatestSensor, getSensorHistory } = require("../controllers/sensor.controller");

router.get("/:deviceId/stream", streamSensorData);
router.get("/:deviceId/latest", getLatestSensor);
router.get("/:deviceId/history", getSensorHistory);

module.exports = router;
