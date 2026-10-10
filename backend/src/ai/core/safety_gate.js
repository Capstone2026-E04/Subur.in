const {
  PH_MARGIN,
  PH_SENSOR_MIN,
  PH_SENSOR_MAX,
  MIN_CONSISTENT_READINGS,
  WAIT_DAYS,
} = require("../config/treatment_constants");

const DAY_MS = 24 * 60 * 60 * 1000;

// Safety gate koreksi pH (C501 Step 11). Tidak mengubah hasil inferensi; hanya
// menentukan apakah koreksi boleh ditampilkan sebagai instruksi.
// status: NONE | READY | DEFERRED | NEEDS_CONFIRMATION
function checkPhCorrection({
  phAction,
  waterAction,
  ph,
  minPh,
  maxPh,
  consistentReadings,
  lastCorrectionAt,
  now = new Date(),
}) {
  if (phAction === "NONE") return { status: "NONE", reasons: [] };

  const reasons = [];
  if (ph <= PH_SENSOR_MIN || ph >= PH_SENSOR_MAX) {
    return {
      status: "NEEDS_CONFIRMATION",
      reasons: ["pH berada di batas ukur sensor; konfirmasi pengukuran."],
    };
  }
  const beyondThreshold =
    phAction === "LIME" ? ph <= minPh - PH_MARGIN : ph >= maxPh + PH_MARGIN;
  if (!beyondThreshold) {
    reasons.push("pH belum melewati ambang indikasi koreksi.");
  }
  if (waterAction === "STOP") {
    reasons.push("Media basah; koreksi ditunda sampai penyiraman dihentikan.");
  }
  if (consistentReadings < MIN_CONSISTENT_READINGS) {
    reasons.push(
      `Butuh minimal ${MIN_CONSISTENT_READINGS} pembacaan konsisten.`,
    );
  }
  if (
    lastCorrectionAt &&
    now - new Date(lastCorrectionAt) < WAIT_DAYS * DAY_MS
  ) {
    reasons.push(
      `Masih dalam periode tunggu ${WAIT_DAYS} hari setelah koreksi.`,
    );
  }

  return { status: reasons.length ? "DEFERRED" : "READY", reasons };
}

module.exports = { checkPhCorrection };
