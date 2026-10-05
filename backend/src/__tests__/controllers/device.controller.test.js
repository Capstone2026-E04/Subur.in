"use strict";

jest.mock("../../database/connections/prisma_client", () => ({
  device: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  rawSensorLog: { deleteMany: jest.fn() },
  recommendationLog: { create: jest.fn() },
  $transaction: jest.fn(),
}));

jest.mock("../../database/connections/redis", () => ({
  getRedisClient: jest.fn(),
}));
jest.mock("../../ai/services/recommendation.service", () => ({
  generateRecommendation: jest.fn(),
}));
jest.mock("../../repositories/sensor_redis_repository", () => ({
  getLatestSensorData: jest.fn(),
}));
jest.mock("../../repositories/sensor_repository", () => ({
  getLatestSensorLog: jest.fn(),
}));
jest.mock("../../mqtt/publishers/config_publisher", () => ({
  publishDeviceConfig: jest.fn().mockResolvedValue({ topic: "t", payload: {} }),
}));

const prisma = require("../../database/connections/prisma_client");
const {
  publishDeviceConfig,
} = require("../../mqtt/publishers/config_publisher");
const {
  generateRecommendation,
} = require("../../ai/services/recommendation.service");
const {
  getLatestSensorData,
} = require("../../repositories/sensor_redis_repository");
const { getLatestSensorLog } = require("../../repositories/sensor_repository");
const {
  registerDevice,
  updateDevice,
  deleteDevice,
  getDeviceRecommendation,
} = require("../../controllers/device.controller");

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const BASE_BODY = {
  deviceCode: "dev-1",
  label: "Bayam",
  plantId: "p",
  polybagId: "b",
};

