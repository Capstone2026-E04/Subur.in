const { THETA_TRIGGER_DISPLAY, THETA_FILL } = require("./treatment_constants");

// Target kelembapan relatif terhadap CC media, sama untuk semua tanaman (Bagian 4.13).
// Satuan: persen VWC, sama dengan soil_vwc_pct dari sensor.
const SHARED = {
  trigger: +(THETA_TRIGGER_DISPLAY * 100).toFixed(2),
  target: +(THETA_FILL * 100).toFixed(2),
};

const PLANT_MOISTURE = { selada: SHARED, bayam: SHARED, pakcoy: SHARED };

module.exports = PLANT_MOISTURE;
