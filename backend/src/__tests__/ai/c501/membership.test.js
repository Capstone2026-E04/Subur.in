"use strict";

const { fuzzifyPh, fuzzifyMoisture } = require("../../../ai/core/membership");
const { PLANTS } = require("./fixtures");

describe("fuzzifyMoisture (C501 Step 3)", () => {
  it.each([
    [
      "example A: selada at NMI 65",
      65,
      65,
      { kering: 0.5, optimal: 0.5, basah: 0 },
    ],
    [
      "example B: bayam at NMI 72",
      72,
      70,
      { kering: 0.3, optimal: 0.7, basah: 0 },
    ],
    [
      "example C: pakcoy at NMI 60",
      60,
      60,
      { kering: 0.5, optimal: 0.5, basah: 0 },
    ],
  ])("matches %s", (_label, nmi, trigger, expected) => {
    const result = fuzzifyMoisture(nmi, trigger);

    expect(result.kering).toBeCloseTo(expected.kering, 9);
    expect(result.optimal).toBeCloseTo(expected.optimal, 9);
    expect(result.basah).toBeCloseTo(expected.basah, 9);
  });

  it.each([65, 70, 60])(
    "matches example D at NMI 92.5 for trigger %d",
    (trigger) => {
      const result = fuzzifyMoisture(92.5, trigger);

      expect(result.kering).toBe(0);
      expect(result.optimal).toBeCloseTo(0.5, 9);
      expect(result.basah).toBeCloseTo(0.5, 9);
    },
  );

  it("keeps every degree between 0 and 1 across the whole NMI domain", () => {
    for (const { trigger } of Object.values(PLANTS)) {
      for (let nmi = 0; nmi <= 100; nmi += 0.01) {
        const values = Object.values(fuzzifyMoisture(nmi, trigger));

        values.forEach((v) => {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        });
      }
    }
  });

  it("makes the three degrees sum to 1 across the whole NMI domain", () => {
    for (const { trigger } of Object.values(PLANTS)) {
      for (let nmi = 0; nmi <= 100; nmi += 0.01) {
        const { kering, optimal, basah } = fuzzifyMoisture(nmi, trigger);

        expect(kering + optimal + basah).toBeCloseTo(1, 9);
      }
    }
  });

  it("never activates kering and basah at the same time", () => {
    for (const { trigger } of Object.values(PLANTS)) {
      for (let nmi = 0; nmi <= 100; nmi += 0.01) {
        const { kering, basah } = fuzzifyMoisture(nmi, trigger);

        expect(Math.min(kering, basah)).toBe(0);
      }
    }
  });
});

describe("fuzzifyPh (C501 Step 4)", () => {
  it.each([
    [
      "example 5.1: selada at pH 5.75",
      "selada",
      5.75,
      { asam: 0.5, optimal: 0.5, basa: 0 },
    ],
    [
      "example 5.2: bayam at pH 6.5",
      "bayam",
      6.5,
      { asam: 0, optimal: 1, basa: 0 },
    ],
    [
      "example 5.3: pakcoy at pH 7.75",
      "pakcoy",
      7.75,
      { asam: 0, optimal: 0.5, basa: 0.5 },
    ],
    [
      "example 5.4: selada at pH 7.25",
      "selada",
      7.25,
      { asam: 0, optimal: 0, basa: 1 },
    ],
    [
      "example 5.4: bayam at pH 7.25",
      "bayam",
      7.25,
      { asam: 0, optimal: 0.5, basa: 0.5 },
    ],
    [
      "example 5.4: pakcoy at pH 7.25",
      "pakcoy",
      7.25,
      { asam: 0, optimal: 1, basa: 0 },
    ],
  ])("matches %s", (_label, plant, ph, expected) => {
    const { minPh, maxPh } = PLANTS[plant];

    const result = fuzzifyPh(ph, minPh, maxPh);

    expect(result.asam).toBeCloseTo(expected.asam, 9);
    expect(result.optimal).toBeCloseTo(expected.optimal, 9);
    expect(result.basa).toBeCloseTo(expected.basa, 9);
  });

  it("keeps every degree between 0 and 1 across the whole pH domain", () => {
    for (const { minPh, maxPh } of Object.values(PLANTS)) {
      for (let ph = 0; ph <= 14; ph += 0.01) {
        const values = Object.values(fuzzifyPh(ph, minPh, maxPh));

        values.forEach((v) => {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        });
      }
    }
  });

  it("makes the three degrees sum to 1 across the whole pH domain", () => {
    for (const { minPh, maxPh } of Object.values(PLANTS)) {
      for (let ph = 0; ph <= 14; ph += 0.01) {
        const { asam, optimal, basa } = fuzzifyPh(ph, minPh, maxPh);

        expect(asam + optimal + basa).toBeCloseTo(1, 9);
      }
    }
  });
});
