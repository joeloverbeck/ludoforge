# INTRATISS-003: Prevent default scoring drift from new interaction_rate

## Status
Completed (2026-01-28)

## Context
Adding a new core metric changes default composite scoring because `defaultWeight = 1` is applied to every feature. The new `interaction_rate` must be opt-in (or excluded from default scoring) to avoid silent behavioral drift.

Reassessment notes:
- Composite scoring is created in `src/evaluation-analytics/fitness.js` via `computeCompositeScore`; the preference evaluator only forwards options.
- Objective scoring already defaults missing weights to 0, so the opt-in gap is the `defaultWeight` path when no explicit weights/objectives are supplied.

## Work
- Add support for per-feature default weights in composite scoring (e.g., `defaultWeights` map that overrides `defaultWeight`).
- Wire the evolution/evaluation pipeline to set a default weight of `0` for `interaction_rate` unless explicitly provided in weights/objectives.
- Ensure existing behavior for other metrics is unchanged when no explicit weights/objectives are supplied.

## File list it expects to touch
- `src/evaluation-analytics/scoring.js`
- `src/evaluation-analytics/scoring.d.ts`
- `src/evaluation-analytics/fitness.js` (or the closest caller that passes `compositeScoreOptions`)

## Out of scope
- Metric computation changes.
- Feature vector ordering changes.
- Engine instrumentation or schema updates.
- Unit or E2E tests beyond those needed to validate the scoring default.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/unit/evaluation-analytics/scoring.test.mjs`
- Any new/updated unit test added to cover the default-weight override behavior.

### Invariants that must remain true
- If explicit `weights` or `objectives` are provided, they fully control scoring.
- When no explicit weights/objectives are provided, existing composite scores for pre-existing metrics remain unchanged.
- `interaction_rate` contributes `0` to the composite score unless explicitly weighted.

## Outcome
- Added `defaultWeights` support in composite scoring and applied an interaction-rate default of `0` in the fitness pipeline.
- Updated composite scoring tests to cover per-feature defaults and omission behavior (no changes to objective scoring).
