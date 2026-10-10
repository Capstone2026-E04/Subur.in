"use strict";

const { checkPhCorrection } = require("../../../ai/core/safety_gate");

const DAY_MS = 24 * 60 * 60 * 1000;

const limeInput = {
  phAction: "LIME",
  waterAction: "IRRIGATE",
  ph: 5.4,
  minPh: 6.0,
  maxPh: 7.0,
  consistentReadings: 2,
  lastCorrectionAt: null,
};

const sulfurInput = { ...limeInput, phAction: "SULFUR", ph: 7.6 };

describe("checkPhCorrection (C501 Step 11 section 4)", () => {
  it("is ready for lime at pH 5.5, which equals the minimum pH minus 0.5", () => {
    const result = checkPhCorrection({ ...limeInput, ph: 5.5 });

    expect(result.status).toBe("READY");
  });

  it("defers lime at pH 5.6, which is above the minimum pH minus 0.5", () => {
    const result = checkPhCorrection({ ...limeInput, ph: 5.6 });

    expect(result.status).toBe("DEFERRED");
  });

  it("is ready for sulfur at pH 7.5, which equals the maximum pH plus 0.5", () => {
    const result = checkPhCorrection({ ...sulfurInput, ph: 7.5 });

    expect(result.status).toBe("READY");
  });

  it("defers sulfur at pH 7.4, which is below the maximum pH plus 0.5", () => {
    const result = checkPhCorrection({ ...sulfurInput, ph: 7.4 });

    expect(result.status).toBe("DEFERRED");
  });

  it("defers the correction while the media is wet", () => {
    const result = checkPhCorrection({ ...limeInput, waterAction: "STOP" });

    expect(result.status).toBe("DEFERRED");
  });

  it("defers the correction with fewer than two consistent readings", () => {
    const result = checkPhCorrection({ ...limeInput, consistentReadings: 1 });

    expect(result.status).toBe("DEFERRED");
  });

  it("defers the correction 13 days after the previous one", () => {
    const now = new Date("2026-10-20T00:00:00Z");

    const result = checkPhCorrection({
      ...limeInput,
      now,
      lastCorrectionAt: new Date(now - 13 * DAY_MS),
    });

    expect(result.status).toBe("DEFERRED");
  });

  it("is ready again 14 days after the previous correction", () => {
    const now = new Date("2026-10-20T00:00:00Z");

    const result = checkPhCorrection({
      ...limeInput,
      now,
      lastCorrectionAt: new Date(now - 14 * DAY_MS),
    });

    expect(result.status).toBe("READY");
  });

  it("asks for confirmation at the lower probe limit of pH 3.5", () => {
    const result = checkPhCorrection({ ...limeInput, ph: 3.5 });

    expect(result.status).toBe("NEEDS_CONFIRMATION");
  });

  it("asks for confirmation at the upper probe limit of pH 8.0", () => {
    const result = checkPhCorrection({
      ...sulfurInput,
      ph: 8.0,
      maxPh: 7.5,
    });

    expect(result.status).toBe("NEEDS_CONFIRMATION");
  });

  it("reports no correction when the pH action is NONE", () => {
    const result = checkPhCorrection({ ...limeInput, phAction: "NONE" });

    expect(result.status).toBe("NONE");
  });
});
