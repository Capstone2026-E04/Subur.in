const { K_L_LIME, PH_TOLERANCE } = require('../config/treatment_constants');


function calculateLimeDosage(phValue, volumeLiter, targetPh, minPh) {
  if (typeof phValue !== 'number' || typeof volumeLiter !== 'number' || typeof targetPh !== 'number' || typeof minPh !== 'number') {
    throw new TypeError('Semua parameter input kalkulator kapur harus berupa angka.');
  }

  if (phValue >= minPh - PH_TOLERANCE) {
    return {
      limeDosageGram: 0,
      phDeficit:      parseFloat(Math.max(0, targetPh - phValue).toFixed(3)),
      phTarget:       targetPh,
      kL:             K_L_LIME,
    };
  }

  const phDeficit   = targetPh - phValue;
  const rawDosage   = K_L_LIME * volumeLiter * phDeficit;
  const finalDosage = Math.max(0, rawDosage);

  return {
    limeDosageGram: parseFloat(finalDosage.toFixed(2)),
    phDeficit:      parseFloat(phDeficit.toFixed(3)),
    phTarget:       targetPh,
    kL:             K_L_LIME,
  };
}

module.exports = { calculateLimeDosage };

