const {
  MEDIA_REF_LITER,
  THETA_FILL,
  F_V,
} = require("../config/treatment_constants");

// theta: VWC m3/m3. Neraca volumetrik C251 Pers. 4.55-4.56 dengan target isi ulang THETA_FILL.
function calculateWaterVolume(theta, volumeLiter = MEDIA_REF_LITER) {
  if (typeof theta !== "number" || typeof volumeLiter !== "number") {
    throw new TypeError(
      "Semua parameter input kalkulator air harus berupa angka.",
    );
  }

  const volumeMl = volumeLiter * 1000;
  const vNeed = Math.max(0, (THETA_FILL - theta) * volumeMl);
  const vMax = F_V * volumeMl;
  const finalMl = Math.min(vNeed, vMax);

  return {
    waterVolumeMl: parseFloat(finalMl.toFixed(1)),
    waterVolumeLiter: parseFloat((finalMl / 1000).toFixed(4)),
    vNeedMl: parseFloat(vNeed.toFixed(1)),
    vMaxMl: parseFloat(vMax.toFixed(1)),
    thetaTarget: parseFloat(THETA_FILL.toFixed(4)),
  };
}

module.exports = { calculateWaterVolume };
