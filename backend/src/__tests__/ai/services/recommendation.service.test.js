"use strict";

const prisma = require("../../../database/connections/prisma_client");
const { generateRecommendation } = require("../../../ai/services/recommendation.service");

jest.mock("../../../database/connections/prisma_client", () => ({
  polybag: { findUnique: jest.fn(), findFirst: jest.fn() },
  plant: { findUnique: jest.fn(), findFirst: jest.fn() },
}));

const POLYBAG_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const PLANT_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const polybagFixture = {
  id: POLYBAG_ID,
  polybagType: { name: "Standar", diameter: 25, height: 30 },
};

const plantFixture = {
  id: PLANT_ID,
  name: "Selada",
  scientificName: "Lactuca sativa",
  minPh: 6.0,
  maxPh: 7.0,
  phTarget: 6.5,
};

describe("generateRecommendation", () => {
  beforeEach(() => {
    prisma.polybag.findUnique.mockResolvedValue(polybagFixture);
    prisma.plant.findUnique.mockResolvedValue(plantFixture);
  });

  it("returns no treatment needed for an optimal reading (category C1)", async () => {
    const result = await generateRecommendation({
      phValue: 6.5,
      moistureValue: 30,
      polybagPreset: POLYBAG_ID,
      plantIdOrName: PLANT_ID,
    });

    expect(result.categoryCode).toBe("C1");
    expect(result.waterVolumeLiter).toBe(0);
    expect(result.limeDosageGram).toBe(0);
    expect(result.sulfurDosageGram).toBe(0);
  });

  it("returns lime and water dosage for acidic and dry soil (category C5)", async () => {
    const result = await generateRecommendation({
      phValue: 4.0,
      moistureValue: 5,
      polybagPreset: POLYBAG_ID,
      plantIdOrName: PLANT_ID,
    });

    expect(result.categoryCode).toBe("C5");
    expect(result.limeDosageGram).toBeGreaterThan(0);
    expect(result.waterVolumeLiter).toBeGreaterThan(0);
    expect(result.sulfurDosageGram).toBe(0);
  });

  it("resolves the physical preset dynamically from the polybag UUID", async () => {
    const result = await generateRecommendation({
      phValue: 6.5,
      moistureValue: 30,
      polybagPreset: POLYBAG_ID,
      plantIdOrName: PLANT_ID,
    });

    expect(prisma.polybag.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: POLYBAG_ID } }),
    );
    expect(result._debug.polybagPresetUsed).toBe("STANDAR");
    expect(result._debug.volumeLiterUsed).toBe(13.5);
  });

  it("rejects a pH value outside the 0-14 range", async () => {
    await expect(
      generateRecommendation({
        phValue: 15.0,
        moistureValue: 40.0,
        polybagPreset: POLYBAG_ID,
        plantIdOrName: PLANT_ID,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "phValue harus berada dalam rentang 0 sampai 14.",
    });
  });

  it("rejects a moisture value outside the 0-100 range", async () => {
    await expect(
      generateRecommendation({
        phValue: 6.0,
        moistureValue: -10.0,
        polybagPreset: POLYBAG_ID,
        plantIdOrName: PLANT_ID,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "moistureValue harus berada dalam rentang 0 sampai 100.",
    });
  });

  it("rejects when the plant cannot be found in the database", async () => {
    prisma.plant.findUnique.mockResolvedValue(null);

    await expect(
      generateRecommendation({
        phValue: 6.5,
        moistureValue: 30,
        polybagPreset: POLYBAG_ID,
        plantIdOrName: PLANT_ID,
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
