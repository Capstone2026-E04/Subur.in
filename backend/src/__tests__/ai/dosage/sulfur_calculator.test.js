"use strict";

const { calculateSulfurDosage } = require("../../../ai/dosage/sulfur_calculator");

describe("calculateSulfurDosage", () => {
  it("returns zero dosage when pH is already within tolerance of the maximum", () => {
    const result = calculateSulfurDosage(7.0, 10, 6.5, 7.0);

    expect(result.sulfurDosageGram).toBe(0);
  });

  it("returns a positive uncapped dosage when moderately above tolerance", () => {
    const result = calculateSulfurDosage(7.5, 10, 6.5, 7.0);

    expect(result.sulfurDosageGram).toBeGreaterThan(0);
    expect(result.cappedByMSMax).toBe(false);
  });

  it("caps the dosage at M_S_MAX_PER_LITER and flags staged application for very alkaline pH", () => {
    const result = calculateSulfurDosage(14, 10, 6.5, 7.0);

    expect(result.cappedByMSMax).toBe(true);
    expect(result.requiresStagedApplication).toBe(true);
    expect(result.sulfurDosageGram).toBeLessThanOrEqual(result.mSMax);
  });

  it("throws a TypeError when given non-numeric input", () => {
    expect(() => calculateSulfurDosage("7.5", 10, 6.5, 7.0)).toThrow(TypeError);
  });
});
