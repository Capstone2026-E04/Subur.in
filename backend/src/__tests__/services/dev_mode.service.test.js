jest.mock("../../database/connections/prisma_client", () => ({}));
jest.mock("../../mqtt/subscribers/sensor_subscriber", () => ({
  handleSensorMessage: jest.fn(),
}));

const { pickReadings } = require("../../services/dev_mode.service");

describe("dev_mode pickReadings", () => {
  afterEach(() => jest.restoreAllMocks());

  it("selalu menghasilkan nilai dalam rentang valid", () => {
    for (let i = 0; i < 500; i++) {
      for (const { ph, moisture } of pickReadings()) {
        expect(ph).toBeGreaterThanOrEqual(0);
        expect(ph).toBeLessThanOrEqual(14);
        expect(moisture).toBeGreaterThanOrEqual(0);
        expect(moisture).toBeLessThanOrEqual(100);
      }
    }
  });

  it("skenario kering mengirim 2 pembacaan kritis berturut-turut", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const readings = pickReadings();
    expect(readings).toHaveLength(2);
    expect(readings.every((r) => r.moisture < 25)).toBe(true);
  });

  it("tanpa skenario kritis mengirim 1 pembacaan", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.99);
    expect(pickReadings()).toHaveLength(1);
  });
});
