const {
  NMI_WET_START,
  NMI_WET_STOP,
  NMI_MARGIN,
  PH_MARGIN,
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

function fuzzifyMoisture(n, trigger) {
  return {
    kering: clamp01((trigger + NMI_MARGIN - n) / (2 * NMI_MARGIN)),
    optimal: clamp01(
      Math.min(
        (n - trigger + NMI_MARGIN) / (2 * NMI_MARGIN),
        (NMI_WET_STOP - n) / (NMI_WET_STOP - NMI_WET_START),
      ),
    ),
    basah: clamp01((n - NMI_WET_START) / (NMI_WET_STOP - NMI_WET_START)),
  };
}

module.exports = { fuzzifyPh, fuzzifyMoisture };
