"use strict";

const mockRedisClient = { get: jest.fn(), set: jest.fn(), del: jest.fn() };

jest.mock("../../../database/connections/redis", () => ({
  getRedisClient: () => mockRedisClient,
}));

const {
  getSession,
  setSession,
  updateSession,
  clearSession,
  getWizard,
  setWizard,
  clearWizard,
  getActiveDeviceId,
  setActiveDeviceId,
  resolveActiveDevice,
} = require("../../../telegram/session/session.service");

const TELEGRAM_USER_ID = "111222333";

describe("getSession", () => {
  it("returns null when no session is stored", async () => {
    mockRedisClient.get.mockResolvedValue(null);

    const result = await getSession(TELEGRAM_USER_ID);

    expect(result).toBeNull();
  });

  it("returns the parsed session data when one is stored", async () => {
    mockRedisClient.get.mockResolvedValue(JSON.stringify({ activeDeviceId: "device-1" }));

    const result = await getSession(TELEGRAM_USER_ID);

    expect(result).toEqual({ activeDeviceId: "device-1" });
  });

  it("returns null when Redis fails, without throwing", async () => {
    mockRedisClient.get.mockRejectedValue(new Error("connection refused"));

    const result = await getSession(TELEGRAM_USER_ID);

    expect(result).toBeNull();
  });
});

describe("setSession", () => {
  it("writes the session as JSON with a 300 second TTL", async () => {
    mockRedisClient.set.mockResolvedValue("OK");

    await setSession(TELEGRAM_USER_ID, { activeDeviceId: "device-1" });

    expect(mockRedisClient.set).toHaveBeenCalledWith(
      `bot_session:${TELEGRAM_USER_ID}`,
      JSON.stringify({ activeDeviceId: "device-1" }),
      "EX",
      300,
    );
  });
});

describe("updateSession", () => {
  it("merges the patch onto the existing session instead of overwriting it", async () => {
    mockRedisClient.get.mockResolvedValue(JSON.stringify({ activeDeviceId: "device-1" }));
    mockRedisClient.set.mockResolvedValue("OK");

    await updateSession(TELEGRAM_USER_ID, { wizard: { type: "threshold" } });

    expect(mockRedisClient.set).toHaveBeenCalledWith(
      `bot_session:${TELEGRAM_USER_ID}`,
      JSON.stringify({ activeDeviceId: "device-1", wizard: { type: "threshold" } }),
      "EX",
      300,
    );
  });
});

describe("clearSession", () => {
  it("deletes the session key", async () => {
    mockRedisClient.del.mockResolvedValue(1);

    await clearSession(TELEGRAM_USER_ID);

    expect(mockRedisClient.del).toHaveBeenCalledWith(`bot_session:${TELEGRAM_USER_ID}`);
  });
});

describe("wizard state", () => {
  it("getWizard returns null when no wizard field is stored", async () => {
    mockRedisClient.get.mockResolvedValue(JSON.stringify({ activeDeviceId: "device-1" }));

    const result = await getWizard(TELEGRAM_USER_ID);

    expect(result).toBeNull();
  });

  it("setWizard stores the wizard state under the wizard field", async () => {
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.set.mockResolvedValue("OK");

    await setWizard(TELEGRAM_USER_ID, { type: "threshold", parameter: "ph", deviceId: "device-1" });

    expect(mockRedisClient.set).toHaveBeenCalledWith(
      `bot_session:${TELEGRAM_USER_ID}`,
      JSON.stringify({ wizard: { type: "threshold", parameter: "ph", deviceId: "device-1" } }),
      "EX",
      300,
    );
  });

  it("clearWizard sets the wizard field to null without touching other fields", async () => {
    mockRedisClient.get.mockResolvedValue(JSON.stringify({ activeDeviceId: "device-1", wizard: { type: "threshold" } }));
    mockRedisClient.set.mockResolvedValue("OK");

    await clearWizard(TELEGRAM_USER_ID);

    expect(mockRedisClient.set).toHaveBeenCalledWith(
      `bot_session:${TELEGRAM_USER_ID}`,
      JSON.stringify({ activeDeviceId: "device-1", wizard: null }),
      "EX",
      300,
    );
  });
});

describe("active device id", () => {
  it("getActiveDeviceId returns null when nothing is stored", async () => {
    mockRedisClient.get.mockResolvedValue(null);

    const result = await getActiveDeviceId(TELEGRAM_USER_ID);

    expect(result).toBeNull();
  });

  it("setActiveDeviceId persists the device id under activeDeviceId", async () => {
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.set.mockResolvedValue("OK");

    await setActiveDeviceId(TELEGRAM_USER_ID, "device-123");

    expect(mockRedisClient.set).toHaveBeenCalledWith(
      `bot_session:${TELEGRAM_USER_ID}`,
      JSON.stringify({ activeDeviceId: "device-123" }),
      "EX",
      300,
    );
  });
});

describe("resolveActiveDevice", () => {
  it("returns null when the device list is empty, without touching Redis", async () => {
    const result = await resolveActiveDevice(TELEGRAM_USER_ID, []);

    expect(result).toBeNull();
    expect(mockRedisClient.get).not.toHaveBeenCalled();
  });

  it("auto-resolves a single device without touching Redis", async () => {
    const result = await resolveActiveDevice(TELEGRAM_USER_ID, [{ id: "only-device" }]);

    expect(result).toEqual({ id: "only-device" });
    expect(mockRedisClient.get).not.toHaveBeenCalled();
  });

  it("picks the active device from the session when there is more than one device", async () => {
    mockRedisClient.get.mockResolvedValue(JSON.stringify({ activeDeviceId: "device-2" }));
    const devices = [{ id: "device-1" }, { id: "device-2" }];

    const result = await resolveActiveDevice(TELEGRAM_USER_ID, devices);

    expect(result).toEqual({ id: "device-2" });
  });

  it("returns null when the active device id is not among the current devices", async () => {
    mockRedisClient.get.mockResolvedValue(JSON.stringify({ activeDeviceId: "device-stale" }));
    const devices = [{ id: "device-1" }, { id: "device-2" }];

    const result = await resolveActiveDevice(TELEGRAM_USER_ID, devices);

    expect(result).toBeNull();
  });
});
