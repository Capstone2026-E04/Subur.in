const {
  PH_MARGIN,
  MOISTURE_A,
  MOISTURE_B,
  MOISTURE_D,
  MOISTURE_E,
} = require("../config/treatment_constants");

const clamp01 = (v) => Math.max(0, Math.min(1, v));

function fuzzifyPh(p, minPh, maxPh) {
  return {
    asam: clamp01((minPh - p) / PH_MARGIN),
    optimal: clamp01(
      Math.min(
        (p - minPh + PH_MARGIN) / PH_MARGIN,
        (maxPh + PH_MARGIN - p) / PH_MARGIN,
      ),
    ),
    basa: clamp01((p - maxPh) / PH_MARGIN),
  };
}

// theta: VWC dalam m3/m3.
function fuzzifyMoisture(theta) {
  return {
    kering: clamp01((MOISTURE_B - theta) / (MOISTURE_B - MOISTURE_A)),
    lembap: clamp01(
      Math.min(
        (theta - MOISTURE_A) / (MOISTURE_B - MOISTURE_A),
        (MOISTURE_E - theta) / (MOISTURE_E - MOISTURE_D),
      ),
    ),
    jenuh: clamp01((theta - MOISTURE_D) / (MOISTURE_E - MOISTURE_D)),
  };
}

module.exports = { fuzzifyPh, fuzzifyMoisture };
