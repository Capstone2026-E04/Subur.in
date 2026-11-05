"use strict";

jest.mock("../../../database/connections/redis", () => ({
  getRedisClient: jest.fn(),
}));
jest.mock("../../../database/connections/prisma_client", () => ({
  recommendationLog: { findFirst: jest.fn() },
}));

const { getRedisClient } = require("../../../database/connections/redis");
const prisma = require("../../../database/connections/prisma_client");
const {
  claimEmergency,
  confirmWaterAction,
} = require("../../../ai/services/water_schedule.service");
const { classifyEmergency } = require("../../../ai/core/water_schedule");

describe("classifyEmergency (newest first, VWC %)", () => {
  it.each([
    [[16.49, 10], "dry_critical"],
    [[10, 16.49], "dry_critical"],
    [[16.5, 10], null],
    [[10], null],
    [[30, 22], "wet_surge"],
    [[29.9, 22], null],
    [[25, 25], null],
  ])("%j -> %s", (readings, expected) => {
    expect(classifyEmergency(readings)).toBe(expected);
  });
});

describe("claimEmergency", () => {
  let redis;
  beforeEach(() => {
    jest.resetAllMocks();
    redis = { lrange: jest.fn(), set: jest.fn(), del: jest.fn() };
    getRedisClient.mockReturnValue(redis);
    redis.set.mockResolvedValue("OK");
    prisma.recommendationLog.findFirst.mockResolvedValue(null);
  });

  it("claims dry_critical once and restarts the 4-hour slot", async () => {
    redis.lrange.mockResolvedValue(["10", "12"]);
    expect(await claimEmergency("D", "id")).toBe("dry_critical");
    expect(redis.set).toHaveBeenCalledWith(
      "sensor:emergency:D",
      "dry_critical",
      "EX",
      4 * 3600,
      "NX",
    );
    expect(redis.set).toHaveBeenCalledWith(
      "sensor:water_decision:D",
      "1",
      "EX",
      4 * 3600,
    );
  });

  it("returns null while the emergency claim is still held", async () => {
    redis.lrange.mockResolvedValue(["10", "12"]);
    redis.set.mockResolvedValue(null);
    expect(await claimEmergency("D", "id")).toBeNull();
    expect(redis.set).toHaveBeenCalledTimes(1);
  });

  it("ignores a wet surge preceded by a confirmed watering", async () => {
    redis.lrange.mockResolvedValue(["32", "20"]);
    prisma.recommendationLog.findFirst.mockResolvedValue({ id: 1 });
    expect(await claimEmergency("D", "id")).toBeNull();
    expect(redis.set).not.toHaveBeenCalled();
  });

  it("claims an unexplained wet surge", async () => {
    redis.lrange.mockResolvedValue(["32", "20"]);
    expect(await claimEmergency("D", "id")).toBe("wet_surge");
  });
});

describe("confirmWaterAction", () => {
  it("restarts the slot and frees the emergency claim", async () => {
    jest.resetAllMocks();
    const redis = { set: jest.fn(), del: jest.fn() };
    getRedisClient.mockReturnValue(redis);
    await confirmWaterAction("D");
    expect(redis.set).toHaveBeenCalledWith(
      "sensor:water_decision:D",
      "1",
      "EX",
      4 * 3600,
    );
    expect(redis.del).toHaveBeenCalledWith("sensor:emergency:D");
  });
});
