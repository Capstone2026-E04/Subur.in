const { fuzzify }   = require('../core/membership');
const { aggregateAt } = require('../core/engine');
const FUZZY_PARAMETERS = require('../config/fuzzy_parameters');

function sampleAggregatedMF(activeRules, step = 0.1) {
  const { Y_MIN, Y_MAX } = FUZZY_PARAMETERS;
  const points = [];

  for (let y = Y_MIN; y <= Y_MAX + 1e-9; y += step) {
    points.push({
      y:  parseFloat(y.toFixed(4)),
      mu: parseFloat(aggregateAt(activeRules, y).toFixed(4)),
    });
  }

  return points;
}

function inspectPhMembership(phValue) {
  const { ph } = fuzzify(phValue, 50);
  return {
    phValue,
    membership: ph,
    activeSet: Object.entries(ph)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${k}: ${v.toFixed(4)}`),
  };
}

function inspectMoistureMembership(moistureValue) {
  const { moisture } = fuzzify(6.5, moistureValue);
  return {
    moistureValue,
    membership: moisture,
    activeSet: Object.entries(moisture)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${k}: ${v.toFixed(4)}`),
  };
}

function estimateCentroidAnalytic(activeRules) {
  if (activeRules.length === 0) return 4;

  const numerator   = activeRules.reduce((sum, r) => sum + r.alpha * (r.outputCategory - 1), 0);
  const denominator = activeRules.reduce((sum, r) => sum + r.alpha, 0);

  return denominator === 0 ? 4 : numerator / denominator;
}

module.exports = {
  sampleAggregatedMF,
  inspectPhMembership,
  inspectMoistureMembership,
  estimateCentroidAnalytic,
};
