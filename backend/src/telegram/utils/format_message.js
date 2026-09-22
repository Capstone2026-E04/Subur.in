"use strict";

function formatDeviceLabel(device) {
  return `${device.label} (${device.plant?.name || "?"})`;
}

function formatTimestamp(date) {
  return new Date(date).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
}

module.exports = { formatDeviceLabel, formatTimestamp };
