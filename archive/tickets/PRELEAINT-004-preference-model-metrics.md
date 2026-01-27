# PRELEAINT-004: Preference model evaluation metrics

## Context
The preference learning spec calls for basic evaluation of the preference model (accuracy and calibration), but no helper exists to compute these metrics from comparison samples.

## Assumptions
- Preference comparison samples follow the `PreferenceFeedbackComparison` shape in `src/evaluation-analytics/types.ts`.
- Preference model scoring uses a linear score (dot product plus bias) with a sigmoid; comparison win probability uses the sigmoid of the linear score delta (A minus B).
- Tie preferences are treated as non-wins for accuracy and counted as zero-outcome in calibration buckets (so they do not count as correct).

## Scope
- Add a small evaluation helper in evaluation analytics that:
  - Accepts a preference model state and a set of comparison samples.
  - Computes simple accuracy (predict winner based on score delta) and calibration buckets (0.1 bins over A-win probability).
  - Returns a metrics object suitable for logging or diagnostics.
- Add type definitions and exports for the helper.
- Add tests for deterministic accuracy and calibration outputs.

## File list
- src/evaluation-analytics/preference-metrics.js (new)
- src/evaluation-analytics/preference-metrics.d.ts (new)
- src/evaluation-analytics/index.ts
- src/evaluation-analytics/types.ts
- test/evaluation-analytics/preference-metrics.test.mjs
- test/evaluation-analytics/types.test.ts

## Out of scope
- No changes to preference model training/update logic.
- No changes to persistence formats.
- No active learning selection changes.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/evaluation-analytics/preference-metrics.test.mjs`
- `npm test`

### Invariants that must remain true
- Helper does not mutate input samples or model state.
- Calibration output includes empty buckets with zero counts (no missing bins).
- Accuracy treats ties as non-wins (do not count as correct).

## Status
Completed (2026-01-27)

## Outcome
- Added `computePreferenceMetrics` helper with accuracy and calibration buckets using A-win probability.
- Added preference metrics types and exports; updated type coverage test.
- Added deterministic preference metrics test; no changes to preference training, persistence, or selection logic.
