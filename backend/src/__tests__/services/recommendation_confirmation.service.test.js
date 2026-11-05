"use strict";

jest.mock("../../database/connections/prisma_client", () => ({
  recommendationLog: { findFirst: jest.fn(), updateMany: jest.fn() },
}));

jest.mock("../../ai/services/water_schedule.service", () => ({
  confirmWaterAction: jest.fn(),
}));

const prisma = require("../../database/connections/prisma_client");
const {
  confirmWaterAction,
} = require("../../ai/services/water_schedule.service");
const {
  confirmLatestRecommendation,
} = require("../../services/recommendation_confirmation.service");

beforeEach(() => jest.resetAllMocks());

describe("confirmLatestRecommendation", () => {
  it("returns none when the device has no log", async () => {
    prisma.recommendationLog.findFirst.mockResolvedValue(null);
    expect((await confirmLatestRecommendation("d1")).status).toBe("none");
  });

  it("returns already when the latest log is confirmed", async () => {
    prisma.recommendationLog.findFirst.mockResolvedValue({
      id: "l1",
      confirmedAt: new Date(),
    });
    expect((await confirmLatestRecommendation("d1")).status).toBe("already");
    expect(prisma.recommendationLog.updateMany).not.toHaveBeenCalled();
  });

  it("confirms the latest unconfirmed log", async () => {
    prisma.recommendationLog.findFirst.mockResolvedValue({
      id: "l1",
      confirmedAt: null,
    });
    prisma.recommendationLog.updateMany.mockResolvedValue({ count: 1 });
    const result = await confirmLatestRecommendation("d1", "DEV-1");
    expect(result.status).toBe("confirmed");
    expect(confirmWaterAction).toHaveBeenCalledWith("DEV-1");
    expect(prisma.recommendationLog.updateMany).toHaveBeenCalledWith({
      where: { id: "l1", confirmedAt: null },
      data: { confirmedAt: expect.any(Date) },
    });
  });

  it("returns already when another request confirmed it first", async () => {
    prisma.recommendationLog.findFirst.mockResolvedValue({
      id: "l1",
      confirmedAt: null,
    });
    prisma.recommendationLog.updateMany.mockResolvedValue({ count: 0 });
    expect((await confirmLatestRecommendation("d1")).status).toBe("already");
    expect(confirmWaterAction).not.toHaveBeenCalled();
  });
});
