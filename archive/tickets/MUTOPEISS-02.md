# MUTOPEISS-02: Weighted random sampling utility

**Status**: Completed
**Priority**: High
**Depends on**: None
**Blocks**: MUTOPEISS-03

## Summary

Pure function `weightedSelect(names, weights, rng)` that picks a name proportional to its weight. Seeded-RNG-compatible, deterministic.

## Files to Touch

- New: `src/evolutionary-engine/mutation/weighted-selection.js`

## Out of Scope

- Wiring into orchestrator
- Operator-config changes
- Telemetry

## Acceptance Criteria

- New test: `test/unit/evolutionary-engine/weighted-selection.test.mjs`
  - Given fixed seed + names + weights → first N picks match a snapshot sequence (determinism)
  - Weight-10 operator appears ~10x more than weight-1 in large sample (seeded deterministic snapshot)
  - Empty names array → throws
  - Mismatched names/weights lengths → throws
- Single operator → always returns that operator

## Outcome

- Added `weightedSelect(names, weights, rng)` utility with validation and deterministic sampling.
- Added unit tests covering determinism, weight dominance, and input validation.
