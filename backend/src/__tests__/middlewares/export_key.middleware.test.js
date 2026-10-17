"use strict";

const {
  hasValidExportKey,
} = require("../../middlewares/export_key.middleware");

const req = ({ header, query = {} } = {}) => ({
  get: (name) => (name === "X-API-Key" ? header : undefined),
  query,
});

describe("hasValidExportKey", () => {
  const original = process.env.EXPORT_API_KEY;
  afterEach(() => {
    process.env.EXPORT_API_KEY = original;
  });

  it("accepts the key from the header or the api_key query", () => {
    process.env.EXPORT_API_KEY = "secret-key";

    expect(hasValidExportKey(req({ header: "secret-key" }))).toBe(true);
    expect(hasValidExportKey(req({ query: { api_key: "secret-key" } }))).toBe(
      true,
    );
  });

  it("rejects a wrong or missing key", () => {
    process.env.EXPORT_API_KEY = "secret-key";

    expect(hasValidExportKey(req({ header: "other" }))).toBe(false);
    expect(hasValidExportKey(req())).toBe(false);
  });

  it("is disabled when EXPORT_API_KEY is empty", () => {
    process.env.EXPORT_API_KEY = "";

    expect(hasValidExportKey(req({ header: "" }))).toBe(false);
    expect(hasValidExportKey(req({ header: "anything" }))).toBe(false);
  });
});
