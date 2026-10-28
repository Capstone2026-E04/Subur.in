const { MEDIA_REF_LITER, F_V } = require("../config/treatment_constants");

function calculateWaterVolume(
  theta,
  thetaTarget,
  volumeLiter = MEDIA_REF_LITER,
) {
  if (
    typeof theta !== "number" ||
    typeof thetaTarget !== "number" ||
    typeof volumeLiter !== "number"
  ) {
    throw new TypeError(
      "Semua parameter input kalkulator air harus berupa angka.",
    );
  }

  const volumeMl = volumeLiter * 1000;
  const vNeed = Math.max(0, (thetaTarget - theta) * volumeMl);
  const vMax = F_V * volumeMl;
  const finalMl = Math.min(vNeed, vMax);

  return {
    waterVolumeMl: parseFloat(finalMl.toFixed(1)),
    waterVolumeLiter: parseFloat((finalMl / 1000).toFixed(4)),
    vNeedMl: parseFloat(vNeed.toFixed(1)),
    vMaxMl: parseFloat(vMax.toFixed(1)),
    thetaTarget: parseFloat(thetaTarget.toFixed(4)),
  };
}

module.exports = { calculateWaterVolume };
