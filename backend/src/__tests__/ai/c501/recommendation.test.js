"use strict";

const prisma = require("../../../database/connections/prisma_client");
const {
  generateRecommendation,
} = require("../../../ai/services/recommendation.service");
const { PLANTS } = require("./fixtures");

jest.mock("../../../database/connections/prisma_client", () => ({
  plant: { findUnique: jest.fn() },
  correctionLog: { findFirst: jest.fn() },
}));

const PLANT_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const recommend = (plant, phValue, moistureValue) => {
  prisma.plant.findUnique.mockResolvedValue({ id: PLANT_ID, ...PLANTS[plant] });

  return generateRecommendation({
    phValue,
    moistureValue,
    plantIdOrName: PLANT_ID,
  });
};

describe("generateRecommendation water decision (C501 Step 8)", () => {
  it("recommends no water for selada at NMI 65 even though 100 mL would be needed (example C)", async () => {
    const result = await recommend("selada", 6.5, 65);

    expect(result.waterAction).toBe("NONE");
    expect(result.waterVolumeLiter).toBe(0);
  });

  it("recommends stopping water for bayam at NMI 95 (example D)", async () => {
    const result = await recommend("bayam", 6.5, 95);

    expect(result.waterAction).toBe("STOP");
    expect(result.waterVolumeLiter).toBe(0);
  });
});

describe("generateRecommendation system check (C501 Step 11)", () => {
  it("recommends 160 mL of water and 2.86 g of lime for selada at pH 5.4 and NMI 50", async () => {
    const result = await recommend("selada", 5.4, 50);

    expect(result.categoryCode).toBe("C5");
    expect(result.waterVolumeLiter).toBe(0.16);
    expect(result.limeDosageGram).toBe(2.86);
  });

  it("marks the lime correction ready for selada at pH 5.4 and NMI 50", async () => {
    const result = await recommend("selada", 5.4, 50);

    expect(result.phCorrection.status).toBe("READY");
  });

  it("stops water and defers lime for bayam at pH 5.3 and NMI 92.5", async () => {
    const result = await recommend("bayam", 5.3, 92.5);

    expect(result.categoryCode).toBe("C6");
    expect(result.waterVolumeLiter).toBe(0);
    expect(result.reduceWatering).toBe(true);
    expect(result.phAction).toBe("LIME");
    expect(result.phCorrection.status).toBe("DEFERRED");
    expect(result.limeDosageGram).toBe(0);
  });

  it("asks for confirmation instead of sulfur for pakcoy at pH 8.0 and NMI 80", async () => {
    const result = await recommend("pakcoy", 8.0, 80);

    expect(result.categoryCode).toBe("C7");
    expect(result.phCorrection.status).toBe("NEEDS_CONFIRMATION");
    expect(result.sulfurDosageGram).toBe(0);
  });

  it("recommends no action for bayam at pH 5.75 and NMI 70", async () => {
    const result = await recommend("bayam", 5.75, 70);

    expect(result.categoryCode).toBe("C1");
    expect(result.waterVolumeLiter).toBe(0);
    expect(result.limeDosageGram).toBe(0);
    expect(result.sulfurDosageGram).toBe(0);
  });

  it("recommends 160 mL of water without a pH correction for selada at pH 6.5 and NMI 50", async () => {
    const result = await recommend("selada", 6.5, 50);

    expect(result.categoryCode).toBe("C2");
    expect(result.waterVolumeLiter).toBe(0.16);
    expect(result.limeDosageGram).toBe(0);
    expect(result.sulfurDosageGram).toBe(0);
  });
});
