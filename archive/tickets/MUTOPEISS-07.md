# MUTOPEISS-07: Architecture doc updates

**Status**: Completed
**Priority**: Medium
**Depends on**: MUTOPEISS-06
**Blocks**: None

## Summary

Update architecture docs to document weighted selection, operator telemetry, and the OperatorSelector abstraction.

## Files to Touch

- `docs/architecture/evolutionary-engine.md` — document weighted selection, OperatorSelector interface, WeightedSelector
- `docs/architecture/evolution-runner.md` — document telemetry tracking, `operator-stats.json` artifact, resume behavior
- `docs/architecture/pipeline-overview.md` — mention operator selection is weighted (not uniform)

## Out of Scope

- Code changes
- Test changes
- Bandit documentation

## Acceptance Criteria

- Docs accurately describe:
  - Weighted selection using config weights
  - Telemetry counters and their meanings
  - `operator-stats.json` artifact location and schema
  - OperatorSelector plug point for future bandits
- No stale references to "uniform random" selection remain in architecture docs

## Outcome

- Updated architecture docs to describe weighted selection, OperatorSelector/WeightedSelector, telemetry counters, and `operator-stats.json`.
