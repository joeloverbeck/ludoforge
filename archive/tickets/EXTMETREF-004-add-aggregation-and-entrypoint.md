# EXTMETREF-004: Add aggregation module and entrypoint re-export

## Status
Completed (2026-01-28)

## Goal
Introduce `aggregation.js` and `index.js` for the extended metrics module, then make `extended.js` a thin re-export while keeping public API stable.

## Updated assumptions (current repo state)
- `src/evaluation-analytics/metrics/extended.js` already delegates most metric logic to files under `src/evaluation-analytics/metrics/extended/`.
- The extended metrics split (math/length/outcome/coverage/decision-quality) already exists.
- Integration tests for extended metrics already exist under `test/integration/`.
- `computeBalanceSkew` is declared in types and re-exported from `src/evaluation-analytics/index.ts`, but there is no JS implementation; addressing that mismatch is out of scope for this ticket.

## Tasks
- Create `src/evaluation-analytics/metrics/extended/aggregation.js` containing `computeExtendedMetrics` and option gating logic only.
- Create `src/evaluation-analytics/metrics/extended/index.js` that re-exports the same named functions currently exported from `metrics/extended.js`.
- Replace `src/evaluation-analytics/metrics/extended.js` with a thin re-export wrapper to `extended/index.js` (keep import path stable).
- Update `src/evaluation-analytics/metrics/extended.d.ts` to mirror the re-exported API without changing types.
- Ensure module boundaries avoid new import cycles.

## File list (expected to touch)
- src/evaluation-analytics/metrics/extended.js
- src/evaluation-analytics/metrics/extended/index.js
- src/evaluation-analytics/metrics/extended/aggregation.js
- src/evaluation-analytics/metrics/extended.d.ts

## Out of scope
- Any behavior or output changes to metric computations.
- Adding or changing tests unless required to capture a regression introduced by this ticket.
- Changes to `src/evaluation-analytics/index.ts` exports.
- Resolving the `computeBalanceSkew` type/runtime mismatch.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`

### Invariants that must remain true
- Existing import paths to `metrics/extended.js` continue to work.
- Public exports and metric IDs remain identical.
- `computeExtendedMetrics` performs no metric logic beyond assembling results and gating options.

## Outcome
- Added `src/evaluation-analytics/metrics/extended/aggregation.js` and `src/evaluation-analytics/metrics/extended/index.js`,
  and converted `src/evaluation-analytics/metrics/extended.js` to a thin re-export wrapper as planned.
- No test changes were needed because the refactor preserved behavior.
- Left the pre-existing `computeBalanceSkew` type/runtime mismatch untouched as documented in scope.
