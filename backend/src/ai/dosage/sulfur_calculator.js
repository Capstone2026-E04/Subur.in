const { K_S_SULFUR, M_S_MAX_PER_LITER, PH_TOLERANCE } = require('../config/treatment_constants');


function calculateSulfurDosage(phValue, volumeLiter, targetPh, maxPh) {
  if (typeof phValue !== 'number' || typeof volumeLiter !== 'number' || typeof targetPh !== 'number' || typeof maxPh !== 'number') {
    throw new TypeError('Semua parameter input kalkulator sulfur harus berupa angka.');
  }

  if (phValue <= maxPh + PH_TOLERANCE) {
    return {
      sulfurDosageGram:          0,
      phExcess:                  parseFloat(Math.max(0, phValue - targetPh).toFixed(3)),
      phTarget:                  targetPh,
      kS:                        K_S_SULFUR,
      cappedByMSMax:             false,
      requiresStagedApplication: false,
    };
  }

  const phExcess    = phValue - targetPh;
  const rawDosage   = K_S_SULFUR * volumeLiter * phExcess;
  const maxDosage   = M_S_MAX_PER_LITER * volumeLiter;
  const finalDosage = Math.min(rawDosage, maxDosage);
  const wasCapped   = rawDosage > maxDosage;

  return {
    sulfurDosageGram:          parseFloat(finalDosage.toFixed(2)),
    phExcess:                  parseFloat(phExcess.toFixed(3)),
    phTarget:                  targetPh,
    kS:                        K_S_SULFUR,
    mSMax:                     parseFloat(maxDosage.toFixed(2)),
    cappedByMSMax:             wasCapped,
    requiresStagedApplication: wasCapped,
  };
}

module.exports = { calculateSulfurDosage };

