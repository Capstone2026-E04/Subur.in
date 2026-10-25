const {
  PH_SENSOR_MIN,
  PH_SENSOR_MAX,
  MIN_CONSISTENT_READINGS,
} = require("../config/treatment_constants");

function checkPhCorrection({ phAction, waterAction, ph, consistentReadings }) {
  if (phAction === "NONE") return { status: "NONE", reasons: [] };

  const reasons = [];
  if (ph <= PH_SENSOR_MIN || ph >= PH_SENSOR_MAX) {
    return {
      status: "NEEDS_CONFIRMATION",
      reasons: ["pH berada di batas ukur sensor; konfirmasi pengukuran."],
    };
  }
  if (waterAction === "STOP") {
    reasons.push("Media basah; koreksi ditunda sampai penyiraman dihentikan.");
  }
  if (consistentReadings < MIN_CONSISTENT_READINGS) {
    reasons.push(
      `Butuh minimal ${MIN_CONSISTENT_READINGS} pembacaan konsisten.`,
    );
  }

  return { status: reasons.length ? "DEFERRED" : "READY", reasons };
}

module.exports = { checkPhCorrection };
