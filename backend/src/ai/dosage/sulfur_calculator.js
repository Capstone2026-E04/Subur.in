const {
  K_S_SULFUR,
  M_S_MAX_PER_LITER,
} = require("../config/treatment_constants");

// mS,raw = KS * V * max(0, pH aktual - pHT); mS,sim = min(mS,raw, batas simulasi).
function calculateSulfurDosage(phValue, volumeLiter, targetPh) {
  if (
    typeof phValue !== "number" ||
    typeof volumeLiter !== "number" ||
    typeof targetPh !== "number"
  ) {
    throw new TypeError(
      "Semua parameter input kalkulator sulfur harus berupa angka.",
    );
  }

  const phExcess = Math.max(0, phValue - targetPh);
  const rawDosage = K_S_SULFUR * volumeLiter * phExcess;
  const maxDosage = M_S_MAX_PER_LITER * volumeLiter;

  return {
    sulfurDosageGram: parseFloat(Math.min(rawDosage, maxDosage).toFixed(2)),
    phExcess: parseFloat(phExcess.toFixed(3)),
    phTarget: targetPh,
    kS: K_S_SULFUR,
    mSMax: parseFloat(maxDosage.toFixed(2)),
    cappedByMax: rawDosage > maxDosage,
  };
}

module.exports = { calculateSulfurDosage };
