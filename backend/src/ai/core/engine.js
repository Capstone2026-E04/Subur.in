const { fuzzifyPh, fuzzifyMoisture } = require("./membership");
const { CATEGORIES, RULE_BASE, WATER_CENTERS, PH_CENTERS } = require("./rules");
const { DELTA_Y, ACTION_THRESHOLD } = require("../config/treatment_constants");

const EPSILON = 1e-9;
const STEPS = Math.round(2 / DELTA_Y);
const Y_GRID = Array.from({ length: STEPS + 1 }, (_, i) => -1 + i * DELTA_Y);

const OVERRIDE_MOISTURE = { kering: 0, lembap: 0, jenuh: 1 };

function evaluateRules(membership) {
  return RULE_BASE.map((rule) => ({
    ruleId: rule.id,
    phSet: rule.phSet,
    moistureSet: rule.moistureSet,
    category: rule.category,
    alpha: Math.min(
      membership.ph[rule.phSet],
      membership.moisture[rule.moistureSet],
    ),
  })).filter((r) => r.alpha > 0);
}

function centroid(activeRules, key, centers) {
  let num = 0;
  let den = 0;
  for (const y of Y_GRID) {
    let mu = 0;
    for (const { category, alpha } of activeRules) {
      const c = centers[CATEGORIES[category][key]];
      mu = Math.max(mu, Math.min(alpha, Math.max(0, 1 - Math.abs(y - c))));
    }
    num += y * mu;
    den += mu;
  }
  return den === 0 ? 0 : num / den;
}

function decide(y, centers) {
  const [negative, , positive] = Object.keys(centers).sort(
    (a, b) => centers[a] - centers[b],
  );
  if (y >= ACTION_THRESHOLD - EPSILON) return positive;
  if (y <= -ACTION_THRESHOLD + EPSILON) return negative;
  return "NONE";
}

function actionStrength(activeRules, key, action) {
  return activeRules
    .filter((r) => CATEGORIES[r.category][key] === action)
    .reduce((m, r) => Math.max(m, r.alpha), 0);
}

function runInference(
  ph,
  theta,
  { minPh, maxPh, override = false, moistureParams },
) {
  if (typeof ph !== "number" || typeof theta !== "number") {
    throw new TypeError("Input pH dan VWC harus berupa angka.");
  }

  const membership = {
    ph: fuzzifyPh(ph, minPh, maxPh),
    moisture: override
      ? OVERRIDE_MOISTURE
      : fuzzifyMoisture(theta, moistureParams),
  };
  const activeRules = evaluateRules(membership);
  const centroids = {
    water: centroid(activeRules, "waterAction", WATER_CENTERS),
    ph: centroid(activeRules, "phAction", PH_CENTERS),
  };
  const waterAction = decide(centroids.water, WATER_CENTERS);
  const phAction = decide(centroids.ph, PH_CENTERS);
  const categoryCode = Object.keys(CATEGORIES).find(
    (c) =>
      CATEGORIES[c].waterAction === waterAction &&
      CATEGORIES[c].phAction === phAction,
  );

  return {
    membership,
    activeRules,
    centroids,
    waterAction,
    phAction,
    categoryCode,
    strength: Math.min(
      actionStrength(activeRules, "waterAction", waterAction),
      actionStrength(activeRules, "phAction", phAction),
    ),
  };
}

module.exports = { runInference, evaluateRules };
