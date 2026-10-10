"use strict";

const { calculateWaterVolume } = require("../../../ai/dosage/water_calculator");
const { calculateLimeDosage } = require("../../../ai/dosage/lime_calculator");
const {
  calculateSulfurDosage,
} = require("../../../ai/dosage/sulfur_calculator");

describe("calculateWaterVolume (C501 Step 8, 2 L media)", () => {
  it("returns 120 mL for pakcoy at NMI 50 (example A)", () => {
    const result = calculateWaterVolume(50, 80, 2);

    expect([result.vNeedMl, result.vMaxMl, result.waterVolumeMl]).toEqual([
      120, 180, 120,
    ]);
  });

  it("returns 160 mL for selada at NMI 50 (example B)", () => {
    const result = calculateWaterVolume(50, 90, 2);

    expect([result.vNeedMl, result.vMaxMl, result.waterVolumeMl]).toEqual([
      160, 180, 160,
    ]);
  });

  it("needs 100 mL for selada at NMI 65 before the fuzzy decision is applied (example C)", () => {
    const result = calculateWaterVolume(65, 90, 2);

    expect(result.vNeedMl).toBe(100);
  });

  it("peaks at 360 mL for selada at NMI 0", () => {
    const result = calculateWaterVolume(0, 90, 2);

    expect(result.waterVolumeMl).toBe(360);
  });

  it("peaks at 320 mL for bayam and pakcoy at NMI 0", () => {
    const result = calculateWaterVolume(0, 80, 2);

    expect(result.waterVolumeMl).toBe(320);
  });

  it("never lets the wet-stop limit reduce the estimate for targets up to 90", () => {
    for (const target of [90, 80]) {
      for (let nmi = 0; nmi <= 100; nmi += 1) {
        const result = calculateWaterVolume(nmi, target, 2);

        expect(result.waterVolumeMl).toBe(result.vNeedMl);
      }
    }
  });

  it("never returns a negative volume across the NMI domain", () => {
    for (let nmi = 0; nmi <= 100; nmi += 1) {
      const result = calculateWaterVolume(nmi, 90, 2);

      expect(result.waterVolumeMl).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("calculateLimeDosage (C501 Step 9, 2 L media)", () => {
  it("returns 2.86 g for selada at pH 5.4", () => {
    const result = calculateLimeDosage(5.4, 2, 6.5);

    expect(result.limeDosageGram).toBe(2.86);
  });

  it("stays between 0 and 4.7 g across the pH domain", () => {
    for (let ph = 0; ph <= 14; ph += 0.1) {
      const { limeDosageGram } = calculateLimeDosage(ph, 2, 6.5);

      expect(limeDosageGram).toBeGreaterThanOrEqual(0);
      expect(limeDosageGram).toBeLessThanOrEqual(4.7);
    }
  });
});

describe("calculateSulfurDosage (C501 Step 10, 2 L media)", () => {
  it("caps bayam at pH 7.6 from a raw 1.32 g to 1.2 g", () => {
    const result = calculateSulfurDosage(7.6, 2, 6.5);

    expect(result.sulfurDosageGram).toBe(1.2);
    expect(result.cappedByMax).toBe(true);
  });

  it("stays between 0 and 1.2 g across the pH domain", () => {
    for (let ph = 0; ph <= 14; ph += 0.1) {
      const { sulfurDosageGram } = calculateSulfurDosage(ph, 2, 6.5);

      expect(sulfurDosageGram).toBeGreaterThanOrEqual(0);
      expect(sulfurDosageGram).toBeLessThanOrEqual(1.2);
    }
  });
});
