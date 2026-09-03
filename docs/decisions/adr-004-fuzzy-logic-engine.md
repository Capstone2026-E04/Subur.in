# ADR-004: Mamdani Fuzzy Logic for Plant Care Recommendations

## Status
Accepted

## Context
Recommending irrigation/lime/sulfur treatment from raw pH and moisture sensor readings needs to account for two variables interacting non-linearly and per-plant (each species has its own acceptable pH range and target). Fixed if/else thresholds per variable can't express combined states like "moderately acidic and moderately dry" distinctly from "very acidic and very dry," and don't scale cleanly to per-plant target ranges without a rule explosion.

## Decision
Implement a Mamdani fuzzy inference system in `src/ai`:
- **Membership functions** ([`ai/core/membership.js`](../../backend/src/ai/core/membership.js)) fuzzify pH and moisture into linguistic sets, parameterized per-plant from `Plant.minPh/maxPh/phTarget`.
- **Rule base** ([`ai/core/rules.js`](../../backend/src/ai/core/rules.js)) maps combinations of fuzzy sets to one of 9 output categories (`C1`-`C9`).
- **Inference engine** ([`ai/core/engine.js`](../../backend/src/ai/core/engine.js)) evaluates active rules, aggregates, and defuzzifies via a discretized centroid method into a continuous index, then snaps to the nearest category.
- **Interpreter** ([`ai/utils/interpreter.js`](../../backend/src/ai/utils/interpreter.js)) turns a category into a human-readable action and flags (`needsWater`, `needsLime`, `needsSulfur`, `reduceWatering`).
- **Dosage calculators** ([`ai/dosage/*`](../../backend/src/ai/dosage)) turn those flags into concrete gram/liter amounts using the polybag's physical soil volume.

## Consequences
- Rules are declarative and centralized in one file, making the recommendation logic auditable and testable independent of any web/database concern (`src/ai` has no Express/Prisma imports at its core, only the outer `services/recommendation.service.js` orchestration layer touches Prisma).
- Adding a new plant only requires new `minPh`/`maxPh`/`phTarget` seed data — no new rules or code — since membership functions are parameterized per-plant.
- The defuzzification step (`Y_MIN`/`Y_MAX`/`Y_STEP` in [`ai/config/fuzzy_parameters.js`](../../backend/src/ai/config/fuzzy_parameters.js)) is a numeric approximation (discretized centroid), not a closed-form integral — tightening `Y_STEP` trades inference latency for precision; the current step size was chosen empirically and isn't performance-critical given request volume.
- `POST /api/recommendations/simulate` exists specifically so this engine can be exercised and validated with arbitrary inputs without a real device or saved history, which the unit tests in `ai/__tests__` also lean on.
