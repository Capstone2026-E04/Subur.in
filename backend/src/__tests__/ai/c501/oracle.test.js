"use strict";

const prisma = require("../../../database/connections/prisma_client");
const { runInference } = require("../../../ai/core/engine");
const { fuzzifyMoisture } = require("../../../ai/core/membership");
const {
  generateRecommendation,
} = require("../../../ai/services/recommendation.service");
const { PLANTS } = require("./fixtures");

jest.mock("../../../database/connections/prisma_client", () => ({
  plant: { findUnique: jest.fn() },
}));

const PLANT_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const recommend = (phValue, theta, extra = {}, plantKey = "bayam") => {
  prisma.plant.findUnique.mockResolvedValue({
    id: PLANT_ID,
    ...PLANTS[plantKey],
  });
  return generateRecommendation({
    phValue,
    moistureValue: theta * 100,
    plantIdOrName: PLANT_ID,
    ...extra,
  });
};

describe("fuzzifyMoisture (Bagian 4.4)", () => {
  it("sums to 1 and stays two-set wide across the whole domain", () => {
    for (let theta = 0; theta <= 0.6; theta += 0.005) {
      const m = fuzzifyMoisture(theta);
      expect(m.kering + m.lembap + m.jenuh).toBeCloseTo(1, 9);
      expect(m.kering * m.jenuh).toBe(0);
    }
  });
});

describe("centroid values (Bagian 4.9)", () => {
  it.each([
    [5.7, 0.18],
    [5.78, 0.1],
    [7.2, -0.08],
    [5.5, 0.67],
  ])("pH %s gives y* %s on the pH axis at theta 0.30", (ph, expected) => {
    const { centroids } = runInference(ph, 0.3, PLANTS.bayam);

    expect(centroids.ph).toBeCloseTo(expected, 2);
  });
});

describe("software oracle (Bagian 4.11)", () => {
  it.each([
    [0.1, 6.5, "C2", 0.2, 0, 0],
    [0.2, 6.5, "C2", 0.1607, 0, 0],
    [0.22, 6.5, "C2", 0.1207, 0, 0],
    [0.2208, 6.5, "C2", 0.1191, 0, 0],
    [0.231, 6.5, "C1", 0, 0, 0],
    [0.221, 6.5, "C2", 0.1187, 0, 0],
    [0.25, 6.5, "C1", 0, 0, 0],
    [0.3298, 6.5, "C1", 0, 0, 0],
    [0.1, 5.5, "C5", 0.2, 2.6, 0],
    [0.3, 7.6, "C7", 0, 0, 1.32],
    [0.1, 5.0, "C5", 0.2, 2.8, 0],
    [0.1, 7.6, "C8", 0.2, 0, 1.32],
    [0.3, 5.5, "C4", 0, 2.6, 0],
    [0.3, 8.5, "C7", 0, 0, 2.4],
    [0.3, 7.0, "C1", 0, 0, 0],
    [0.15, 6.5, "C2", 0.2, 0, 0],
  ])(
    "theta %s, pH %s -> %s, %s L, lime %s g, sulfur %s g",
    async (theta, ph, category, liter, lime, sulfur) => {
      const r = await recommend(ph, theta);

      expect(r.categoryCode).toBe(category);
      expect(r.waterVolumeLiter).toBeCloseTo(liter, 3);
      expect(r._debug.limeDetail?.limeDosageGram ?? 0).toBe(lime);
      expect(r._debug.sulfurDetail?.sulfurDosageGram ?? 0).toBe(sulfur);
    },
  );

  it.each([
    [6.5, "C3", 0, 0],
    [5.5, "C6", 2.6, 0],
    [7.6, "C9", 0, 1.32],
  ])(
    "safety override at pH %s -> %s with water 0 and the pH dose deferred",
    async (ph, category, lime, sulfur) => {
      const r = await recommend(ph, 0.3, {
        safetyOverride: "sensor_out_of_range",
      });

      expect(r.categoryCode).toBe(category);
      expect(r.decisionSource).toBe("safety_override");
      expect(r.waterVolumeLiter).toBe(0);
      expect(r._debug.limeDetail?.limeDosageGram ?? 0).toBe(lime);
      expect(r._debug.sulfurDetail?.sulfurDosageGram ?? 0).toBe(sulfur);
      expect(r.limeDosageGram + r.sulfurDosageGram).toBe(0);
    },
  );
});

describe("per-plant water thresholds", () => {
  it.each([
    ["bayam", 0.2305, "C2"],
    ["bayam", 0.2315, "C1"],
    ["selada", 0.214, "C2"],
    ["selada", 0.215, "C1"],
    ["pakcoy", 0.1975, "C2"],
    ["pakcoy", 0.1985, "C1"],
  ])("%s at theta %s -> %s", async (plantKey, theta, category) => {
    const r = await recommend(6.5, theta, {}, plantKey);

    expect(r.categoryCode).toBe(category);
    if (category === "C2") expect(r.waterVolumeLiter).toBeGreaterThan(0);
    else expect(r.waterVolumeLiter).toBe(0);
  });

  it.each([
    ["bayam", 0.2, 0.1607],
    ["selada", 0.2, 0.1277],
    ["pakcoy", 0.19, 0.1476],
  ])("%s at theta %s irrigates %s L", async (plantKey, theta, liter) => {
    const r = await recommend(6.5, theta, {}, plantKey);

    expect(r.waterVolumeLiter).toBeCloseTo(liter, 3);
  });
});
