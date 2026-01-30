# ADAOPEWEIISS-01: Expand operator telemetry counters

## What

Add richer outcome counters to `createOperatorCounters()` in `src/evolution-runner/operator-telemetry.js` so that operator productivity can be measured accurately. The current counters (`attempts`, `validOffspring`, `acceptedOffspring`, plus `gridContributions: { filledEmpty, improvedElite }`) are insufficient — they conflate fallback/no-op evaluations with genuine operator success.

Add these new cumulative counters per operator:
- `noOp` — operator was invoked but made no change (structural guard, missing prerequisites)
- `repairFailed` — operator produced a mutated genome but repair returned `null`
- `rejected` — object with sub-reason keys: `validationFailure`, `safetyFailure`, `evaluationError`, `evaluationNull`
- `evaluated` — mutated genomes actually sent to evaluation (post-repair)
- `validEvaluated` — evaluated mutated genomes that produced valid `{ fitness, descriptors }`

Add recording functions:
- `recordNoOp(operatorName)`
- `recordRepairFailed(operatorName)`
- `recordRejection(operatorName, reason)` — reason is one of the `rejected` sub-keys
- `recordEvaluated(operatorName)`
- `recordValidEvaluated(operatorName)`

Update `mergeTelemetry()` to merge the new counters correctly (summing scalars, merging `rejected` sub-keys).

This ticket adds only the data structure and recording API. No callers change yet.

## Files to touch

- `src/evolution-runner/operator-telemetry.js` — extend `createOperatorCounters()`, add recording functions, update `mergeTelemetry()`
- `test/unit/evolution-runner/operator-telemetry-counters.test.mjs` (new) — unit tests for new counters and merge logic (note: existing tests in `operator-telemetry.test.mjs` cover original counters)

## Out of scope

- `evolution-applicator.js` — no caller changes
- `runner.js` — no caller changes
- `health-metrics.js` — separate ticket (ADAOPEWEIISS-06)
- `operator-selector.js` — separate ticket (ADAOPEWEIISS-05)

## Acceptance criteria

- Test: Each new counter initializes to `0` (or `{}` for `rejected`)
- Test: Each `record*()` function increments the correct counter
- Test: `recordRejection()` increments the correct sub-key within `rejected`
- Test: `mergeTelemetry()` sums new counters across two telemetry objects correctly
- Invariant: Existing counters (`attempts`, `validOffspring`, `acceptedOffspring`) remain unchanged and backward-compatible
- Invariant: `npm run test:unit` passes
- Invariant: `tsc -p tsconfig.json` passes with no new errors

## Dependencies

None

## Status

**COMPLETED**

## Outcome

**What changed vs originally planned:**

The implementation matched the ticket spec exactly. One minor assumption was corrected: the ticket originally listed only `attempts`, `validOffspring`, `acceptedOffspring` as existing counters, but `gridContributions: { filledEmpty, improvedElite }` also existed. This was noted but required no scope change.

**Changes made:**
- `src/evolution-runner/operator-telemetry.js`: Added 5 new scalar counters (`noOp`, `repairFailed`, `evaluated`, `validEvaluated`) and 1 nested object counter (`rejected` with 4 sub-keys) to `createOperatorCounters()`. Added 5 new recording functions (`recordNoOp`, `recordRepairFailed`, `recordRejection`, `recordEvaluated`, `recordValidEvaluated`). Updated `mergeTelemetry()` to sum all new counters including `rejected` sub-keys. Added `REJECTED_REASONS` set for validation.
- `test/unit/evolution-runner/operator-telemetry-counters.test.mjs` (new): 21 tests covering initialization, recording, rejection validation, and merge logic for all new counters.

**Verification:** 1205/1205 unit tests pass. `tsc` clean.
