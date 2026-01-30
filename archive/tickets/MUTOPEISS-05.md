# MUTOPEISS-05: Operator telemetry data structure and accumulator

**Status**: Completed
**Priority**: High
**Depends on**: None
**Blocks**: MUTOPEISS-06

## Summary

Pure data module for per-operator counters: `attempts`, `validOffspring`, `acceptedOffspring`, `gridContributions` (with `filledEmpty` / `improvedElite` sub-counts). Functions: `createTelemetry(operatorNames)`, `recordAttempt(telemetry, operatorName)`, `recordOutcome(telemetry, operatorName, outcome)`, `mergeTelemetry(a, b)`, `serializeTelemetry(telemetry)`.

## Files to Touch

- New: `src/evolution-runner/operator-telemetry.js`
- New: `src/evolution-runner/operator-telemetry.d.ts`
- `src/evolution-runner/index.ts` — export telemetry helpers

## Out of Scope

- Wiring into runner
- Persistence to disk
- MAP-Elites changes
- Selector logic

## Acceptance Criteria

- New test: `test/unit/evolution-runner/operator-telemetry.test.mjs`
  - `createTelemetry` initializes all counters to 0 for each operator
  - `recordAttempt` increments `attempts` by 1
  - `recordOutcome` with `{ valid: true, accepted: true, gridContribution: "filledEmpty" }` increments correct counters
  - `mergeTelemetry` sums counters from two telemetry objects
  - `serializeTelemetry` returns plain JSON-serializable object
  - **Invariant**: `0 <= validOffspring <= attempts`
  - **Invariant**: `0 <= acceptedOffspring <= validOffspring`
- Unknown operator name in `recordAttempt` → throws

## Outcome

- Added operator telemetry data module with counters, merge, and serialization helpers.
- Added unit tests for counters, invariants, merges, and unknown operator handling.
