# PRELEA-004: Active learning pair selection

## Context
Active learning should prioritize uncertain comparisons while maintaining diversity across niches.

## Assumptions (reassessed)
- There is currently no active-learning selector module in `src/evaluation-analytics/`.
- There are no existing tests covering active-learning selection.
- Pairwise uncertainty must be derived from preference model weights/bias (no existing helper for pairwise win probability).

## Scope
- Implement a selector that chooses candidate pairs given feature vectors and preference model state.
- Use uncertainty sampling (predicted win probability near 0.5) plus a diversity heuristic that includes underrepresented niches.
- Add configuration options for max pairs, uncertainty threshold, diversity quota, cadence, and iteration.
- Add types and exports for active-learning selection.
- Add tests for deterministic selection, uncertainty ranking, and diversity inclusion.

## File list
- src/evaluation-analytics/active-learning.js
- src/evaluation-analytics/active-learning.d.ts
- src/evaluation-analytics/types.ts
- src/evaluation-analytics/index.ts
- test/evaluation-analytics/active-learning.test.mjs

## Out of scope
- No UI workflows for requesting comparisons.
- No persistence of active-learning queries.
- No changes to preference model training logic.

## Acceptance criteria
### Specific tests that must pass
- `npm test`
- `node --test test/evaluation-analytics/active-learning.test.mjs`

### Invariants that must remain true
- Selector never mutates input arrays or feature vectors.
- When configuration is unchanged, selection results are stable across runs.
- Uncertainty sampling does not exclude all underrepresented niches.

## Status
Completed (2026-01-27)

## Outcome
- Implemented the active-learning selector with uncertainty ranking, diversity quota, and cadence gating.
- Added evaluation-analytics types/exports and coverage for deterministic selection, uncertainty ordering, and diversity inclusion.
