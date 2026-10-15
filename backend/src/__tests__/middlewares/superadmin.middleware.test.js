"use strict";

jest.mock("../../database/connections/prisma_client", () => ({
  user: { findUnique: jest.fn() },
}));

const prisma = require("../../database/connections/prisma_client");
const superadminMiddleware = require("../../middlewares/superadmin.middleware");

function run(req) {
  const next = jest.fn();
  return superadminMiddleware(req, {}, next).then(() => next);
}

describe("superadmin.middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it("meneruskan request untuk SUPERADMIN", async () => {
    prisma.user.findUnique.mockResolvedValue({ role: "SUPERADMIN" });

    const next = await run({ user: { id: "u1" } });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "u1" },
      select: { role: true },
    });
    expect(next).toHaveBeenCalledWith();
  });

  it("menolak USER dengan 403", async () => {
    prisma.user.findUnique.mockResolvedValue({ role: "USER" });

    const next = await run({ user: { id: "u1" } });

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 }),
    );
  });

  it("menolak user yang sudah tidak ada", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const next = await run({ user: { id: "u1" } });

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 }),
    );
  });

  it("mengabaikan klaim role dari token dan memeriksa database", async () => {
    prisma.user.findUnique.mockResolvedValue({ role: "USER" });

    const next = await run({ user: { id: "u1", role: "SUPERADMIN" } });

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 }),
    );
  });

  it("menolak request tanpa identitas user dengan 401", async () => {
    const next = await run({});

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 }),
    );
  });

  it("gagal tertutup saat database error", async () => {
    const dbError = new Error("db down");
    prisma.user.findUnique.mockRejectedValue(dbError);

    const next = await run({ user: { id: "u1" } });

    expect(next).toHaveBeenCalledWith(dbError);
  });
});
