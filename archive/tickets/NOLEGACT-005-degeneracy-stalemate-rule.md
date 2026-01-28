# NOLEGACT-005: Update degeneracy stalemate classification

## Goal
Adjust degeneracy logic so stalemate is only flagged when the terminal outcome is a draw-for-all, even if the termination reason is `stalemate` or `no-legal-actions`.

## Assumptions
- Trajectory summaries expose `terminationReason` with values that can include `stalemate` and `no-legal-actions`.
- Trajectory summaries include `terminalOutcome.outcomes` with per-player results, which can be used to detect draw-for-all.
- Current degeneracy logic flags `stalemate` purely on `terminationReason` without checking outcomes.

## Scope
- Update degeneracy flag logic to consider terminal outcome when counting stalemates.
- Treat `no-legal-actions` as a stalemate candidate only when the terminal outcome is a draw-for-all.
- Add or update tests to cover draw vs non-draw termination outcomes.

## File list
- `src/evaluation-analytics/degeneracy.js`
- `test/unit/evaluation-analytics/degeneracy.test.mjs`

## Out of scope
- Simulation engine loop changes.
- DSL schema/type changes.
- E2E fixture updates or doc updates.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/unit/evaluation-analytics/degeneracy.test.mjs`
- `npm run test:unit`

### Invariants that must remain true
- Loop, max-turns, forced-move, and non-terminating degeneracy flags behave as before.
- Stalemate flag only applies when the terminal outcome is a draw for all players and the termination reason is `stalemate` or `no-legal-actions`.

## Outcome
- Updated stalemate degeneracy detection to require draw-for-all and to include `no-legal-actions` only when draw.
- Added unit coverage for draw-vs-non-draw stalemate classification.

## Status
Completed on 2026-01-28.
