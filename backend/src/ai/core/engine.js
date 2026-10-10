const { fuzzifyPh, fuzzifyMoisture } = require("./membership");
const {
  CATEGORIES,
  RULE_BASE,
  WATER_PRIORITY,
  PH_PRIORITY,
} = require("./rules");

const TIE_EPSILON = 1e-9;

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

// h(c) = max(alpha) per kategori (agregasi MAX).
function aggregateCategories(activeRules) {
  const h = {};
  for (const { category, alpha } of activeRules) {
    h[category] = Math.max(h[category] ?? 0, alpha);
  }
  return h;
}

// Pilih nilai agregasi terbesar per dimensi; seri -> urutan prioritas.
function pickAction(h, key, priority) {
  const score = {};
  for (const [code, value] of Object.entries(h)) {
    const action = CATEGORIES[code][key];
    score[action] = Math.max(score[action] ?? 0, value);
  }
  const best = Math.max(...Object.values(score));
  const action = priority.find((a) => (score[a] ?? 0) >= best - TIE_EPSILON);
  return { action, score: best };
}

function runInference(ph, nmi, { minPh, maxPh, trigger }) {
  if (typeof ph !== "number" || typeof nmi !== "number") {
    throw new TypeError("Input pH dan NMI harus berupa angka.");
  }

  const membership = {
    ph: fuzzifyPh(ph, minPh, maxPh),
    moisture: fuzzifyMoisture(nmi, trigger),
  };
  const activeRules = evaluateRules(membership);
  const h = aggregateCategories(activeRules);
  const water = pickAction(h, "waterAction", WATER_PRIORITY);
  const phPick = pickAction(h, "phAction", PH_PRIORITY);
  const waterAction = water.action;
  const phAction = phPick.action;
  const categoryCode = Object.keys(CATEGORIES).find(
    (c) =>
      CATEGORIES[c].waterAction === waterAction &&
      CATEGORIES[c].phAction === phAction,
  );

  return {
    membership,
    activeRules,
    aggregation: h,
    waterAction,
    phAction,
    categoryCode,
    // Dukungan terlemah dari kedua keputusan final (0-1).
    strength: Math.min(water.score, phPick.score),
  };
}

module.exports = { runInference, evaluateRules, aggregateCategories };
