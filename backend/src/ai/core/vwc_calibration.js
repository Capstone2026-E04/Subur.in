const {
  ADC_MIN,
  ADC_MAX,
  DENSITY_FACTOR,
} = require("../config/treatment_constants");

const OUT_OF_RANGE = "sensor_out_of_range";

function adcToVwc(adc) {
  if (typeof adc !== "number" || !Number.isFinite(adc)) {
    throw new TypeError("Nilai ADC harus berupa angka.");
  }
  const x = adc / 1000;
  const cubic = -0.1368 * x ** 3 + 0.7017 * x ** 2 - 1.2209 * x + 0.8646;
  const theta = DENSITY_FACTOR * cubic;
  const inRange = adc >= ADC_MIN && adc <= ADC_MAX && theta >= 0;
  return {
    vwcPercent: Math.min(100, Math.max(0, theta * 100)),
    safetyOverride: inRange ? null : OUT_OF_RANGE,
  };
}

module.exports = { adcToVwc, OUT_OF_RANGE };
