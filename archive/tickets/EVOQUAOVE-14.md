# EVOQUAOVE-14: Runner halts on high rejection rates

**Status:** ✅ Completed
**Spec ref:** EQ-15
**Phase:** 4 — Observability and adaptive control
**Depends on:** EVOQUAOVE-13 (EQ-14 — categorized rejection tracking)

## Problem

The runner does not monitor rejection rates. If 90% of the population is rejected in a generation, the run continues with a tiny surviving population that has no diversity, wasting compute on a doomed population.

## Fix

After each generation in `runEvolutionRunner()`, compute:
```
rejectionRate = rejected.length / (evaluated.length + rejected.length)
```
(`evaluated.length + rejected.length` equals the input population size.)

Track consecutive high-rejection generations. If `rejectionRate > 0.8` for 3 consecutive generations, halt the run with a diagnostic message identifying the dominant rejection reason (from EVOQUAOVE-13 categorization).

The threshold (`0.8`) and consecutive count (`3`) should be configurable via the runner config, with sensible defaults. When not provided, defaults are `rejectionRateThreshold: 0.8` and `maxConsecutiveRejections: 3`.

## Files to touch

- `src/evolution-runner/runner.js` — add rejection rate monitoring and early stopping logic in the generation loop
- `schemas/evolution-runner/runner-config.schema.json` — add optional `rejectionRateThreshold` and `maxConsecutiveRejections` properties to `RunnerLoopConfig`

## Assumptions reassessed

- The engine (`engine.js`) already categorizes rejections with a `reason` field (implemented in EVOQUAOVE-13). Each rejected entry has `{ genome, reason, diagnostics }`. Confirmed correct.
- `loopResult.rejected` is an array of `{ genome, reason, diagnostics }` objects. The `reason` field is a string like `"repair-failure"`, `"validation-failure"`, `"safety-failure"`, `"evaluation-error"`, or `"evaluation-null"`. Confirmed correct.
- The runner config (`config.runner`) is validated via `RunnerLoopConfig` schema definition in `schemas/evolution-runner/runner-config.schema.json`. That schema has `additionalProperties: false`, so new properties must be added to it.
- The halt is a graceful stop: the current generation's artifacts are already written before the halt check executes (the check happens after `writeGenerationArtifacts` and after pushing to `results`).
- The return value includes a `haltedReason` field when early stopping occurs, so callers can distinguish a halted run from a completed one.

## Out of scope

- Do NOT change `engine.js` (rejection categorization is EVOQUAOVE-13)
- Do NOT change the evaluator
- Do NOT change the evolution operators or repair pipeline
- Do NOT add health metrics persistence (that's EVOQUAOVE-15)

## Acceptance criteria

### Tests that must pass

1. **New unit tests** in `test/unit/evolution-runner/runner.test.mjs`:
   - Runner halts when rejection rate > 0.8 for 3 consecutive generations
   - Runner continues if rejection rate drops below threshold within the window
   - Runner continues normally when rejection rate is below threshold
   - Halt message includes the dominant rejection reason

2. All existing tests:
   - `npm run test:unit` passes

### Invariants

- The runner always completes the current generation before checking the halt condition
- The halt produces a clear diagnostic log entry with: rejection rate, dominant reason, generation number
- Normal runs (low rejection) are completely unaffected
- The halt is a graceful stop (writes final artifacts before exiting)

## Outcome

### What was changed vs originally planned

**Originally planned:** Add rejection rate monitoring to `runner.js` only.

**Actually changed:**
1. `src/evolution-runner/runner.js` — Added rejection rate tracking with configurable `rejectionRateThreshold` (default 0.8) and `maxConsecutiveRejections` (default 3). After each generation's artifacts are written, computes rejection rate and tracks consecutive high-rejection generations. On halt, returns a `haltedReason` object with `generation`, `rejectionRate`, `consecutiveHighRejections`, and `dominantReason`.
2. `schemas/evolution-runner/runner-config.schema.json` — Added optional `rejectionRateThreshold` (number, 0–1) and `maxConsecutiveRejections` (integer, min 1) to `RunnerLoopConfig`. This was not listed in the original ticket but was necessary because the schema uses `additionalProperties: false`.
3. `test/unit/evolution-runner/runner.test.mjs` — Added 4 new unit tests covering halt trigger, recovery (counter reset), normal operation, and dominant reason identification.

**Ticket corrections applied before implementation:**
- Added `schemas/evolution-runner/runner-config.schema.json` to "Files to touch" (schema update required).
- Added "Assumptions reassessed" section documenting the verified engine rejection structure from EVOQUAOVE-13.
- Clarified that `haltedReason` is included in the return value for caller distinction.
