"use strict";

const { calculateWaterVolume } = require("../../../ai/dosage/water_calculator");

describe("calculateWaterVolume", () => {
  it("returns zero volume when moisture is already at or above target", () => {
    const result = calculateWaterVolume(35, 10);

    expect(result.waterVolumeLiter).toBe(0);
  });

  it("returns a positive volume proportional to the moisture deficit", () => {
    const result = calculateWaterVolume(20, 10);

    expect(result.waterVolumeLiter).toBeGreaterThan(0);
  });

  it("caps the volume at V_MAX_FRACTION of the container volume for very dry soil", () => {
    const result = calculateWaterVolume(0, 10);

    expect(result.cappedByVmax).toBe(true);
    expect(result.waterVolumeLiter).toBeLessThanOrEqual(result.vMax);
  });

  it("throws a TypeError when given non-numeric input", () => {
    expect(() => calculateWaterVolume("20", 10)).toThrow(TypeError);
  });
});
