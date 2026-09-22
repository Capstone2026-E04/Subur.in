

const DEFAULT_PLANT_PARAMS = {
  minPh: 6.0,
  maxPh: 7.0,
  phTarget: 6.5,
};

function buildMembershipFunctions(plantParams = DEFAULT_PLANT_PARAMS) {
  const params = { ...DEFAULT_PLANT_PARAMS, ...plantParams };
  const minPh = params.minPh;
  const maxPh = params.maxPh;

  const muSangatAsam = (x1) => {
    if (x1 <= minPh - 1.5) return 1;
    if (x1 <= minPh - 0.5) return (minPh - 0.5 - x1) / 1.0;
    return 0;
  };

  const muAsam = (x1) => {
    if (x1 <= minPh - 1.5) return 0;
    if (x1 <= minPh - 0.5) return (x1 - (minPh - 1.5)) / 1.0;
    if (x1 <= minPh) return (minPh - x1) / 0.5;
    return 0;
  };

  const muOptimal = (x1) => {
    if (x1 <= minPh - 0.5) return 0;
    if (x1 <= minPh) return (x1 - (minPh - 0.5)) / 0.5;
    if (x1 <= maxPh) return 1;
    if (x1 <= maxPh + 0.5) return (maxPh + 0.5 - x1) / 0.5;
    return 0;
  };

  const muBasa = (x1) => {
    if (x1 <= maxPh) return 0;
    if (x1 <= maxPh + 0.5) return (x1 - maxPh) / 0.5;
    if (x1 <= maxPh + 1.5) return (maxPh + 1.5 - x1) / 1.0;
    return 0;
  };

  const muSangatBasa = (x1) => {
    if (x1 <= maxPh + 0.5) return 0;
    if (x1 <= maxPh + 1.5) return (x1 - (maxPh + 0.5)) / 1.0;
    return 1;
  };

  // VWC = Volumetric Water Content, fraksi 0-1 dari persentase kelembaban tanah
  const muKering = (vwc) => {
    if (vwc <= 0.15) return 1;
    if (vwc <= 0.25) return (0.25 - vwc) / 0.10;
    return 0;
  };

  const muSedang = (vwc) => {
    if (vwc <= 0.15) return 0;
    if (vwc <= 0.25) return (vwc - 0.15) / 0.10;
    if (vwc <= 0.30) return (0.30 - vwc) / 0.05;
    return 0;
  };


  const muLembap = (vwc) => {
    if (vwc <= 0.25) return 0;
    if (vwc <= 0.30) return (vwc - 0.25) / 0.05;
    if (vwc <= 0.35) return 1;
    if (vwc <= 0.40) return (0.40 - vwc) / 0.05;
    return 0;
  };

  const muJenuh = (vwc) => {
    if (vwc <= 0.35) return 0;
    if (vwc <= 0.40) return (vwc - 0.35) / 0.05;
    return 1;
  };

  const muOutput = (k, y) => {
    return Math.max(0, 1 - Math.abs(y - (k - 1)));
  };

  const fuzzify = (ph, moisturePercent) => {
    const { toVwc } = require('../utils/mathematical');
    const vwc = toVwc(moisturePercent);
    return {
      ph: {
        sangatAsam: muSangatAsam(ph),
        asam:       muAsam(ph),
        optimal:    muOptimal(ph),
        basa:       muBasa(ph),
        sangatBasa: muSangatBasa(ph),
      },
      moisture: {
        kering: muKering(vwc),
        sedang: muSedang(vwc),
        lembap: muLembap(vwc),
        jenuh:  muJenuh(vwc),
      },
    };
  };

  return {
    muSangatAsam,
    muAsam,
    muOptimal,
    muBasa,
    muSangatBasa,
    muKering,
    muSedang,
    muLembap,
    muJenuh,
    muOutput,
    fuzzify,
  };
}



const defaultMfs = buildMembershipFunctions();

module.exports = {
  buildMembershipFunctions,
  muSangatAsam: defaultMfs.muSangatAsam,
  muAsam: defaultMfs.muAsam,
  muOptimal: defaultMfs.muOptimal,
  muBasa: defaultMfs.muBasa,
  muSangatBasa: defaultMfs.muSangatBasa,
  muKering: defaultMfs.muKering,
  muSedang: defaultMfs.muSedang,
  muLembap: defaultMfs.muLembap,
  muJenuh: defaultMfs.muJenuh,
  muOutput: defaultMfs.muOutput,
  fuzzify: defaultMfs.fuzzify,
};
