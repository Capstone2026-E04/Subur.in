// Parameter desain C501 (Dokumen Fuzzy Dosis Draf Final13); bukan ambang agronomi teruji.
const THETA_CC = 0.3298; // m3/m3, container capacity polybag 2 L (659,6 mL / 2.000 mL)

const TREATMENT_CONSTANTS = {
  MEDIA_REF_LITER: 2,
  THETA_CC,
  // Titik tekuk himpunan kelembapan, pecahan dari THETA_CC (Bagian 4.4).
  MOISTURE_A: THETA_CC / 2,
  MOISTURE_B: (5 / 6) * THETA_CC,
  MOISTURE_D: (7 / 6) * THETA_CC,
  MOISTURE_E: (4 / 3) * THETA_CC,
  // Target isi ulang dan batas satu kali siram (Bagian 4.8).
  THETA_FILL: (5 / 6) * THETA_CC,
  F_V: 0.1,
  // Pemicu siram setelah centroid (Bagian 4.4); hanya untuk tampilan.
  THETA_TRIGGER_DISPLAY: 0.2207,
  DELTA_Y: 0.02,
  ACTION_THRESHOLD: 0.12,
  PH_MARGIN: 0.5,
  // Selisih dari batas pH tempat sumbu pH mulai menyala LIME/SULFUR (Bagian 4.5, bayam: 5,75 / 7,25).
  PH_ACTION_MARGIN: 0.25,
  PH_SENSOR_MIN: 3.5,
  PH_SENSOR_MAX: 8.0,
  K_L_LIME: 1.3,
  M_L_MAX_PER_LITER: 1.4,
  K_S_SULFUR: 0.6,
  M_S_MAX_PER_LITER: 1.2,
  MIN_CONSISTENT_READINGS: 2,
  WAIT_DAYS: 7,
};

module.exports = TREATMENT_CONSTANTS;
