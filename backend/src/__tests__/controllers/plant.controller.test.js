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

  it("adds the shared VWC trigger (66.9% CC) and refill target (78% CC)", async () => {
    prisma.plant.findMany.mockResolvedValue([plantRow("Selada")]);
    const res = mockRes();

    await getAllPlants({}, res, jest.fn());

    const { data } = res.json.mock.calls[0][0];
    expect(data[0]).toMatchObject({ vwcTrigger: 22.07, vwcTarget: 25.72 });
  });

  it("forwards a database failure to the error handler", async () => {
    const failure = new Error("db down");
    prisma.plant.findMany.mockRejectedValue(failure);
    const next = jest.fn();

    await getAllPlants({}, mockRes(), next);

    expect(next).toHaveBeenCalledWith(failure);
  });
});
