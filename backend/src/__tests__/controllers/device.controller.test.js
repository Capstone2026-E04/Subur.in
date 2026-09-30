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
  $transaction: jest.fn(),
}));

jest.mock("../../database/connections/redis", () => ({ getRedisClient: jest.fn() }));
jest.mock("../../ai/services/recommendation.service", () => ({ generateRecommendation: jest.fn() }));
jest.mock("../../repositories/sensor_redis_repository", () => ({ getLatestSensorData: jest.fn() }));
jest.mock("../../repositories/sensor_repository", () => ({ getLatestSensorLog: jest.fn() }));
jest.mock("../../mqtt/publishers/config_publisher", () => ({
  publishDeviceConfig: jest.fn().mockResolvedValue({ topic: "t", payload: {} }),
}));

const prisma = require("../../database/connections/prisma_client");
const { registerDevice, updateDevice, deleteDevice } = require("../../controllers/device.controller");

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const BASE_BODY = { deviceId: "dev-1", label: "Bayam", plantId: "p", polybagId: "b" };

describe("sensorInterval validation", () => {
  it.each([0, -5, 1.5, "abc", null])("registerDevice rejects sensorInterval %p with 400", async (value) => {
    const res = makeRes();
    await registerDevice({ user: { id: "u" }, body: { ...BASE_BODY, sensorInterval: value } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.device.findUnique).not.toHaveBeenCalled();
    expect(prisma.device.create).not.toHaveBeenCalled();
  });

  it("registerDevice accepts a positive integer interval", async () => {
    prisma.device.findUnique.mockResolvedValue(null);
    prisma.device.create.mockResolvedValue({ id: "dev-1" });
    const res = makeRes();
    await registerDevice({ user: { id: "u" }, body: { ...BASE_BODY, sensorInterval: 30 } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it.each([0, -1, 2.5, "x"])("updateDevice rejects sensorInterval %p with 400", async (value) => {
    const res = makeRes();
    await updateDevice({ user: { id: "u" }, params: { id: "dev-1" }, body: { sensorInterval: value } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.device.update).not.toHaveBeenCalled();
  });
});

describe("deleteDevice", () => {
  it("deletes sensor logs and the device in one transaction, logs first", async () => {
    prisma.device.findFirst.mockResolvedValue({ id: "dev-1", userId: "u" });
    prisma.rawSensorLog.deleteMany.mockReturnValue("delete-logs");
    prisma.device.delete.mockReturnValue("delete-device");
    prisma.$transaction.mockResolvedValue([]);
    const res = makeRes();

    await deleteDevice({ user: { id: "u" }, params: { id: "dev-1" } }, res, jest.fn());

    expect(prisma.rawSensorLog.deleteMany).toHaveBeenCalledWith({ where: { deviceId: "dev-1" } });
    expect(prisma.device.delete).toHaveBeenCalledWith({ where: { id: "dev-1" } });
    expect(prisma.$transaction).toHaveBeenCalledWith(["delete-logs", "delete-device"]);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 404 and deletes nothing when the device is not owned by the user", async () => {
    prisma.device.findFirst.mockResolvedValue(null);
    const res = makeRes();

    await deleteDevice({ user: { id: "u" }, params: { id: "dev-1" } }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
