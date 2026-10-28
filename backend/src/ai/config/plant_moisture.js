const { THETA_CC } = require("./treatment_constants");

function buildMoisture({ triggerFraction, targetFraction, a, b }) {
  return {
    trigger: +(triggerFraction * THETA_CC * 100).toFixed(2),
    target: +(targetFraction * THETA_CC * 100).toFixed(2),
    thetaFill: targetFraction * THETA_CC,
    pointA: a * THETA_CC,
    pointB: b * THETA_CC,
  };
}

const PLANT_MOISTURE = {
  bayam: buildMoisture({
    triggerFraction: 0.7,
    targetFraction: 0.85,
    a: 0.531,
    b: 0.864,
  }),
  selada: buildMoisture({
    triggerFraction: 0.65,
    targetFraction: 0.8,
    a: 0.481,
    b: 0.814,
  }),
  pakcoy: buildMoisture({
    triggerFraction: 0.6,
    targetFraction: 0.8,
    a: 0.431,
    b: 0.764,
  }),
};

module.exports = PLANT_MOISTURE;
