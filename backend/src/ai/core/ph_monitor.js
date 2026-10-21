const { runInference } = require("./engine");
const {
  PH_AXIS_THETA,
  PH_MOVE_MIN,
  WAIT_DAYS,
  MAX_EVALUATIONS,
} = require("../config/treatment_constants");

const DAY_MS = 24 * 60 * 60 * 1000;

function evaluatePhMonitor({ current, previous, plant, correction, now }) {
  const actionOf = (ph) =>
    typeof ph === "number"
      ? runInference(ph, PH_AXIS_THETA, plant).phAction
      : null;
  const currentAction = actionOf(current);
  const result = (status, extra = {}) => ({
    status,
    phAction: currentAction ?? "NONE",
    allowDose: false,
    ...extra,
  });

  if (correction) {
    const days = Math.floor((now - new Date(correction.appliedAt)) / DAY_MS);
    if (days < WAIT_DAYS) {
      return result("MASA_REAKSI", { day: days + 1, totalDays: WAIT_DAYS });
    }
    if (currentAction === null || currentAction === "NONE") {
      return result("PANTAU");
    }
    const overshoot =
      (correction.type === "LIME" && currentAction === "SULFUR") ||
      (correction.type === "SULFUR" && currentAction === "LIME");
    if (overshoot) return result("ESKALASI", { reason: "OVERSHOOT" });

    const moved =
      correction.type === "LIME"
        ? current - correction.phBefore
        : correction.phBefore - current;
    if (moved >= PH_MOVE_MIN) {
      return result("EVALUASI", { outcome: "LANJUT_PANTAU" });
    }
    if (Math.floor(days / WAIT_DAYS) >= MAX_EVALUATIONS) {
      return result("ESKALASI", { reason: "NO_PROGRESS" });
    }
    return result("EVALUASI", {
      outcome: "REKOMENDASI_ULANG",
      allowDose: true,
    });
  }

  if (
    currentAction &&
    currentAction !== "NONE" &&
    currentAction === actionOf(previous)
  ) {
    return result("REKOMENDASI", { allowDose: true });
  }
  return result("PANTAU");
}

module.exports = { evaluatePhMonitor };
