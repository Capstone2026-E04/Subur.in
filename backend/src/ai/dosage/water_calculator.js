const {
  NMI_WET_STOP,
  MEDIA_REF_LITER,
  ML_PER_NMI_REF,
} = require("../config/treatment_constants");

// Vneed = max(0, (target - NMI) * 4) mL, dibatasi Vmax = max(0, (95 - NMI) * 4) mL.
// Faktor 4 mL/poin NMI berasal dari Vcal 400 mL pada media 2 L; diskalakan linear
// untuk volume media lain.
function calculateWaterVolume(nmi, targetNmi, volumeLiter) {
  if (
    typeof nmi !== "number" ||
    typeof targetNmi !== "number" ||
    typeof volumeLiter !== "number"
  ) {
    throw new TypeError(
      "Semua parameter input kalkulator air harus berupa angka.",
    );
  }

  const mlPerNmi = ML_PER_NMI_REF * (volumeLiter / MEDIA_REF_LITER);
  const vNeed = Math.max(0, (targetNmi - nmi) * mlPerNmi);
  const vMax = Math.max(0, (NMI_WET_STOP - nmi) * mlPerNmi);
  const finalMl = Math.min(vNeed, vMax);

  return {
    waterVolumeMl: parseFloat(finalMl.toFixed(1)),
    waterVolumeLiter: parseFloat((finalMl / 1000).toFixed(4)),
    vNeedMl: parseFloat(vNeed.toFixed(1)),
    vMaxMl: parseFloat(vMax.toFixed(1)),
    targetNmi,
  };
}

module.exports = { calculateWaterVolume };
