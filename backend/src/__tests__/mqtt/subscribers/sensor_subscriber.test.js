"use strict";

jest.mock("../../../repositories/sensor_repository", () => ({
  saveRawSensorLog: jest.fn(),
  updateDeviceLastSeen: jest.fn(),
}));
jest.mock("../../../repositories/sensor_redis_repository", () => ({
  setLatestSensorData: jest.fn(),
  shouldSaveToDatabase: jest.fn(),
}));
jest.mock("../../../sse/sse_manager", () => ({ broadcastToDevice: jest.fn() }));
jest.mock("../../../database/connections/prisma_client", () => ({
  device: { findUnique: jest.fn() },
  recommendationLog: { create: jest.fn() },
}));
jest.mock("../../../ai/services/recommendation.service", () => ({
  generateRecommendation: jest.fn(),
}));
jest.mock("../../../database/connections/redis", () => ({
  getRedisClient: jest.fn(),
}));
jest.mock("../../../services/notification.service", () => ({
  notifyDevice: jest.fn(),
}));

const {
  saveRawSensorLog,
  updateDeviceLastSeen,
} = require("../../../repositories/sensor_repository");
const {
  setLatestSensorData,
  shouldSaveToDatabase,
} = require("../../../repositories/sensor_redis_repository");
const { broadcastToDevice } = require("../../../sse/sse_manager");
const prisma = require("../../../database/connections/prisma_client");
const {
  generateRecommendation,
} = require("../../../ai/services/recommendation.service");
const { getRedisClient } = require("../../../database/connections/redis");
const { notifyDevice } = require("../../../services/notification.service");
const {
  handleSensorMessage,
} = require("../../../mqtt/subscribers/sensor_subscriber");

const DEVICE_CODE = "ESP32-A1B2C3";
const TOPIC = `suburin/devices/${DEVICE_CODE}/telemetry`;
const PH_KEY = `sensor:ph_out_of_range:${DEVICE_CODE}`;
const DRY_KEY = `sensor:consecutive_dry:${DEVICE_CODE}`;
const WET_KEY = `sensor:consecutive_wet:${DEVICE_CODE}`;
const INVALID_KEY = `sensor:invalid_notified:${DEVICE_CODE}`;
const ACID_KEY = `sensor:ph_acid_notified:${DEVICE_CODE}`;
const ALKALINE_KEY = `sensor:ph_alkaline_notified:${DEVICE_CODE}`;

const deviceFixture = {
  id: "device-1",
  plantId: "plant-1",
  plant: { minPh: 6.0, maxPh: 7.0 },
};

const idleRecommendation = {
  fuzzyIndex: 1,
  categoryCode: "C1",
  actionText: "Monitoring",
  waterAction: "NONE",
  phAction: "NONE",
  waterVolumeLiter: 0,
  limeDosageGram: 0,
  sulfurDosageGram: 0,
  reduceWatering: false,
};

const send = (data, options) =>
  handleSensorMessage(TOPIC, Buffer.from(JSON.stringify(data)), options);

