# EXTMETREF-001: Extract math, length, outcome, and coverage modules

## Goal
Create focused modules for pure math and the non-decision metrics (length, outcome variance, coverage) and update `extended.js` to use them without changing behavior.

## Assumptions & scope updates
- `src/evaluation-analytics/metrics/extended.js` currently contains decision-quality metrics and aggregation logic; this ticket only extracts math/length/outcome/coverage helpers and keeps decision-quality logic in `extended.js`.
- The refactor spec requires integration coverage for refactored metrics; add a focused integration test for the extracted modules.
- `extended.js` remains the public entry point for exports in this step (no `index.js` swap yet).

## Tasks
- Add `src/evaluation-analytics/metrics/extended/` directory.
- Move `safeNumber`, `average`, and `computePearsonCorrelation` into `math-utils.js` with identical signatures and behavior.
- Move length metrics (`computeLengthMean`, `computeLengthVariance`, `computeEarlyTerminationRate`) into `length-metrics.js`.
- Move outcome variance helpers (`outcomeToScore`, `computeOutcomeVariance`) into `outcome-metrics.js`.
- Move coverage metrics (`computeCoverageActions`, `computeCoverageState`) into `coverage-metrics.js`.
- Update `src/evaluation-analytics/metrics/extended.js` to import the new modules and re-export the same public API.
- Add `test/integration/extended-metrics.test.mjs` to exercise extracted metrics via the simulation/log-adapter path.
- Keep all metric IDs, options defaults, and outputs unchanged.

## File list (expected to touch)
- src/evaluation-analytics/metrics/extended.js
- src/evaluation-analytics/metrics/extended/math-utils.js
- src/evaluation-analytics/metrics/extended/length-metrics.js
- src/evaluation-analytics/metrics/extended/outcome-metrics.js
- src/evaluation-analytics/metrics/extended/coverage-metrics.js
- test/integration/extended-metrics.test.mjs

## Out of scope
- Any decision-quality logic (`meaningfulChoice`, `comebackPotential`) changes or moves.
- Refactoring aggregation/option gating logic beyond the imports needed for extraction.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`
- `node --test test/integration/extended-metrics.test.mjs`

## Status
Completed on 2026-01-28.

## Outcome
- Extracted math, length, outcome variance, and coverage helpers into `src/evaluation-analytics/metrics/extended/` and updated `extended.js` imports/exports as planned.
- Added an integration test to exercise the extracted metrics via the simulation log adapter.
- Left decision-quality logic and aggregation structure in `extended.js` for later refactor stages.

### Invariants that must remain true
- All public exports from `src/evaluation-analytics/metrics/extended.js` remain identical.
- Metric IDs and outputs are unchanged for identical inputs.
- No new dependencies are introduced for `math-utils.js`.
