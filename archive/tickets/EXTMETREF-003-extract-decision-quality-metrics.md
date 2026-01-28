# EXTMETREF-003: Extract decision-quality metric modules

## Status
Completed (2026-01-28)

## Goal
Move `computeMeaningfulChoice` and `computeComebackPotential` into dedicated modules under `decision-quality/` and keep behavior unchanged.

## Current state & assumptions
- `extended.js` already imports decision-quality helpers from `decision-quality/sampling-utils.js`.
- `computeMeaningfulChoice` and `computeComebackPotential` still live in `extended.js` and need extraction.
- Integration coverage exists for core extended metrics, but decision-quality metrics lack integration coverage.

## Tasks
- Create `decision-quality/meaningful-choice.js` and `decision-quality/comeback-potential.js`.
- Move the corresponding functions out of `extended.js` into those files.
- Update imports so these modules use `sampling-utils.js` and `math-utils.js` where needed.
- Ensure `extended.js` re-exports the same named functions.
- Add an integration test covering decision-quality metrics via `computeExtendedMetrics`.

## File list (expected to touch)
- src/evaluation-analytics/metrics/extended.js
- src/evaluation-analytics/metrics/extended/decision-quality/meaningful-choice.js
- src/evaluation-analytics/metrics/extended/decision-quality/comeback-potential.js
- src/evaluation-analytics/metrics/extended/decision-quality/sampling-utils.js
- src/evaluation-analytics/metrics/extended/math-utils.js
- test/integration/decision-quality-metrics.test.mjs

## Out of scope
- Changing aggregation behavior or options gating.
- Any edits to coverage/length/outcome metrics.
- Changing public exports or metric IDs.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`
- `node --test test/integration/decision-quality-metrics.test.mjs`

### Invariants that must remain true
- `meaningfulChoice` and `comebackPotential` outputs match current results for identical inputs.
- Public API of `extended.js` remains unchanged.
- Pearson correlation behavior is unchanged.

## Outcome
- Moved `computeMeaningfulChoice` and `computeComebackPotential` into
  `src/evaluation-analytics/metrics/extended/decision-quality/` modules and re-exported them from
  `src/evaluation-analytics/metrics/extended.js` as planned.
- Added `test/integration/decision-quality-metrics.test.mjs` to cover decision-quality metrics
  through `computeExtendedMetrics`, matching the refactor test requirements in the spec.
