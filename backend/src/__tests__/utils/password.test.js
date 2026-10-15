"use strict";

const {
  validatePassword,
  hashPassword,
  verifyPassword,
} = require("../../utils/password");

describe("password util", () => {
  it("hash tidak menyimpan password asli dan berbeda tiap pemanggilan", async () => {
    const first = await hashPassword("rahasia123");
    const second = await hashPassword("rahasia123");

    expect(first).not.toContain("rahasia123");
    expect(first).not.toEqual(second);
  });

  it("verifyPassword menerima password benar dan menolak yang salah", async () => {
    const hash = await hashPassword("rahasia123");

    await expect(verifyPassword("rahasia123", hash)).resolves.toBe(true);
    await expect(verifyPassword("rahasia124", hash)).resolves.toBe(false);
  });

  it.each([null, undefined, "", "bukan-hash", "scrypt1$zz", "x$aa$bb"])(
    "verifyPassword menolak hash rusak: %s",
    async (stored) => {
      await expect(verifyPassword("rahasia123", stored)).resolves.toBe(false);
    },
  );

  it.each([
    [undefined, "Password wajib diisi."],
    [12345678, "Password wajib diisi."],
    ["pendek", "Password minimal 8 karakter."],
    ["a".repeat(129), "Password maksimal 128 karakter."],
  ])("validatePassword menolak %s", (input, message) => {
    expect(validatePassword(input)).toBe(message);
  });

  it("validatePassword menerima password yang sesuai batas", () => {
    expect(validatePassword("12345678")).toBeNull();
    expect(validatePassword("a".repeat(128))).toBeNull();
  });
});
