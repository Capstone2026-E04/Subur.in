"use strict";

const { adcToVwc } = require("../../../ai/core/vwc_calibration");
const { evaluatePhMonitor } = require("../../../ai/core/ph_monitor");
const { median } = require("../../../ai/core/water_schedule");
const { PLANTS } = require("./fixtures");

const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date("2026-10-20T00:00:00Z");
const plant = PLANTS.bayam;
const dose = (type, phBefore, daysAgo) => ({
  type,
  phBefore,
  appliedAt: new Date(now - daysAgo * DAY_MS),
});
const monitor = (input) => evaluatePhMonitor({ plant, now, ...input });

describe("adcToVwc (Bagian 4.3)", () => {
  it.each([
    [950, 29.6],
    [1373, 21.0],
    [2000, 18.1],
  ])("ADC %s -> %s%% VWC", (adc, pct) => {
    const r = adcToVwc(adc);

    expect(r.vwcPercent).toBeCloseTo(pct, 0);
    expect(r.safetyOverride).toBeNull();
  });

  it.each([3000, 2577, 625])("ADC %s is out of range", (adc) => {
    expect(adcToVwc(adc).safetyOverride).toBe("sensor_out_of_range");
  });

  it("clamps an extrapolated negative VWC to 0", () => {
    expect(adcToVwc(3000).vwcPercent).toBe(0);
  });
});

describe("median", () => {
  it("handles odd, even and empty input", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe("evaluatePhMonitor (Bagian 4.9 alur lima status)", () => {
  it("monitors while the median pH stays in the band", () => {
    expect(monitor({ current: 6.5, previous: 6.5 }).status).toBe("PANTAU");
  });

  it("does not recommend on a single out-of-band day", () => {
    expect(monitor({ current: 5.5, previous: 6.5 }).status).toBe("PANTAU");
  });

  it("recommends after two consecutive daily medians with the same action", () => {
    const r = monitor({ current: 5.5, previous: 5.6 });

    expect(r).toMatchObject({
      status: "REKOMENDASI",
      phAction: "LIME",
      allowDose: true,
    });
  });

  it("waits for data when a window has no median", () => {
    expect(monitor({ current: 5.5, previous: null }).status).toBe("PANTAU");
  });

  it("holds new recommendations during the 7-day reaction period", () => {
    const r = monitor({
      current: 5.5,
      previous: 5.5,
      correction: dose("LIME", 5.5, 2),
    });

    expect(r).toMatchObject({
      status: "MASA_REAKSI",
      day: 3,
      totalDays: 7,
      allowDose: false,
    });
  });

  it("returns to monitoring once the pH is back in the band", () => {
    const r = monitor({
      current: 6.4,
      previous: 6.2,
      correction: dose("LIME", 5.5, 8),
    });

    expect(r.status).toBe("PANTAU");
  });

  it("continues monitoring when the pH moved at least 0.2 toward the target", () => {
    const r = monitor({
      current: 5.7,
      previous: 5.7,
      correction: dose("LIME", 5.4, 8),
    });

    expect(r).toMatchObject({
      status: "EVALUASI",
      outcome: "LANJUT_PANTAU",
      allowDose: false,
    });
  });

  it("recommends a repeat dose when the pH barely moved", () => {
    const r = monitor({
      current: 5.45,
      previous: 5.4,
      correction: dose("LIME", 5.4, 8),
    });

    expect(r).toMatchObject({
      status: "EVALUASI",
      outcome: "REKOMENDASI_ULANG",
      allowDose: true,
    });
  });

  it("escalates at the third evaluation without progress", () => {
    const r = monitor({
      current: 5.45,
      previous: 5.4,
      correction: dose("LIME", 5.4, 21),
    });

    expect(r).toMatchObject({
      status: "ESKALASI",
      reason: "NO_PROGRESS",
      allowDose: false,
    });
  });

  it("escalates when the pH overshoots to the opposite side", () => {
    const r = monitor({
      current: 7.6,
      previous: 7.5,
      correction: dose("LIME", 5.4, 8),
    });

    expect(r).toMatchObject({ status: "ESKALASI", reason: "OVERSHOOT" });
  });

  it("measures sulfur progress downward", () => {
    const r = monitor({
      current: 7.5,
      previous: 7.6,
      correction: dose("SULFUR", 7.9, 10),
    });

    expect(r.outcome).toBe("LANJUT_PANTAU");
  });
});
