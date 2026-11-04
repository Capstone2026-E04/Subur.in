const { MIN_CONSISTENT_READINGS } = require("../config/treatment_constants");

function checkPhCorrection({ phAction, waterAction, consistentReadings }) {
  if (phAction === "NONE") return { status: "NONE", reasons: [] };

  const reasons = [];
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
