const express = require("express");
const router = express.Router();
const {
  streamSensorData,
  getLatestSensor,
  getSensorHistory,
  exportSensorCsv,
  requireOwnedDevice,
} = require("../controllers/sensor.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { hasValidExportKey } = require("../middlewares/export_key.middleware");

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

const exportKeyOrOwner = (req, res, next) =>
  hasValidExportKey(req)
    ? next()
    : authMiddleware(req, res, (err) =>
        err ? next(err) : requireOwnedDevice(req, res, next),
      );

router.get(
  "/:deviceId/export.csv",
  tokenFromQuery,
  exportKeyOrOwner,
  exportSensorCsv,
);

module.exports = router;
