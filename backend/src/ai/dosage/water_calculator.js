const { V_MAX_FRACTION, THETA_TARGET } = require('../config/treatment_constants');


function calculateWaterVolume(moisturePercent, volumeLiter) {
  if (typeof moisturePercent !== 'number' || typeof volumeLiter !== 'number') {
    throw new TypeError('Semua parameter input kalkulator air harus berupa angka.');
  }

  const thetaTarget = THETA_TARGET;
  const theta      = moisturePercent / 100;

  const rawVolume  = Math.max(0, (thetaTarget - theta) * volumeLiter);
  const vMax       = volumeLiter * V_MAX_FRACTION;
  const finalVolume = Math.min(rawVolume, vMax);

  return {
    waterVolumeLiter: parseFloat(finalVolume.toFixed(3)),
    theta:            parseFloat(theta.toFixed(4)),
    thetaTarget:      parseFloat(thetaTarget.toFixed(4)),
    vMax:             parseFloat(vMax.toFixed(3)),
    cappedByVmax:     rawVolume > vMax,
  };
}

module.exports = { calculateWaterVolume };

