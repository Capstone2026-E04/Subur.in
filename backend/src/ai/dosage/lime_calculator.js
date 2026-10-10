const {
  K_L_LIME,
  M_L_MAX_PER_LITER,
} = require("../config/treatment_constants");

// mL,raw = KL * V * max(0, pHT - pH aktual); mL,sim = min(mL,raw, batas simulasi).
function calculateLimeDosage(phValue, volumeLiter, targetPh) {
  if (
    typeof phValue !== "number" ||
    typeof volumeLiter !== "number" ||
    typeof targetPh !== "number"
  ) {
    throw new TypeError(
      "Semua parameter input kalkulator kapur harus berupa angka.",
    );
  }

  const phDeficit = Math.max(0, targetPh - phValue);
  const rawDosage = K_L_LIME * volumeLiter * phDeficit;
  const maxDosage = M_L_MAX_PER_LITER * volumeLiter;

  return {
    limeDosageGram: parseFloat(Math.min(rawDosage, maxDosage).toFixed(2)),
    phDeficit: parseFloat(phDeficit.toFixed(3)),
    phTarget: targetPh,
    kL: K_L_LIME,
    mLMax: parseFloat(maxDosage.toFixed(2)),
    cappedByMax: rawDosage > maxDosage,
  };
}

module.exports = { calculateLimeDosage };
