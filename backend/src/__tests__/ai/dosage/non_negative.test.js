"use strict";

const { calculateWaterVolume } = require("../../../ai/dosage/water_calculator");
const { calculateLimeDosage } = require("../../../ai/dosage/lime_calculator");
const { calculateSulfurDosage } = require("../../../ai/dosage/sulfur_calculator");

const VOLUMES = [7.07, 11.04];
const PLANTS = [
  { minPh: 6.0, maxPh: 7.0, phTarget: 6.5 },
  { minPh: 6.0, maxPh: 7.5, phTarget: 6.8 },
  { minPh: 6.0, maxPh: 6.7, phTarget: 6.5 },
];

describe("dosage calculators never return negative output", () => {
  it("water volume is >= 0 across the full moisture range", () => {
    for (const volume of VOLUMES) {
      for (let m = 0; m <= 100; m += 1) {
        expect(calculateWaterVolume(m, volume).waterVolumeLiter).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("lime and sulfur dosage are >= 0 across the full pH range for every seeded plant", () => {
    for (const volume of VOLUMES) {
      for (const { minPh, maxPh, phTarget } of PLANTS) {
        for (let ph = 0; ph <= 14; ph += 0.1) {
          expect(calculateLimeDosage(ph, volume, phTarget, minPh).limeDosageGram).toBeGreaterThanOrEqual(0);
          expect(calculateSulfurDosage(ph, volume, phTarget, maxPh).sulfurDosageGram).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});
