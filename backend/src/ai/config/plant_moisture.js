const { THETA_TRIGGER_DISPLAY, THETA_FILL } = require("./treatment_constants");

const SHARED = {
  trigger: +(THETA_TRIGGER_DISPLAY * 100).toFixed(2),
  target: +(THETA_FILL * 100).toFixed(2),
};

const PLANT_MOISTURE = { selada: SHARED, bayam: SHARED, pakcoy: SHARED };

module.exports = PLANT_MOISTURE;
