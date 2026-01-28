# EXTMETREF-002: Extract decision-quality sampling utilities

## Status
Completed (2026-01-28)

## Goal
Isolate decision-quality sampling and rollout helpers into `decision-quality/sampling-utils.js` while preserving all behavior and seeds.

## Assumptions (revalidated)
- Decision-quality helpers currently live in `src/evaluation-analytics/metrics/extended.js`.
- `computeMeaningfulChoice` and `computeComebackPotential` remain in `extended.js` for this ticket.
- Existing unit tests in `test/unit/evaluation-analytics/meaningful-choice.test.mjs` and
  `test/unit/evaluation-analytics/comeback-potential.test.mjs` cover the refactor surface.

## Tasks
- Create `src/evaluation-analytics/metrics/extended/decision-quality/` directory.
- Move sampling utilities into `sampling-utils.js` with identical signatures:
  - `normalizePositiveInt`, `normalizePercent`, `normalizeSeed`, `buildSeed`
  - `cloneState`, `resolveRolloutAgent`, `createForcedActionAgent`
  - `resolveTerminalState`, `resolveOutcomeValue`, `deriveDecisionPoint`, `sampleDecisionPoints`
- Update `extended.js` to import and use `sampling-utils.js` for decision-quality computations.
- Ensure seed normalization and determinism are preserved.

## File list (expected to touch)
- src/evaluation-analytics/metrics/extended.js
- src/evaluation-analytics/metrics/extended/decision-quality/sampling-utils.js

## Out of scope
- Moving `computeMeaningfulChoice` or `computeComebackPotential` into their own files.
- Refactoring aggregation or other metric families.
- Adding or changing tests unless required to preserve or assert existing behavior.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`

### Invariants that must remain true
- Seed normalization and selection results match current behavior.
- Deterministic metrics remain deterministic for identical inputs.
- No changes to decision-quality option defaults.

## Outcome
- Extracted decision-quality sampling helpers into `src/evaluation-analytics/metrics/extended/decision-quality/sampling-utils.js`
  and updated `extended.js` to import them; behavior unchanged.
- No test changes were needed because existing unit tests already covered the refactor surface.
