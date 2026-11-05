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
  claimWaterDecision,
  confirmWaterAction,
} = require("../../../ai/services/water_schedule.service");
const {
  classifyEmergency,
  isRecovered,
} = require("../../../ai/core/water_schedule");

// Entri jendela Redis: "<epoch ms>:<VWC>", terbaru dulu.
const fresh = (values) => values.map((v) => `${Date.now()}:${v}`);

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

describe("isRecovered", () => {
  it.each([
    [[22.07, 25], true],
    [[22.06, 25], false],
    [[30], false],
  ])("%j -> %s", (readings, expected) => {
    expect(isRecovered(readings)).toBe(expected);
  });
});

describe("claimEmergency", () => {
  let redis;
  beforeEach(() => {
    jest.resetAllMocks();
    redis = {
      lrange: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn().mockResolvedValue(0),
    };
    getRedisClient.mockReturnValue(redis);
    redis.set.mockResolvedValue("OK");
    prisma.recommendationLog.findFirst.mockResolvedValue(null);
  });

  it("claims dry_critical once and restarts the 4-hour slot", async () => {
    redis.lrange.mockResolvedValue(fresh(["10", "12"]));
    expect(await claimEmergency("D", "id", 60)).toBe("dry_critical");
    expect(redis.set).toHaveBeenCalledWith(
      "sensor:emergency:D:dry_critical",
      "1",
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
    redis.lrange.mockResolvedValue(fresh(["10", "12"]));
    redis.set.mockResolvedValue(null);
    expect(await claimEmergency("D", "id", 60)).toBeNull();
    expect(redis.set).toHaveBeenCalledTimes(1);
  });

  it("ignores a wet surge preceded by a confirmed watering", async () => {
    redis.lrange.mockResolvedValue(fresh(["32", "20"]));
    prisma.recommendationLog.findFirst.mockResolvedValue({ id: 1 });
    expect(await claimEmergency("D", "id", 60)).toBeNull();
    expect(redis.set).not.toHaveBeenCalled();
  });

  it("claims an unexplained wet surge with a 4-hour latch", async () => {
    redis.lrange.mockResolvedValue(fresh(["32", "20"]));
    expect(await claimEmergency("D", "id", 60)).toBe("wet_surge");
    expect(redis.set).toHaveBeenCalledWith(
      "sensor:emergency:D:wet_surge",
      "1",
      "EX",
      4 * 3600,
      "NX",
    );
  });

  it("skips emergency checks during the settling window", async () => {
    redis.lrange.mockResolvedValue(fresh(["10", "12"]));
    redis.exists.mockResolvedValue(1);
    expect(await claimEmergency("D", "id", 60)).toBeNull();
    expect(redis.set).not.toHaveBeenCalled();
  });

  it("clears the dry latch once readings recover twice in a row", async () => {
    redis.lrange.mockResolvedValue(fresh(["23", "22.5"]));
    expect(await claimEmergency("D", "id", 60)).toBeNull();
    expect(redis.del).toHaveBeenCalledWith("sensor:emergency:D:dry_critical");
  });
});

describe("stale readings", () => {
  let redis;
  beforeEach(() => {
    jest.resetAllMocks();
    redis = { lrange: jest.fn(), set: jest.fn().mockResolvedValue("OK") };
    getRedisClient.mockReturnValue(redis);
  });

  it("drops readings older than 4 sensor intervals before taking the median", async () => {
    const day = 24 * 3600 * 1000;
    redis.lrange.mockResolvedValue([
      `${Date.now()}:13.81`,
      `${Date.now() - day}:25.81`,
      `${Date.now() - day}:25.85`,
      `${Date.now() - day}:25.74`,
    ]);
    expect(await claimWaterDecision("D", 60)).toBeNull();
    expect(redis.set).not.toHaveBeenCalled();
  });

  it("medians fresh readings and ignores legacy entries without a timestamp", async () => {
    redis.lrange.mockResolvedValue([...fresh([10, 14]), "25.8"]);
    expect(await claimWaterDecision("D", 60)).toBe(12);
  });
});

describe("confirmWaterAction", () => {
  it("restarts the slot, clears emergencies and opens a 2-hour settling window", async () => {
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
    expect(redis.del).toHaveBeenCalledWith(
      "sensor:emergency:D:dry_critical",
      "sensor:emergency:D:wet_surge",
    );
    expect(redis.set).toHaveBeenCalledWith(
      "sensor:emergency_settle:D",
      "1",
      "EX",
      2 * 3600,
    );
  });
});
