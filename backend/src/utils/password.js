const crypto = require("crypto");
const { promisify } = require("util");

const scrypt = promisify(crypto.scrypt);

const SALT_BYTES = 16;
const KEY_BYTES = 64;
const HASH_VERSION = "scrypt1";

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

function validatePassword(password) {
  if (typeof password !== "string") {
    return "Password wajib diisi.";
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password minimal ${MIN_PASSWORD_LENGTH} karakter.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password maksimal ${MAX_PASSWORD_LENGTH} karakter.`;
  }
  return null;
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_BYTES);
  const derived = await scrypt(password, salt, KEY_BYTES);
  return [HASH_VERSION, salt.toString("hex"), derived.toString("hex")].join(
    "$",
  );
}

async function verifyPassword(password, storedHash) {
  const [version, saltHex, hashHex] = String(storedHash).split("$");
  if (version !== HASH_VERSION || !saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  const derived = await scrypt(
    password,
    Buffer.from(saltHex, "hex"),
    expected.length,
  );
  return crypto.timingSafeEqual(derived, expected);
}

module.exports = {
  validatePassword,
  hashPassword,
  verifyPassword,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
};
