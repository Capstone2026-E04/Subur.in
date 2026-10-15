"use strict";

jest.mock("../../database/connections/prisma_client", () => {
  const model = () => ({ findMany: jest.fn(), count: jest.fn() });
  return {
    user: model(),
    device: model(),
    plant: model(),
    recommendationLog: model(),
    correctionLog: model(),
    rawSensorLog: model(),
    notification: model(),
  };
});

const prisma = require("../../database/connections/prisma_client");
const {
  getOverview,
  listResource,
  getDeviceOptions,
  getSensorHistory,
} = require("../../controllers/superadmin.controller");

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("superadmin.controller", () => {
  beforeEach(() => jest.clearAllMocks());

  it("getOverview menghitung semua tabel", async () => {
    Object.values(prisma).forEach((m) => m.count.mockResolvedValue(3));
    const res = makeRes();

    await getOverview({ user: { id: "u1" } }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].data.overview).toEqual({
      users: 3,
      devices: 3,
      plants: 3,
      recommendations: 3,
      corrections: 3,
      "sensor-logs": 3,
      notifications: 3,
    });
  });

  it("listResource memakai paginasi dan membatasi limit", async () => {
    prisma.rawSensorLog.findMany.mockResolvedValue([{ id: 1 }]);
    prisma.rawSensorLog.count.mockResolvedValue(250);
    const res = makeRes();

    await listResource(
      {
        params: { resource: "sensor-logs" },
        query: { page: "2", limit: "9999" },
      },
      res,
      jest.fn(),
    );

    expect(prisma.rawSensorLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 100, take: 100 }),
    );
    expect(res.json.mock.calls[0][0].meta).toEqual({
      page: 2,
      limit: 100,
      total: 250,
      totalPages: 3,
    });
  });

  it("listResource tidak mengirim kode tautan telegram", async () => {
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.count.mockResolvedValue(0);

    await listResource(
      { params: { resource: "users" }, query: {} },
      makeRes(),
      jest.fn(),
    );

    const { select } = prisma.user.findMany.mock.calls[0][0];
    expect(select.telegramLinkCode).toBeUndefined();
    expect(select.telegramLinkCodeExpiresAt).toBeUndefined();
    expect(select.role).toBe(true);
  });

  it.each(["constructor", "__proto__", "toString", "unknown"])(
    "listResource menolak resource tidak dikenal: %s",
    async (resource) => {
      const res = makeRes();

      await listResource({ params: { resource }, query: {} }, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(404);
    },
  );

  describe("sort, filter, dan pencarian", () => {
    const UUID = "7011204b-e88e-4504-8b67-c9e2f86ff986";

    async function list(resource, query) {
      const res = makeRes();
      await listResource({ params: { resource }, query }, res, jest.fn());
      return res;
    }

    beforeEach(() => {
      Object.values(prisma).forEach((m) => {
        m.findMany.mockResolvedValue([]);
        m.count.mockResolvedValue(0);
      });
    });

    it("mengurutkan berdasarkan kolom relasi dengan tie-breaker id", async () => {
      await list("sensor-logs", { sortBy: "device.label", order: "desc" });

      expect(prisma.rawSensorLog.findMany.mock.calls[0][0].orderBy).toEqual([
        { device: { label: "desc" } },
        { id: "desc" },
      ]);
    });

    it("memakai urutan bawaan jika sortBy tidak dikirim", async () => {
      await list("users", {});

      expect(prisma.user.findMany.mock.calls[0][0].orderBy).toEqual([
        { createdAt: "desc" },
        { id: "desc" },
      ]);
    });

    it.each([
      ["sortBy di luar daftar putih", { sortBy: "googleId" }],
      ["sortBy bertipe array", { sortBy: ["name", "email"] }],
      ["order tidak valid", { sortBy: "name", order: "sideways" }],
    ])("menolak %s dengan 400", async (_label, query) => {
      const res = await list("users", query);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });

    it("membangun pencarian tidak sensitif huruf pada kolom yang diizinkan", async () => {
      await list("devices", { search: " bayam " });

      const { where } = prisma.device.findMany.mock.calls[0][0];
      expect(where.AND[0].OR).toContainEqual({
        user: { email: { contains: "bayam", mode: "insensitive" } },
      });
      expect(where.AND[0].OR).toContainEqual({
        label: { contains: "bayam", mode: "insensitive" },
      });
    });

    it("menerapkan filter enum, boolean, uuid, dan rentang tanggal", async () => {
      await list("notifications", {
        type: "warning",
        isRead: "false",
        deviceId: UUID,
        from: "2026-10-01T00:00:00+07:00",
      });

      const { where } = prisma.notification.findMany.mock.calls[0][0];
      expect(where.AND).toEqual(
        expect.arrayContaining([
          { type: "warning" },
          { isRead: false },
          { deviceId: UUID },
          { createdAt: { gte: new Date("2026-10-01T00:00:00+07:00") } },
        ]),
      );
      expect(prisma.notification.count).toHaveBeenCalledWith({ where });
    });

    it.each([
      ["enum di luar nilai", "users", { role: "ADMIN" }],
      ["boolean tidak valid", "users", { telegramNotifyEnabled: "yes" }],
      ["uuid tidak valid", "sensor-logs", { deviceId: "bukan-uuid" }],
      ["tanggal tidak valid", "users", { from: "kemarin" }],
      ["filter bertipe array", "users", { role: ["USER", "SUPERADMIN"] }],
      ["pencarian terlalu panjang", "users", { search: "a".repeat(101) }],
    ])("menolak %s dengan 400", async (_label, resource, query) => {
      const res = await list(resource, query);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("mengabaikan filter yang tidak terdaftar untuk resource tersebut", async () => {
      await list("plants", { role: "SUPERADMIN" });

      expect(prisma.plant.findMany.mock.calls[0][0].where).toEqual({});
    });
  });

  describe("data grafik", () => {
    it("getDeviceOptions mengembalikan semua perangkat", async () => {
      prisma.device.findMany.mockResolvedValue([{ id: "d1" }]);
      const res = makeRes();

      await getDeviceOptions({ user: { id: "u1" } }, res, jest.fn());

      expect(res.json.mock.calls[0][0].data.devices).toEqual([{ id: "d1" }]);
    });

    it("getSensorHistory menolak deviceId yang bukan uuid", async () => {
      const res = makeRes();

      await getSensorHistory({ query: { deviceId: "x" } }, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(prisma.rawSensorLog.findMany).not.toHaveBeenCalled();
    });

    it("getSensorHistory mengurutkan menaik dan membatasi limit", async () => {
      prisma.rawSensorLog.findMany.mockResolvedValue([{ id: 2 }, { id: 1 }]);
      const res = makeRes();

      await getSensorHistory(
        {
          query: {
            deviceId: "7011204b-e88e-4504-8b67-c9e2f86ff986",
            limit: "99999",
          },
        },
        res,
        jest.fn(),
      );

      expect(prisma.rawSensorLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 500 }),
      );
      expect(res.json.mock.calls[0][0].data.items).toEqual([
        { id: 1 },
        { id: 2 },
      ]);
    });
  });
});
