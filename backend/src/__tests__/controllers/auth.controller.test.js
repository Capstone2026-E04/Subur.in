"use strict";

process.env.JWT_SECRET = "test-secret-untuk-jest";
process.env.GOOGLE_CLIENT_ID = "test-client-id";

const mockVerifyIdToken = jest.fn();

jest.mock("google-auth-library", () => ({
  OAuth2Client: jest.fn(() => ({
    verifyIdToken: (...args) => mockVerifyIdToken(...args),
  })),
}));

jest.mock("../../database/connections/prisma_client", () => ({
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

const jwt = require("jsonwebtoken");
const prisma = require("../../database/connections/prisma_client");
const { hashPassword } = require("../../utils/password");
const {
  register,
  login,
  googleSignIn,
} = require("../../controllers/auth.controller");

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const body = (res) => res.json.mock.calls[0][0];

describe("auth.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  describe("register", () => {
    const valid = {
      name: "  Budi  ",
      email: "  Budi@Example.COM ",
      password: "rahasia123",
    };

    it("membuat akun tanpa avatar dan tanpa googleId, dengan email ternormalisasi", async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockImplementation(async ({ data }) => ({
        id: "u1",
        avatarUrl: null,
        ...data,
      }));
      const res = makeRes();

      await register({ body: valid }, res, jest.fn());

      const { data } = prisma.user.create.mock.calls[0][0];
      expect(data.name).toBe("Budi");
      expect(data.email).toBe("budi@example.com");
      expect(data.passwordHash).toMatch(/^scrypt1\$/);
      expect(data.passwordHash).not.toContain("rahasia123");
      expect(data.googleId).toBeUndefined();
      expect(data.avatarUrl).toBeUndefined();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(body(res).data.user.avatarUrl).toBeNull();
      expect(body(res).data.user).not.toHaveProperty("passwordHash");
      expect(jwt.verify(body(res).data.token, process.env.JWT_SECRET).id).toBe(
        "u1",
      );
    });

    it.each([
      ["nama kosong", { ...valid, name: "  " }],
      ["email kosong", { ...valid, email: "" }],
      ["password tidak dikirim", { name: "a", email: "a@b.co" }],
    ])("menolak %s dengan 400", async (_label, input) => {
      const res = makeRes();

      await register({ body: input }, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it.each([
      ["format email salah", { ...valid, email: "bukan-email" }],
      ["password terlalu pendek", { ...valid, password: "pendek" }],
      ["nama terlalu panjang", { ...valid, name: "a".repeat(101) }],
    ])("menolak %s", async (_label, input) => {
      prisma.user.findFirst.mockResolvedValue(null);
      const res = makeRes();

      await register({ body: input }, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it("menolak email yang sudah terdaftar dengan 409", async () => {
      prisma.user.findFirst.mockResolvedValue({ id: "u1" });
      const res = makeRes();

      await register({ body: valid }, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(409);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it("menangani balapan email unik (P2002) dengan 409", async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockRejectedValue({ code: "P2002" });
      const res = makeRes();

      await register({ body: valid }, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe("login", () => {
    it("berhasil dengan email dan password yang benar", async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: "u1",
        name: "Budi",
        email: "budi@example.com",
        avatarUrl: null,
        passwordHash: await hashPassword("rahasia123"),
      });
      const res = makeRes();

      await login(
        { body: { email: " BUDI@example.com ", password: "rahasia123" } },
        res,
        jest.fn(),
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(body(res).data.user.email).toBe("budi@example.com");
      expect(body(res).data.user).not.toHaveProperty("passwordHash");
    });

    it.each([
      ["password salah", { id: "u1", passwordHash: "scrypt1$aa$bb" }],
      ["akun hanya Google (tanpa password)", { id: "u1", passwordHash: null }],
      ["email tidak terdaftar", null],
    ])("menolak %s dengan pesan yang sama", async (_label, user) => {
      prisma.user.findFirst.mockResolvedValue(user);
      const res = makeRes();

      await login(
        { body: { email: "budi@example.com", password: "salah-salah" } },
        res,
        jest.fn(),
      );

      expect(res.status).toHaveBeenCalledWith(401);
      expect(body(res).message).toBe("Email atau password salah.");
    });

    it.each([
      [{ email: "a@b.co" }],
      [{ password: "x" }],
      [{ email: "a@b.co", password: ["x"] }],
    ])("menolak input tidak lengkap %j dengan 400", async (input) => {
      const res = makeRes();

      await login({ body: input }, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
    });
  });

  describe("googleSignIn", () => {
    const googlePayload = {
      sub: "g-123",
      name: "Budi Google",
      email: "budi@example.com",
      email_verified: true,
      picture: "https://lh3.googleusercontent.com/avatar.png",
    };

    beforeEach(() => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => googlePayload,
      });
      prisma.user.findUnique.mockResolvedValue(null);
    });

    it("menautkan akun email/password: mengambil avatar Google dan menghapus password lama", async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: "u1",
        name: "Budi",
        email: "budi@example.com",
        googleId: null,
        avatarUrl: null,
        passwordHash: "scrypt1$aa$bb",
      });
      prisma.user.update.mockImplementation(async ({ data }) => ({
        id: "u1",
        email: "budi@example.com",
        ...data,
      }));
      const res = makeRes();

      await googleSignIn({ body: { idToken: "tok" } }, res, jest.fn());

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "u1" },
        data: {
          googleId: "g-123",
          name: "Budi",
          avatarUrl: googlePayload.picture,
          passwordHash: null,
        },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(body(res).data.user.avatarUrl).toBe(googlePayload.picture);
    });

    it("mempertahankan avatar yang sudah diatur user saat menautkan", async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: "u1",
        name: "Budi",
        googleId: null,
        avatarUrl: "https://example.com/custom.png",
        passwordHash: "scrypt1$aa$bb",
      });
      prisma.user.update.mockResolvedValue({ id: "u1" });

      await googleSignIn({ body: { idToken: "tok" } }, makeRes(), jest.fn());

      expect(prisma.user.update.mock.calls[0][0].data.avatarUrl).toBe(
        "https://example.com/custom.png",
      );
    });

    it("tidak menyentuh password pada akun yang sudah tertaut Google", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "u1",
        googleId: "g-123",
        passwordHash: "scrypt1$aa$bb",
      });
      const res = makeRes();

      await googleSignIn({ body: { idToken: "tok" } }, res, jest.fn());

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("membuat akun baru tanpa password untuk email yang belum ada", async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockImplementation(async ({ data }) => ({
        id: "u2",
        ...data,
      }));

      await googleSignIn({ body: { idToken: "tok" } }, makeRes(), jest.fn());

      const { data } = prisma.user.create.mock.calls[0][0];
      expect(data.googleId).toBe("g-123");
      expect(data.passwordHash).toBeUndefined();
    });

    it("menolak email Google yang belum terverifikasi", async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({ ...googlePayload, email_verified: false }),
      });
      const res = makeRes();

      await googleSignIn({ body: { idToken: "tok" } }, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
