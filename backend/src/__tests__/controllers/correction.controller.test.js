"use strict";

jest.mock("../../database/connections/prisma_client", () => ({
  device: { findFirst: jest.fn() },
  correctionLog: { create: jest.fn(), findMany: jest.fn() },
}));

const prisma = require("../../database/connections/prisma_client");
const {
  createCorrection,
  getCorrections,
} = require("../../controllers/correction.controller");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const req = (body = {}) => ({
  user: { id: "u1" },
  params: { id: "d1" },
  body,
});
const valid = {
  type: "LIME",
  method: "INCORPORATION",
  doseGram: 2.86,
  phBefore: 5.4,
};

describe("correction.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.device.findFirst.mockResolvedValue({ id: "d1" });
    prisma.correctionLog.create.mockResolvedValue({ id: "c1" });
  });

  it("stores a valid correction for an owned device", async () => {
    const res = mockRes();
    await createCorrection(req(valid), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(201);
    expect(prisma.correctionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ deviceId: "d1", type: "LIME" }),
    });
  });

  it.each([
    [{ ...valid, type: "WATER" }],
    [{ ...valid, method: "SPRAY" }],
    [{ ...valid, doseGram: 0 }],
    [{ ...valid, phBefore: 15 }],
    [{ ...valid, appliedAt: "2999-01-01" }],
  ])("rejects invalid body %#", async (body) => {
    const res = mockRes();
    await createCorrection(req(body), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.correctionLog.create).not.toHaveBeenCalled();
  });

  it("returns 404 when the device is not owned by the user", async () => {
    prisma.device.findFirst.mockResolvedValue(null);
    const res = mockRes();
    await createCorrection(req(valid), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);

    const res2 = mockRes();
    await getCorrections(req(), res2, jest.fn());
    expect(res2.status).toHaveBeenCalledWith(404);
  });
});
