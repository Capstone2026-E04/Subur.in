"use strict";

const { runInference } = require("../../../ai/core/engine");
const { RULE_BASE, CATEGORIES } = require("../../../ai/core/rules");
const { PLANTS } = require("./fixtures");

const firedCategories = (plant, ph, nmi) =>
  Object.fromEntries(
    runInference(ph, nmi, PLANTS[plant]).activeRules.map((rule) => [
      rule.category,
      rule.alpha,
    ]),
  );

describe("runInference rule activation (C501 Step 5)", () => {
  it("fires only C5 at full strength for bayam at pH 5.3 and NMI 50 (example 6.1)", () => {
    const result = firedCategories("bayam", 5.3, 50);

    expect(result).toEqual({ C5: 1 });
  });

  it("fires only C1 at full strength for pakcoy at pH 6.8 and NMI 80 (example 6.2)", () => {
    const result = firedCategories("pakcoy", 6.8, 80);

    expect(result).toEqual({ C1: 1 });
  });

  it("fires R1, R2, R4 and R5 at 0.5 for bayam at pH 5.75 and NMI 70 (example 6.4)", () => {
    const { activeRules } = runInference(5.75, 70, PLANTS.bayam);

    expect(activeRules.map((r) => [r.ruleId, r.category, r.alpha])).toEqual([
      ["R1", "C5", 0.5],
      ["R2", "C4", 0.5],
      ["R4", "C2", 0.5],
      ["R5", "C1", 0.5],
    ]);
  });

  it("fires C4 and C6 at 0.5 for bayam at pH 5.3 and NMI 92.5 (example 6.5)", () => {
    const result = firedCategories("bayam", 5.3, 92.5);

    expect(result).toEqual({ C4: 0.5, C6: 0.5 });
  });
});

describe("runInference final category (C501 Step 6-7)", () => {
  it.each([
    ["selada at pH 5.4 and NMI 50", "selada", 5.4, 50, "C5"],
    ["bayam at pH 7.6 and NMI 50", "bayam", 7.6, 50, "C8"],
    ["bayam at pH 5.75 and NMI 70 (tie break)", "bayam", 5.75, 70, "C1"],
    ["bayam at pH 5.3 and NMI 92.5", "bayam", 5.3, 92.5, "C6"],
    ["pakcoy at pH 6.8 and NMI 80", "pakcoy", 6.8, 80, "C1"],
  ])("resolves %s to %s", (_label, plant, ph, nmi, expected) => {
    const result = runInference(ph, nmi, PLANTS[plant]);

    expect(result.categoryCode).toBe(expected);
  });

  it("resolves a full tie to NONE for water and NONE for pH (bayam at pH 5.75 and NMI 70)", () => {
    const result = runInference(5.75, 70, PLANTS.bayam);

    expect([result.waterAction, result.phAction]).toEqual(["NONE", "NONE"]);
  });
});

describe("rule base consistency (C501 Step 5 section 7)", () => {
  it("defines exactly nine rules", () => {
    expect(RULE_BASE).toHaveLength(9);
  });

  it("uses each antecedent pair only once", () => {
    const pairs = new Set(RULE_BASE.map((r) => `${r.phSet}|${r.moistureSet}`));

    expect(pairs.size).toBe(9);
  });

  it("represents every category from C1 to C9", () => {
    const categories = new Set(RULE_BASE.map((r) => r.category));

    expect(categories).toEqual(new Set(Object.keys(CATEGORIES)));
  });

  it("fires a rule of at least 0.5 strength for every pH and NMI pair", () => {
    for (const plant of Object.values(PLANTS)) {
      for (let ph = 0; ph <= 14; ph += 0.25) {
        for (let nmi = 0; nmi <= 100; nmi += 2.5) {
          const { activeRules } = runInference(ph, nmi, plant);

          expect(
            Math.max(...activeRules.map((r) => r.alpha)),
          ).toBeGreaterThanOrEqual(0.5);
        }
      }
    }
  });

  it("resolves every pH and NMI pair to a category between C1 and C9", () => {
    for (const plant of Object.values(PLANTS)) {
      for (let ph = 0; ph <= 14; ph += 0.25) {
        for (let nmi = 0; nmi <= 100; nmi += 2.5) {
          const { categoryCode } = runInference(ph, nmi, plant);

          expect(categoryCode).toMatch(/^C[1-9]$/);
        }
      }
    }
  });
});
