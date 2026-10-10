"use strict";

jest.mock("../../database/connections/prisma_client", () => ({
  plant: { findMany: jest.fn() },
}));

const prisma = require("../../database/connections/prisma_client");
const { getAllPlants } = require("../../controllers/plant.controller");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const plantRow = (name) => ({
  id: name,
  name,
  minPh: 6,
  maxPh: 7,
  phTarget: 6.5,
});

describe("getAllPlants", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("adds the NMI trigger and target of a supported plant", async () => {
    prisma.plant.findMany.mockResolvedValue([plantRow("Selada")]);
    const res = mockRes();

    await getAllPlants({}, res, jest.fn());

    const { data } = res.json.mock.calls[0][0];
    expect(data[0]).toMatchObject({ nmiTrigger: 65, nmiTarget: 90 });
  });

  it("matches the plant name without case or surrounding spaces", async () => {
    prisma.plant.findMany.mockResolvedValue([plantRow(" pakcoy ")]);
    const res = mockRes();

    await getAllPlants({}, res, jest.fn());

    const { data } = res.json.mock.calls[0][0];
    expect(data[0]).toMatchObject({ nmiTrigger: 60, nmiTarget: 80 });
  });

  it("returns null NMI values for a plant without parameters", async () => {
    prisma.plant.findMany.mockResolvedValue([plantRow("Kangkung")]);
    const res = mockRes();

    await getAllPlants({}, res, jest.fn());

    const { data } = res.json.mock.calls[0][0];
    expect(data[0]).toMatchObject({ nmiTrigger: null, nmiTarget: null });
  });

  it("forwards a database failure to the error handler", async () => {
    const failure = new Error("db down");
    prisma.plant.findMany.mockRejectedValue(failure);
    const next = jest.fn();

    await getAllPlants({}, mockRes(), next);

    expect(next).toHaveBeenCalledWith(failure);
  });
});
