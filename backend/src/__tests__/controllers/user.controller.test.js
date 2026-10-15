"use strict";

jest.mock("../../database/connections/prisma_client", () => ({
  user: { findUnique: jest.fn(), delete: jest.fn(), updateMany: jest.fn() },
  device: { findMany: jest.fn() },
  rawSensorLog: { deleteMany: jest.fn() },
  $transaction: jest.fn(),
}));

jest.mock("../../telegram/telegram_api.service", () => ({}));

const prisma = require("../../database/connections/prisma_client");
const {
  deleteAccount,
  getProfile,
  createPassword,
} = require("../../controllers/user.controller");

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

describe("getProfile", () => {
  it("menandai hasPassword tanpa membocorkan hash", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "u",
      name: "Budi",
      telegramChatId: null,
      passwordHash: "scrypt1$aa$bb",
    });
    const res = makeRes();

    await getProfile({ user: { id: "u" } }, res, jest.fn());

    const { user } = res.json.mock.calls[0][0].data;
    expect(user.hasPassword).toBe(true);
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("hasPassword false untuk akun Google tanpa password", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "u",
      telegramChatId: null,
      passwordHash: null,
    });
    const res = makeRes();

    await getProfile({ user: { id: "u" } }, res, jest.fn());

    expect(res.json.mock.calls[0][0].data.user.hasPassword).toBe(false);
  });
});

describe("createPassword", () => {
  beforeEach(() => jest.clearAllMocks());

  it("menyimpan hash hanya jika user belum punya password", async () => {
    prisma.user.updateMany.mockResolvedValue({ count: 1 });
    const res = makeRes();

    await createPassword(
      {
        user: { id: "u" },
        body: { password: "rahasia123", confirmPassword: "rahasia123" },
      },
      res,
      jest.fn(),
    );

    const call = prisma.user.updateMany.mock.calls[0][0];
    expect(call.where).toEqual({ id: "u", passwordHash: null });
    expect(call.data.passwordHash).toMatch(/^scrypt1\$/);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("menolak konfirmasi yang tidak cocok", async () => {
    const res = makeRes();

    await createPassword(
      {
        user: { id: "u" },
        body: { password: "rahasia123", confirmPassword: "rahasia124" },
      },
      res,
      jest.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it("menolak password yang terlalu pendek", async () => {
    const res = makeRes();

    await createPassword(
      { user: { id: "u" }, body: { password: "123", confirmPassword: "123" } },
      res,
      jest.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("menolak dengan 409 jika password sudah ada", async () => {
    prisma.user.updateMany.mockResolvedValue({ count: 0 });
    prisma.user.findUnique.mockResolvedValue({ id: "u" });
    const res = makeRes();

    await createPassword(
      {
        user: { id: "u" },
        body: { password: "rahasia123", confirmPassword: "rahasia123" },
      },
      res,
      jest.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(409);
  });
});