describe("sensorInterval validation", () => {
  it.each([0, -5, 1.5, "abc", null, 61])(
    "registerDevice rejects sensorInterval %p with 400",
    async (value) => {
      const res = makeRes();
      await registerDevice(
        { user: { id: "u" }, body: { ...BASE_BODY, sensorInterval: value } },
        res,
        jest.fn(),
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(prisma.device.findUnique).not.toHaveBeenCalled();
      expect(prisma.device.create).not.toHaveBeenCalled();
    },
  );

  it("registerDevice accepts a positive integer interval", async () => {
    prisma.device.findUnique.mockResolvedValue(null);
    prisma.device.create.mockResolvedValue({ id: "dev-1" });
    const res = makeRes();
    await registerDevice(
      { user: { id: "u" }, body: { ...BASE_BODY, sensorInterval: 30 } },
      res,
      jest.fn(),
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("registerDevice menyimpan kode alat sebagai deviceCode dan publish config ke kode tsb", async () => {
    prisma.device.findUnique.mockResolvedValue(null);
    prisma.device.create.mockResolvedValue({ id: "uuid-1" });
    await registerDevice(
      { user: { id: "u" }, body: BASE_BODY },
      makeRes(),
      jest.fn(),
    );
    expect(prisma.device.findUnique).toHaveBeenCalledWith({
      where: { deviceCode: "dev-1" },
    });
    const { data } = prisma.device.create.mock.calls.at(-1)[0];
    expect(data.deviceCode).toBe("dev-1");
    expect(data).not.toHaveProperty("id");
    expect(publishDeviceConfig).toHaveBeenCalledWith("dev-1", 15);
  });

  it.each([0, -1, 2.5, "x", 61])(
    "updateDevice rejects sensorInterval %p with 400",
    async (value) => {
      const res = makeRes();
      await updateDevice(
        {
          user: { id: "u" },
          params: { id: "dev-1" },
          body: { sensorInterval: value },
        },
        res,
        jest.fn(),
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(prisma.device.update).not.toHaveBeenCalled();
    },
  );
});

describe("deleteDevice", () => {
  it("deletes sensor logs and the device in one transaction, logs first", async () => {
    prisma.device.findFirst.mockResolvedValue({ id: "dev-1", userId: "u" });
    prisma.rawSensorLog.deleteMany.mockReturnValue("delete-logs");
    prisma.device.delete.mockReturnValue("delete-device");
    prisma.$transaction.mockResolvedValue([]);
    const res = makeRes();

    await deleteDevice(
      { user: { id: "u" }, params: { id: "dev-1" } },
      res,
      jest.fn(),
    );

    expect(prisma.rawSensorLog.deleteMany).toHaveBeenCalledWith({
      where: { deviceId: "dev-1" },
    });
    expect(prisma.device.delete).toHaveBeenCalledWith({
      where: { id: "dev-1" },
    });
    expect(prisma.$transaction).toHaveBeenCalledWith([
      "delete-logs",
      "delete-device",
    ]);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 404 and deletes nothing when the device is not owned by the user", async () => {
    prisma.device.findFirst.mockResolvedValue(null);
    const res = makeRes();

    await deleteDevice(
      { user: { id: "u" }, params: { id: "dev-1" } },
      res,
      jest.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("getDeviceRecommendation", () => {
  const req = { user: { id: "u" }, params: { id: "dev-1" } };
  const device = {
    id: "dev-1",
    userId: "u",
    polybagId: "b",
    plantId: "p",
    sensorInterval: 1,
  };
  const recommendation = {
    fuzzyIndex: 3,
    categoryCode: "C3",
    actionText: "Siram",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.device.findFirst.mockResolvedValue(device);
    getLatestSensorData.mockResolvedValue(null);
    getLatestSensorLog.mockResolvedValue(null);
    generateRecommendation.mockResolvedValue(recommendation);
  });

  it("returns the recommendation for fresh data without writing a log", async () => {
    const timestamp = new Date(Date.now() - 30 * 1000).toISOString();
    getLatestSensorData.mockResolvedValue({ ph: 6.5, moisture: 50, timestamp });
    const res = makeRes();

    await getDeviceRecommendation(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].data).toEqual({
      ...recommendation,
      timestamp,
    });
    expect(prisma.recommendationLog.create).not.toHaveBeenCalled();
  });

  it("returns null data for stale data without computing or writing", async () => {
    const timestamp = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    getLatestSensorData.mockResolvedValue({ ph: 6.5, moisture: 50, timestamp });
    const res = makeRes();

    await getDeviceRecommendation(req, res, jest.fn());

    const body = res.json.mock.calls[0][0];
    expect(res.status).toHaveBeenCalledWith(200);
    expect(body.data).toBeNull();
    expect(body.message).toBe(
      "Data sensor sudah lama. Periksa sensor, daya, atau koneksi alat.",
    );
    expect(generateRecommendation).not.toHaveBeenCalled();
    expect(prisma.recommendationLog.create).not.toHaveBeenCalled();
  });

  it("scales the stale threshold with sensorInterval", async () => {
    prisma.device.findFirst.mockResolvedValue({ ...device, sensorInterval: 5 });
    const timestamp = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    getLatestSensorData.mockResolvedValue({ ph: 6.5, moisture: 50, timestamp });
    const res = makeRes();

    await getDeviceRecommendation(req, res, jest.fn());

    expect(generateRecommendation).toHaveBeenCalled();
  });

  it("returns the no-data message when no sensor data exists", async () => {
    const res = makeRes();

    await getDeviceRecommendation(req, res, jest.fn());

    const body = res.json.mock.calls[0][0];
    expect(body.message).toBe("Belum ada data sensor tercatat untuk alat ini.");
    expect(body.data).toBeNull();
    expect(generateRecommendation).not.toHaveBeenCalled();
  });

  it("returns 404 when the device is not found", async () => {
    prisma.device.findFirst.mockResolvedValue(null);
    const res = makeRes();

    await getDeviceRecommendation(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(generateRecommendation).not.toHaveBeenCalled();
  });

  it("handles a Date timestamp from the DB fallback", async () => {
    const timestamp = new Date(Date.now() - 30 * 1000);
    getLatestSensorLog.mockResolvedValue({ ph: 6.5, moisture: 50, timestamp });
    const fresh = makeRes();
    await getDeviceRecommendation(req, fresh, jest.fn());
    expect(fresh.json.mock.calls[0][0].data).toEqual({
      ...recommendation,
      timestamp,
    });

    jest.clearAllMocks();
    prisma.device.findFirst.mockResolvedValue(device);
    getLatestSensorData.mockResolvedValue(null);
    getLatestSensorLog.mockResolvedValue({
      ph: 6.5,
      moisture: 50,
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
    });
    const stale = makeRes();
    await getDeviceRecommendation(req, stale, jest.fn());
    expect(stale.json.mock.calls[0][0].data).toBeNull();
    expect(generateRecommendation).not.toHaveBeenCalled();
  });
});
