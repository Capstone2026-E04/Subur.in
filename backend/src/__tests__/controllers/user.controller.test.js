"use strict";

jest.mock("../../database/connections/prisma_client", () => ({
  user: { findUnique: jest.fn(), delete: jest.fn() },
  device: { findMany: jest.fn() },
  rawSensorLog: { deleteMany: jest.fn() },
  $transaction: jest.fn(),
}));

jest.mock("../../telegram/telegram_api.service", () => ({}));

const prisma = require("../../database/connections/prisma_client");
const { deleteAccount } = require("../../controllers/user.controller");

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("deleteAccount", () => {
  it("deletes sensor logs of all the user's devices and the user in one transaction", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u" });
    prisma.device.findMany.mockResolvedValue([{ id: "a" }, { id: "b" }]);
    prisma.rawSensorLog.deleteMany.mockReturnValue("delete-logs");
    prisma.user.delete.mockReturnValue("delete-user");
    prisma.$transaction.mockResolvedValue([]);
    const res = makeRes();

    await deleteAccount({ user: { id: "u" } }, res, jest.fn());

    expect(prisma.rawSensorLog.deleteMany).toHaveBeenCalledWith({
      where: { deviceId: { in: ["a", "b"] } },
    });
    expect(prisma.$transaction).toHaveBeenCalledWith([
      "delete-logs",
      "delete-user",
    ]);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
