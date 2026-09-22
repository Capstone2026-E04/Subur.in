"use strict";

const { calculateLimeDosage } = require("../../../ai/dosage/lime_calculator");

describe("calculateLimeDosage", () => {
  it("returns zero dosage when pH is already within tolerance of the minimum", () => {
    const result = calculateLimeDosage(6.0, 10, 6.5, 6.0);

    expect(result.limeDosageGram).toBe(0);
  });

  it("returns a dosage proportional to K_L * volume * (target - pH) when below tolerance", () => {
    const result = calculateLimeDosage(5.5, 10, 6.5, 6.0);

    expect(result.limeDosageGram).toBe(13.0);
  });

  it("has no upper cap, unlike the sulfur calculator", () => {
    const result = calculateLimeDosage(0, 10, 6.5, 6.0);

    expect(result.limeDosageGram).toBe(1.3 * 10 * 6.5);
  });

  it("throws a TypeError when given non-numeric input", () => {
    expect(() => calculateLimeDosage("5.5", 10, 6.5, 6.0)).toThrow(TypeError);
  });
});
