// Sumber: dokumen C501 (Step 1-11). Semua nilai adalah parameter rekayasa
// untuk prototipe polybag 2 L, bukan angka optimum biologis dari literatur.
const TREATMENT_CONSTANTS = {
  MEDIA_REF_LITER: 2,
  NMI_WET_START: 90,
  NMI_WET_STOP: 95,
  NMI_MARGIN: 5,
  PH_MARGIN: 0.5,
  PH_SENSOR_MIN: 3.5,
  PH_SENSOR_MAX: 8.0,
  ML_PER_NMI_REF: 4,
  K_L_LIME: 1.3,
  M_L_MAX_PER_LITER: 4.7 / 2,
  K_S_SULFUR: 0.6,
  M_S_MAX_PER_LITER: 1.2 / 2,
  MIN_CONSISTENT_READINGS: 2,
  WAIT_DAYS: 14,
};

module.exports = TREATMENT_CONSTANTS;
