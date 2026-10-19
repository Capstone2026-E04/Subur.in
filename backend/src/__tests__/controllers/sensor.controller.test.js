"use strict";

jest.mock("../../database/connections/prisma_client", () => ({
  device: { findUnique: jest.fn() },
}));
jest.mock("../../sse/sse_manager", () => ({}));
jest.mock("../../repositories/sensor_redis_repository", () => ({
  getSensorExport: jest.fn(),
}));
jest.mock("../../repositories/sensor_repository", () => ({}));

const prisma = require("../../database/connections/prisma_client");
const {
  getSensorExport,
} = require("../../repositories/sensor_redis_repository");
const { exportSensorCsv } = require("../../controllers/sensor.controller");

const makeRes = () => {
  const res = {};
  res.setHeader = jest.fn();
  res.send = jest.fn();
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const ID = "3c1b6a52-9d3e-4f0a-8a47-2b5d7e9f1a10";
const req = (query = {}) => ({ params: { deviceId: ID }, query });
const entry = (t, ph = 6.4) => ({ t, ph, moisture: 71.2, synced: true });

describe("exportSensorCsv", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    prisma.device.findUnique.mockResolvedValue({ deviceCode: "ESP32-A" });
  });
  afterEach(() => jest.restoreAllMocks());

  it("reads the MQTT buffer by device code and returns CSV with a WIB column", async () => {
    getSensorExport.mockResolvedValue([entry("2026-10-17T07:03:22.000Z")]);
    const res = makeRes();

    await exportSensorCsv(req(), res);

    expect(getSensorExport).toHaveBeenCalledWith("ESP32-A");
    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "text/csv; charset=utf-8",
    );
    expect(res.send).toHaveBeenCalledWith(
      "device_code,timestamp_utc,timestamp_wib,ph,moisture,moisture_type,time_synced\r\n" +
        "ESP32-A,2026-10-17T07:03:22.000Z,2026-10-17 14:03:22,6.4,71.2,legacy_index,true\r\n",
    );
  });

  it("sorts by time, filters by range, and keeps the newest rows within the limit", async () => {
    getSensorExport.mockResolvedValue([
      entry("2026-10-03T00:00:00.000Z", 3),
      entry("2026-10-01T00:00:00.000Z", 1),
      entry("2026-10-02T00:00:00.000Z", 2),
      entry("2026-09-01T00:00:00.000Z", 9),
    ]);
    const res = makeRes();

    await exportSensorCsv(req({ from: "2026-10-01", limit: "2" }), res);

    const lines = res.send.mock.calls[0][0].trim().split("\r\n").slice(1);
    expect(lines.map((l) => l.split(",").at(-4))).toEqual(["2", "3"]);
  });

  it("returns 404 for a malformed id or an unknown device", async () => {
    const bad = makeRes();
    await exportSensorCsv({ params: { deviceId: "d1" }, query: {} }, bad);
    prisma.device.findUnique.mockResolvedValue(null);
    const unknown = makeRes();
    await exportSensorCsv(req(), unknown);

    expect(bad.status).toHaveBeenCalledWith(404);
    expect(unknown.status).toHaveBeenCalledWith(404);
    expect(getSensorExport).not.toHaveBeenCalled();
  });

  it("rejects an invalid date with 400", async () => {
    const res = makeRes();

    await exportSensorCsv(req({ from: "bukan-tanggal" }), res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
