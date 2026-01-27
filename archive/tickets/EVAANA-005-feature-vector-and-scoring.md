# [EVAANA] EVAANA-005: Assemble feature vectors and composite scoring
Status: Completed (2026-01-27)

## Goal
Combine metrics and degeneracy flags into a feature vector and composite score output.

## File list (expected to touch)
- src/evaluation-analytics/feature-vector.js
- src/evaluation-analytics/feature-vector.d.ts
- src/evaluation-analytics/scoring.js
- src/evaluation-analytics/scoring.d.ts
- src/evaluation-analytics/index.ts
- test/evaluation-analytics/feature-vector.test.mjs
- test/evaluation-analytics/scoring.test.mjs

## Scope
- Build a normalized feature vector from core metrics and optional extended metrics.
  - Normalize by coercing non-finite metric values to 0.
  - Include degeneracy flags as binary features prefixed with `degeneracy.`.
  - Preserve a stable ordering: core metrics in canonical order, then additional metrics sorted by id, then degeneracy flags in canonical order.
- Compute a composite score (or multi-objective vector) using configurable weights.
  - Default weights to 1 per feature key when none are supplied.
  - Normalize weights by total absolute weight to keep scores comparable.
  - If objectives are supplied without composite weights, derive the composite score as the mean of objective scores.
- Ensure output matches the types defined in `src/evaluation-analytics/types.ts`.

## Out of scope
- No preference model learning or persistence.
- No changes to metrics or degeneracy logic.
- No UI or CLI output formatting changes.

## Acceptance criteria
### Specific tests that must pass
- `tsc -p tsconfig.json`
- `node --test test/evaluation-analytics/feature-vector.test.mjs`
- `node --test test/evaluation-analytics/scoring.test.mjs`

### Invariants that must remain true
- Feature vectors have a stable ordering and naming across runs.
- Scoring respects weight normalization rules and does not mutate inputs.
- Existing tests remain green.

## Notes
- Keep defaults conservative; allow callers to override weights per metric.
- Repository runtime modules are `.js` with matching `.d.ts` where type hints are needed.

## Outcome
- Added feature-vector and scoring modules with stable ordering, normalized metric values, and binary degeneracy flags.
- Implemented composite scoring with default weights, absolute-weight normalization, and optional objective scores.
- Added targeted tests for feature vector ordering/normalization and composite score weighting/objectives, plus exports via `src/evaluation-analytics/index.ts`.
