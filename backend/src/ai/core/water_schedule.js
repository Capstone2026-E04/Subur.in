const {
  EMERGENCY_READINGS,
  EMERGENCY_DRY_THETA,
  EMERGENCY_SURGE_THETA,
} = require("../config/treatment_constants");

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// readings: VWC persen mentah, terbaru dulu.
// dry_critical: semua EMERGENCY_READINGS bacaan terakhir <= 50% theta_CC.
// wet_surge: lonjakan bacaan terbaru dibanding sebelumnya (pengecekan konfirmasi
// siram dilakukan pemanggil, karena butuh data log).
function classifyEmergency(readings) {
  if (readings.length < EMERGENCY_READINGS) return null;
  const [latest, previous] = readings;
  const recent = readings.slice(0, EMERGENCY_READINGS);
  if (recent.every((r) => r / 100 <= EMERGENCY_DRY_THETA)) {
    return "dry_critical";
  }
  if ((latest - previous) / 100 >= EMERGENCY_SURGE_THETA) return "wet_surge";
  return null;
}

module.exports = { median, classifyEmergency };
