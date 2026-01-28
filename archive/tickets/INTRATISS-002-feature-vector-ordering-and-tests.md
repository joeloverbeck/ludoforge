# INTRATISS-002: Update feature vector ordering for new metrics

## Context
Default feature vector ordering currently includes `interaction_rate` in the old sense. After the rename, ordering must include both `turn_taking_rate` and `interaction_rate` for deterministic serialization.

## Work
- Update `DEFAULT_FEATURE_ORDER` to:
  - `agency`, `strategic_depth`, `seat_imbalance`, `variety`, `pacing_tension`, `turn_taking_rate`, `interaction_rate`.
- Update feature vector unit tests to assert the new order.

## File list it expects to touch
- `src/evaluation-analytics/feature-vector.js`
- `test/unit/evaluation-analytics/feature-vector.test.mjs`

## Out of scope
- Core metric computation changes.
- Scoring/fitness default-weight behavior.
- Simulation-engine instrumentation or schemas.
- E2E tests or doc updates.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/unit/evaluation-analytics/feature-vector.test.mjs`

### Invariants that must remain true
- Feature vectors remain deterministic and stable given identical inputs.
- Degeneracy flags are still appended with the same default ordering.
- Metrics not in the default order are still appended lexicographically.

## Status
Completed (2026-01-28).

## Outcome
Updated `DEFAULT_FEATURE_ORDER` to include `turn_taking_rate` before `interaction_rate` and added an explicit unit test asserting the default ordering. This stayed within the original scope (ordering + unit tests) without touching metric computation.
