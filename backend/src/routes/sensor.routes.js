const express = require("express");
const router = express.Router();
const {
  streamSensorData,
  getLatestSensor,
  getSensorHistory,
  requireOwnedDevice,
} = require("../controllers/sensor.controller");
const authMiddleware = require("../middlewares/auth.middleware");

// EventSource tidak bisa mengirim header Authorization, jadi stream menerima ?access_token=.
const tokenFromQuery = (req, res, next) => {
  if (
    !req.headers.authorization &&
    typeof req.query.access_token === "string"
  ) {
    req.headers.authorization = `Bearer ${req.query.access_token}`;
  }
  next();
};

router.get(
  "/:deviceId/stream",
  tokenFromQuery,
  authMiddleware,
  requireOwnedDevice,
  streamSensorData,
);
router.get(
  "/:deviceId/latest",
  authMiddleware,
  requireOwnedDevice,
  getLatestSensor,
);
router.get(
  "/:deviceId/history",
  authMiddleware,
  requireOwnedDevice,
  getSensorHistory,
);

module.exports = router;
