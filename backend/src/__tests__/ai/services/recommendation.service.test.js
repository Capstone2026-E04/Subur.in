"use strict";

const prisma = require("../../../database/connections/prisma_client");
const {
  generateRecommendation,
} = require("../../../ai/services/recommendation.service");

jest.mock("../../../database/connections/prisma_client", () => ({
  plant: { findUnique: jest.fn(), findFirst: jest.fn() },
}));

const PLANT_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const plantFixture = {
  id: PLANT_ID,
  name: "Selada",
  scientificName: "Lactuca sativa",
  minPh: 6.0,
  maxPh: 6.7,
  phTarget: 6.5,
};

const request = (overrides) => ({
  phValue: 6.5,
  moistureValue: 30,
  plantIdOrName: PLANT_ID,
  ...overrides,
});

const acidicDryRequest = (overrides) =>
  request({ phValue: 5.4, moistureValue: 10, ...overrides });

describe("generateRecommendation", () => {
  beforeEach(() => {
    prisma.plant.findUnique.mockResolvedValue(plantFixture);
  });

  describe("safety gate", () => {
    it("defers lime but keeps the water estimate with fewer than two consistent readings", async () => {
      const input = acidicDryRequest({ consistentReadings: 1 });

      const result = await generateRecommendation(input);

      expect(result.categoryCode).toBe("C5");
      expect(result.limeDosageGram).toBe(0);
      expect(result.waterVolumeLiter).toBeGreaterThan(0);
    });
  });

  describe("prototype configuration", () => {
    it("uses the fixed polybag preset", async () => {
      const result = await generateRecommendation(request());

      expect(result._debug.polybagPresetUsed).toBe("STANDAR");
    });

    it("uses 2 L of media for the dosage calculators", async () => {
      const result = await generateRecommendation(request());

      expect(result._debug.volumeLiterUsed).toBe(2);
    });
  });

  describe("input validation", () => {
    it("rejects a pH value outside the 0-14 range", async () => {
      const input = request({ phValue: 15.0 });

      await expect(generateRecommendation(input)).rejects.toMatchObject({
        statusCode: 400,
        message: "phValue harus berada dalam rentang 0 sampai 14.",
      });
    });

    it("rejects a moisture value outside the 0-100 range", async () => {
      const input = request({ moistureValue: -10.0 });

      await expect(generateRecommendation(input)).rejects.toMatchObject({
        statusCode: 400,
        message:
          "moistureValue (VWC, persen) harus berada dalam rentang 0 sampai 100.",
      });
    });

    it("rejects when the plant cannot be found in the database", async () => {
      prisma.plant.findUnique.mockResolvedValue(null);

      await expect(generateRecommendation(request())).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("rejects a plant without moisture parameters", async () => {
      prisma.plant.findUnique.mockResolvedValue({
        ...plantFixture,
        name: "Kangkung",
      });

      await expect(generateRecommendation(request())).rejects.toMatchObject({
        statusCode: 422,
      });
    });
  });
});
