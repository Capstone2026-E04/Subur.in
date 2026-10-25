"use strict";

const { checkPhCorrection } = require("../../../ai/core/safety_gate");


const limeInput = {
  phAction: "LIME",
  waterAction: "IRRIGATE",
  ph: 5.4,
  consistentReadings: 2,
};

const sulfurInput = { ...limeInput, phAction: "SULFUR", ph: 7.6 };

describe("checkPhCorrection (C501 Step 11 section 4)", () => {
  it("is ready for lime and sulfur once the fuzzy action fires", () => {
    expect(checkPhCorrection(limeInput).status).toBe("READY");
    expect(checkPhCorrection(sulfurInput).status).toBe("READY");
  });

  it("defers the correction while the media is wet", () => {
    const result = checkPhCorrection({ ...limeInput, waterAction: "STOP" });

    expect(result.status).toBe("DEFERRED");
  });

  it("defers the correction with fewer than two consistent readings", () => {
    const result = checkPhCorrection({ ...limeInput, consistentReadings: 1 });

    expect(result.status).toBe("DEFERRED");
  });

  it("asks for confirmation at the lower probe limit of pH 3.5", () => {
    const result = checkPhCorrection({ ...limeInput, ph: 3.5 });

    expect(result.status).toBe("NEEDS_CONFIRMATION");
  });

  it("asks for confirmation at the upper probe limit of pH 8.0", () => {
    const result = checkPhCorrection({
      ...sulfurInput,
      ph: 8.0,
    });

    expect(result.status).toBe("NEEDS_CONFIRMATION");
  });

  it("reports no correction when the pH action is NONE", () => {
    const result = checkPhCorrection({ ...limeInput, phAction: "NONE" });

    expect(result.status).toBe("NONE");
  });
});
