const { V_MAX_FRACTION, VWC_TARGET } = require('../config/treatment_constants');
const { toVwc } = require('../utils/mathematical');


function calculateWaterVolume(moisturePercent, volumeLiter) {
  if (typeof moisturePercent !== 'number' || typeof volumeLiter !== 'number') {
    throw new TypeError('Semua parameter input kalkulator air harus berupa angka.');
  }

  const vwcTarget = VWC_TARGET;
  const vwc       = toVwc(moisturePercent);

  const rawVolume  = Math.max(0, (vwcTarget - vwc) * volumeLiter);
  const vMax       = volumeLiter * V_MAX_FRACTION;
  const finalVolume = Math.min(rawVolume, vMax);

  return {
    waterVolumeLiter: parseFloat(finalVolume.toFixed(3)),
    vwc:              parseFloat(vwc.toFixed(4)),
    vwcTarget:        parseFloat(vwcTarget.toFixed(4)),
    vMax:             parseFloat(vMax.toFixed(3)),
    cappedByVmax:     rawVolume > vMax,
  };
}

module.exports = { calculateWaterVolume };