describe("handleSensorMessage", () => {
  let redis;
  let counters;

  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});

    counters = {};
    redis = {
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue("OK"),
      del: jest.fn().mockResolvedValue(1),
      incr: jest.fn(async (key) => {
        counters[key] = (counters[key] ?? 0) + 1;
        return counters[key];
      }),
    };
    getRedisClient.mockReturnValue(redis);
    prisma.device.findUnique.mockResolvedValue(deviceFixture);
    prisma.recommendationLog.create.mockResolvedValue({});
    generateRecommendation.mockResolvedValue(idleRecommendation);
    shouldSaveToDatabase.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("message filtering", () => {
    it("ignores a topic that is not a telemetry topic", async () => {
      await handleSensorMessage("other/topic", Buffer.from("{}"));

      expect(setLatestSensorData).not.toHaveBeenCalled();
    });

    it("ignores a payload that is not valid JSON", async () => {
      await handleSensorMessage(TOPIC, Buffer.from("not-json"));

      expect(setLatestSensorData).not.toHaveBeenCalled();
    });

    it("skips the recommendation when the device is not registered", async () => {
      prisma.device.findUnique.mockResolvedValue(null);

      await send({ ph: 6.5, moisture: 80 });

      expect(setLatestSensorData).toHaveBeenCalledWith(DEVICE_CODE, 6.5, 80);
      expect(generateRecommendation).not.toHaveBeenCalled();
    });
  });

  describe("invalid sensor values", () => {
    it("notifies the device owner once when a value is out of range", async () => {
      await send({ ph: 15, moisture: 80 });

      expect(notifyDevice).toHaveBeenCalledWith(
        "device-1",
        expect.objectContaining({ title: "Data Sensor Tidak Valid" }),
      );
      expect(redis.setex).toHaveBeenCalledWith(INVALID_KEY, 3600, "1");
    });

    it("does not notify again while the invalid-data notification is still active", async () => {
      redis.get.mockResolvedValue("1");

      await send({ ph: 15, moisture: 80 });

      expect(notifyDevice).not.toHaveBeenCalled();
    });

    it("does not store the invalid reading", async () => {
      await send({ ph: 6.5, moisture: 101 });

      expect(setLatestSensorData).not.toHaveBeenCalled();
    });
  });

  describe("valid reading", () => {
    it("broadcasts the reading to the device stream", async () => {
      await send({ ph: 6.5, moisture: 80 });

      expect(broadcastToDevice).toHaveBeenCalledWith(
        "device-1",
        expect.objectContaining({
          deviceId: "device-1",
          ph: 6.5,
          moisture: 80,
        }),
      );
    });

    it("accepts soil_moisture as an alias of moisture", async () => {
      await send({ ph: 6.5, soil_moisture: 80 });

      expect(setLatestSensorData).toHaveBeenCalledWith(DEVICE_CODE, 6.5, 80);
    });

    it("saves the recommendation log with the computed result", async () => {
      generateRecommendation.mockResolvedValue({
        ...idleRecommendation,
        categoryCode: "C2",
        waterAction: "IRRIGATE",
        waterVolumeLiter: 0.16,
      });

      await send({ ph: 6.5, moisture: 50 });

      expect(prisma.recommendationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          deviceId: "device-1",
          phValue: 6.5,
          moistureValue: 50,
          categoryCode: "C2",
          waterVolumeLiter: 0.16,
          isDev: false,
        }),
      });
    });

    it("flags the recommendation log as dev data in dev mode", async () => {
      await send({ ph: 6.5, moisture: 80 }, { isDev: true });

      expect(prisma.recommendationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ isDev: true }),
      });
    });

    it("saves the raw sensor log when the throttle allows it", async () => {
      await send({ ph: 6.5, moisture: 80 });

      expect(saveRawSensorLog).toHaveBeenCalledWith("device-1", 6.5, 80, false);
      expect(updateDeviceLastSeen).toHaveBeenCalledWith("device-1");
    });

    it("skips the raw sensor log when the throttle blocks it", async () => {
      shouldSaveToDatabase.mockResolvedValue(false);

      await send({ ph: 6.5, moisture: 80 });

      expect(saveRawSensorLog).not.toHaveBeenCalled();
    });

    it("still saves the raw sensor log when the recommendation fails", async () => {
      generateRecommendation.mockRejectedValue(new Error("engine down"));

      await send({ ph: 6.5, moisture: 80 });

      expect(saveRawSensorLog).toHaveBeenCalled();
    });

    it("passes the device id to the recommendation for correction history", async () => {
      await send({ ph: 6.5, moisture: 80 });

      expect(generateRecommendation).toHaveBeenCalledWith(
        expect.objectContaining({
          plantIdOrName: "plant-1",
          deviceId: "device-1",
        }),
      );
    });
  });

  describe("consistent pH readings for the safety gate", () => {
    it("counts a reading at the lime threshold (minimum pH minus 0.5)", async () => {
      await send({ ph: 5.5, moisture: 80 });

      expect(generateRecommendation).toHaveBeenCalledWith(
        expect.objectContaining({ consistentReadings: 1 }),
      );
    });

    it("counts a reading at the sulfur threshold (maximum pH plus 0.5)", async () => {
      await send({ ph: 7.5, moisture: 80 });

      expect(generateRecommendation).toHaveBeenCalledWith(
        expect.objectContaining({ consistentReadings: 1 }),
      );
    });

    it("does not count a reading just inside the lime threshold", async () => {
      await send({ ph: 5.6, moisture: 80 });

      expect(generateRecommendation).toHaveBeenCalledWith(
        expect.objectContaining({ consistentReadings: 0 }),
      );
    });

    it("does not count a reading just inside the sulfur threshold", async () => {
      await send({ ph: 7.4, moisture: 80 });

      expect(generateRecommendation).toHaveBeenCalledWith(
        expect.objectContaining({ consistentReadings: 0 }),
      );
    });

    it("accumulates consecutive out-of-range readings", async () => {
      await send({ ph: 5.4, moisture: 80 });
      await send({ ph: 5.3, moisture: 80 });

      expect(generateRecommendation).toHaveBeenLastCalledWith(
        expect.objectContaining({ consistentReadings: 2 }),
      );
    });

    it("resets the counter when the pH returns inside the threshold", async () => {
      await send({ ph: 6.5, moisture: 80 });

      expect(redis.del).toHaveBeenCalledWith(PH_KEY);
      expect(generateRecommendation).toHaveBeenCalledWith(
        expect.objectContaining({ consistentReadings: 0 }),
      );
    });
  });

  describe("watering notifications", () => {
    const dryRecommendation = {
      ...idleRecommendation,
      waterAction: "IRRIGATE",
      waterVolumeLiter: 0.16,
    };

    it("does not notify on the first dry reading", async () => {
      generateRecommendation.mockResolvedValue(dryRecommendation);

      await send({ ph: 6.5, moisture: 50 });

      expect(notifyDevice).not.toHaveBeenCalled();
    });

    it("notifies the watering volume on the second consecutive dry reading", async () => {
      generateRecommendation.mockResolvedValue(dryRecommendation);

      await send({ ph: 6.5, moisture: 50 });
      await send({ ph: 6.5, moisture: 50 });

      expect(notifyDevice).toHaveBeenCalledWith(
        "device-1",
        expect.objectContaining({
          title: "Media Kering",
          message: "Media kering. Siram sekitar 160 mL.",
        }),
      );
    });

    it("does not notify a dry reading when no water volume is recommended", async () => {
      generateRecommendation.mockResolvedValue({
        ...dryRecommendation,
        waterVolumeLiter: 0,
      });

      await send({ ph: 6.5, moisture: 99 });
      await send({ ph: 6.5, moisture: 99 });

      expect(notifyDevice).not.toHaveBeenCalled();
    });

    it("notifies on the second consecutive wet reading", async () => {
      generateRecommendation.mockResolvedValue({
        ...idleRecommendation,
        waterAction: "STOP",
        reduceWatering: true,
      });

      await send({ ph: 6.5, moisture: 95 });
      await send({ ph: 6.5, moisture: 95 });

      expect(notifyDevice).toHaveBeenCalledWith(
        "device-1",
        expect.objectContaining({ title: "Media Terlalu Basah" }),
      );
    });

    it("clears both watering counters when no water action applies", async () => {
      await send({ ph: 6.5, moisture: 80 });

      expect(redis.del).toHaveBeenCalledWith(DRY_KEY);
      expect(redis.del).toHaveBeenCalledWith(WET_KEY);
    });
  });

  describe("pH correction notifications", () => {
    it("notifies the lime dosage once and remembers it for an hour", async () => {
      generateRecommendation.mockResolvedValue({
        ...idleRecommendation,
        phAction: "LIME",
        limeDosageGram: 2.86,
      });

      await send({ ph: 5.4, moisture: 80 });

      expect(notifyDevice).toHaveBeenCalledWith(
        "device-1",
        expect.objectContaining({
          title: "pH Terlalu Asam",
          message: expect.stringContaining("2.9 gram"),
        }),
      );
      expect(redis.setex).toHaveBeenCalledWith(ACID_KEY, 3600, "1");
    });

    it("does not repeat the lime notification while it is remembered", async () => {
      generateRecommendation.mockResolvedValue({
        ...idleRecommendation,
        phAction: "LIME",
        limeDosageGram: 2.86,
      });
      redis.get.mockImplementation(async (key) =>
        key === ACID_KEY ? "1" : null,
      );

      await send({ ph: 5.4, moisture: 80 });

      expect(notifyDevice).not.toHaveBeenCalled();
    });

    it("notifies the sulfur dosage once and remembers it for an hour", async () => {
      generateRecommendation.mockResolvedValue({
        ...idleRecommendation,
        phAction: "SULFUR",
        sulfurDosageGram: 1.2,
      });

      await send({ ph: 7.6, moisture: 80 });

      expect(notifyDevice).toHaveBeenCalledWith(
        "device-1",
        expect.objectContaining({ title: "pH Terlalu Basa" }),
      );
      expect(redis.setex).toHaveBeenCalledWith(ALKALINE_KEY, 3600, "1");
    });

    it("does not notify a deferred correction whose dosage is zero", async () => {
      generateRecommendation.mockResolvedValue({
        ...idleRecommendation,
        phAction: "LIME",
        limeDosageGram: 0,
      });

      await send({ ph: 5.3, moisture: 92.5 });

      expect(notifyDevice).not.toHaveBeenCalled();
    });

    it("clears the remembered pH notifications once no correction applies", async () => {
      await send({ ph: 6.5, moisture: 80 });

      expect(redis.del).toHaveBeenCalledWith(ACID_KEY);
      expect(redis.del).toHaveBeenCalledWith(ALKALINE_KEY);
    });
  });
});
